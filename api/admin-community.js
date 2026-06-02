const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, updateById, deleteById } = require('../lib/db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Comunidad');
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return ok(rows);
    }

    const body = JSON.parse(event.body || '{}');

    if (event.httpMethod === 'PUT') {
      const { id, ...updates } = body;
      if (!id) return fail('ID requerido');
      const done = await updateById('Comunidad', id, updates);
      return done ? ok({ success: true }) : fail('Post no encontrado', 404);
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = body;
      if (!id) return fail('ID requerido');
      const done = await deleteById('Comunidad', id);
      return done ? ok({ success: true }) : fail('Post no encontrado', 404);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
