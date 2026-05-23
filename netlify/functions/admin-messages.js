const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, updateById } = require('../lib/sheets');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Mensajes');
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return ok(rows);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, respuesta } = body;
      if (!id) return fail('ID requerido');
      const done = await updateById('Mensajes', id, {
        respuesta: respuesta || '',
        estado: 'respondido',
        respondido_at: new Date().toISOString(),
      });
      return done ? ok({ success: true }) : fail('Mensaje no encontrado', 404);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
