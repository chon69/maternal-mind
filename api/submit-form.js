const { append, findBy } = require('../lib/db');
const { send, activationEmail } = require('../lib/email');
const crypto = require('crypto');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'chon@maternalmind.es';
const APP_URL     = process.env.APP_URL || 'http://localhost:3000';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const nombre = (body.nombre || '').trim();
  const email  = (body.email  || '').trim().toLowerCase();
  if (!nombre || !email) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Faltan datos' }) };

  const [leadResult, userResult] = await Promise.allSettled([
    append('Leads', { nombre, email, created_at: new Date().toISOString() }),
    (async () => {
      const existing = await findBy('Usuarios', 'email', email);
      if (existing && existing.estado === 'activo') return 'already_active';
      if (existing && existing.estado === 'pendiente') {
        const newToken = crypto.randomUUID();
        const { updateById } = require('../lib/db');
        await updateById('Usuarios', existing.id, { token_activacion: newToken, token_expiry: null });
        const url = `${APP_URL}/app/activar.html?token=${newToken}&email=${encodeURIComponent(email)}`;
        await send(email, 'Accede a tu Kit de Bienvenida 🌿', activationEmail(nombre, url));
        return 'resent';
      }
      const token = crypto.randomUUID();
      const role  = email === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'client';
      await append('Usuarios', {
        id: crypto.randomUUID(),
        nombre, email,
        password_hash: '',
        role, estado: 'pendiente',
        token_activacion: token,
        token_expiry: null,
        created_at: new Date().toISOString(),
        last_login: null,
      });
      const url = `${APP_URL}/app/activar.html?token=${token}&email=${encodeURIComponent(email)}`;
      await send(email, 'Accede a tu Kit de Bienvenida 🌿', activationEmail(nombre, url));
      return 'created';
    })(),
  ]);

  if (leadResult.status === 'rejected') console.error('[submit-form] lead error:', leadResult.reason?.message);
  if (userResult.status === 'rejected') console.error('[submit-form] user error:', userResult.reason?.message);
  if (userResult.status === 'fulfilled') console.log('[submit-form] result:', userResult.value);

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
};
