const bcrypt = require('bcryptjs');
const { requireAuth, ok, fail, preflight } = require('../lib/auth');
const { updateById } = require('../lib/sheets');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Method not allowed', 405);

  let user;
  try { user = requireAuth(event); }
  catch (e) { return fail(e.message, e.status || 401); }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return fail('Invalid JSON'); }

  const { password } = body;
  if (!password || password.length < 8) return fail('La contraseña debe tener al menos 8 caracteres');

  try {
    const hash = await bcrypt.hash(password, 10);
    await updateById('Usuarios', user.id, { password_hash: hash });
    return ok({ success: true });
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
