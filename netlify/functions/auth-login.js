const bcrypt = require('bcryptjs');
const { findBy, updateById } = require('../lib/sheets');
const { sign, ok, fail, preflight } = require('../lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Method not allowed', 405);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return fail('Invalid JSON'); }

  const email    = (body.email    || '').trim().toLowerCase();
  const password = (body.password || '').trim();
  if (!email || !password) return fail('Email y contraseña son obligatorios');

  try {
    const user = await findBy('Usuarios', 'email', email);
    if (!user) return fail('Credenciales incorrectas', 401);
    if (user.estado === 'pendiente') return fail('Activa tu cuenta primero. Revisa tu email.', 401);
    if (user.estado !== 'activo') return fail('Cuenta desactivada. Contacta con Maternal Mind.', 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return fail('Credenciales incorrectas', 401);

    await updateById('Usuarios', user.id, { last_login: new Date().toISOString() });

    const plan = user.plan || 'free';
    const token = sign({ id: user.id, email: user.email, nombre: user.nombre, role: user.role, plan });
    return ok({ token, user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role, plan } });
  } catch (err) {
    console.error(err);
    return fail('Error interno del servidor', 500);
  }
};
