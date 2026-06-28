const bcrypt = require('bcryptjs');
const { findBy, updateById } = require('../lib/db');
const { ok, fail, preflight } = require('../lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Method not allowed', 405);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return fail('Invalid JSON'); }

  const { token, email, password } = body;
  if (!token || !email || !password) return fail('Faltan campos');
  if (password.length < 8) return fail('La contraseña debe tener al menos 8 caracteres');

  try {
    const user = await findBy('Usuarios', 'email', email.trim().toLowerCase());
    if (!user) return fail('Usuario no encontrado', 404);
    // La cuenta ya estaba activada (p. ej. clic por segunda vez en el enlace):
    // no es un error de caducidad, solo hay que iniciar sesión.
    if (user.estado === 'activo' && user.token_activacion !== token) {
      return fail('Tu cuenta ya está activa. Inicia sesión con tu email y contraseña.', 409);
    }
    if (user.token_activacion !== token) return fail('Enlace inválido', 400);

    const hash = await bcrypt.hash(password, 10);
    await updateById('Usuarios', user.id, {
      password_hash: hash,
      estado: 'activo',
      token_activacion: '',
      token_expiry: null,
    });

    const { sign } = require('../lib/auth');
    const plan = user.plan || 'free';
    const jwtToken = sign({ id: user.id, email: user.email, nombre: user.nombre, role: user.role, plan });
    return ok({ token: jwtToken, user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role, plan } });
  } catch (err) {
    console.error(err);
    return fail('Error interno del servidor', 500);
  }
};
