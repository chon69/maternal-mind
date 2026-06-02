const { requireAuth, ok, fail, preflight } = require('../lib/auth');
const { getAll } = require('../lib/db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  let user;
  try { user = requireAuth(event); }
  catch (e) { return fail(e.message, e.status || 401); }

  const isPremium = (user.plan || 'free') === 'biblioteca_mami';

  try {
    const rows = await getAll('Recursos');
    const active = rows
      .filter(r => r.activo === 'TRUE')
      .filter(r => isPremium || r.premium !== 'TRUE')
      .sort((a, b) => Number(a.modulo) - Number(b.modulo) || Number(a.orden) - Number(b.orden));
    return ok({ isPremium, items: active });
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
