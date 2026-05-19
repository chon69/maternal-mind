const { google } = require('googleapis');
const { append, findBy } = require('../lib/sheets');
const { send, activationEmail } = require('../lib/email');
const crypto = require('crypto');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'chon@maternalmind.es';
const APP_URL        = process.env.APP_URL || 'http://localhost:3000';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function sheetsAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

async function logLead(nombre, email) {
  const sheets = google.sheets({ version: 'v4', auth: sheetsAuth() });
  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A1',
  });
  if (!check.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A1:C1',
      valueInputOption: 'RAW',
      requestBody: { values: [['Nombre', 'Email', 'Fecha de Registro']] },
    });
  }
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const fecha = `${pad(now.getDate())}-${pad(now.getMonth()+1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[nombre, email, fecha]] },
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const nombre = (body.nombre || '').trim();
  const email  = (body.email  || '').trim();
  if (!nombre || !email) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Faltan datos' }) };

  const [leadResult, userResult] = await Promise.allSettled([
    logLead(nombre, email),
    (async () => {
      console.log(`[submit-form] buscando usuario: ${email}`);
      const existing = await findBy('Usuarios', 'email', email);
      if (existing && existing.estado === 'activo') {
        console.log(`[submit-form] ya activo: ${email}`);
        return 'already_active';
      }
      if (existing && existing.estado === 'pendiente') {
        console.log(`[submit-form] pendiente, reenviando email a: ${email}`);
        const url = `${APP_URL}/app/activar.html?token=${existing.token_activacion}&email=${encodeURIComponent(email)}`;
        await send(email, 'Accede a tu Kit de Bienvenida 🌿', activationEmail(nombre, url));
        console.log(`[submit-form] email reenviado a: ${email}`);
        return 'resent';
      }
      console.log(`[submit-form] creando usuario: ${email}`);
      const token = crypto.randomUUID();
      const expiry = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
      const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'client';
      await append('Usuarios', {
        id: crypto.randomUUID(),
        nombre,
        email,
        password_hash: '',
        role,
        estado: 'pendiente',
        token_activacion: token,
        token_expiry: expiry,
        created_at: new Date().toISOString(),
        last_login: '',
      });
      const url = `${APP_URL}/app/activar.html?token=${token}&email=${encodeURIComponent(email)}`;
      console.log(`[submit-form] enviando email de activación a: ${email}`);
      await send(email, 'Accede a tu Kit de Bienvenida 🌿', activationEmail(nombre, url));
      console.log(`[submit-form] email enviado a: ${email}`);
      return 'created';
    })(),
  ]);

  if (leadResult.status === 'rejected') console.error('[submit-form] Sheets lead error:', leadResult.reason?.message || leadResult.reason);
  if (userResult.status === 'rejected')  console.error('[submit-form] User/email error:', userResult.reason?.message || userResult.reason);
  if (userResult.status === 'fulfilled') console.log('[submit-form] resultado:', userResult.value);

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
};
