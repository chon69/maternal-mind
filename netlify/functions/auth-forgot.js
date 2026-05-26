const crypto = require('crypto');
const { findBy, updateById } = require('../lib/sheets');
const { ok, fail, preflight } = require('../lib/auth');
const { send, activationEmail } = require('../lib/email');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Method not allowed', 405);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return fail('Invalid JSON'); }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) return fail('Falta el email');

  try {
    const user = await findBy('Usuarios', 'email', email);
    if (!user) return ok({ success: true }); // no revelar si existe o no

    const token  = crypto.randomUUID();
    const expiry = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    await updateById('Usuarios', user.id, { token_activacion: token, token_expiry: expiry });

    const url = `${APP_URL}/app/activar.html?token=${token}&email=${encodeURIComponent(email)}`;
    await send(email, 'Restablecer contraseña · Maternal Mind', activationEmail(user.nombre, url));

    return ok({ success: true });
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
