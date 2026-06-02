const crypto = require('crypto');
const { requireAuth, ok, fail, preflight } = require('../lib/auth');
const { getAll, append } = require('../lib/db');

const CATEGORIAS = ['general', 'eventos', 'practicas'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  let user;
  try { user = requireAuth(event); }
  catch (e) { return fail(e.message, e.status || 401); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Comunidad');
      const active = rows
        .filter(r => r.activo !== 'FALSE')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return ok(active);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { categoria, contenido } = body;
      if (!contenido?.trim()) return fail('El contenido es obligatorio');
      await append('Comunidad', {
        id: crypto.randomUUID(),
        autor_id: user.id,
        autor_nombre: user.nombre,
        categoria: CATEGORIAS.includes(categoria) ? categoria : 'general',
        contenido: contenido.trim(),
        activo: 'TRUE',
        created_at: new Date().toISOString(),
      });
      return ok({ success: true }, 201);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
