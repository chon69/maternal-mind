const crypto = require('crypto');
const { requireAuth, ok, fail, preflight } = require('../lib/auth');
const { getAll, append } = require('../lib/sheets');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  let user;
  try { user = requireAuth(event); }
  catch (e) { return fail(e.message, e.status || 401); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Mensajes');
      const mine = rows
        .filter(r => r.cliente_id === user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return ok(mine);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { asunto, contenido } = body;
      if (!contenido?.trim()) return fail('El contenido es obligatorio');
      await append('Mensajes', {
        id: crypto.randomUUID(),
        cliente_id: user.id,
        cliente_nombre: user.nombre,
        cliente_email: user.email,
        asunto: asunto?.trim() || 'Consulta',
        contenido: contenido.trim(),
        respuesta: '',
        estado: 'pendiente',
        created_at: new Date().toISOString(),
        respondido_at: '',
      });
      return ok({ success: true }, 201);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
