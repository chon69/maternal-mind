const { requireAuth, ok, fail, preflight } = require('../lib/auth');
const { getAll } = require('../lib/db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  try { requireAuth(event); }
  catch (e) { return fail(e.message, e.status || 401); }
  try {
    const rows = await getAll('Articulos');
    const active = rows
      .filter(r => r.activo === 'TRUE')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return ok(active);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
