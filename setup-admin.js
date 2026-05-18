/**
 * Crea la cuenta de admin (Chon) directamente en Google Sheets.
 * Uso: node setup-admin.js <contraseña>
 */
const fs   = require('fs');
const path = require('path');

// Cargar .env.local
fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^=#\s][^=]*)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
});

const bcrypt     = require('bcryptjs');
const crypto     = require('crypto');
const { google } = require('googleapis');

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Uso: node setup-admin.js <contraseña>  (mínimo 8 caracteres)');
  process.exit(1);
}

async function run() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const sheets = google.sheets({ version: 'v4', auth });
  const ID     = process.env.GOOGLE_SPREADSHEET_ID;

  // Asegurar que existe la hoja Usuarios
  const meta = await sheets.spreadsheets.get({ spreadsheetId: ID });
  const existe = meta.data.sheets.some(s => s.properties.title === 'Usuarios');
  if (!existe) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ID,
      requestBody: { requests: [{ addSheet: { properties: { title: 'Usuarios' } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: ID,
      range: 'Usuarios!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [['id','nombre','email','password_hash','role','estado','token_activacion','token_expiry','created_at','last_login','plan']] },
    });
    console.log('✓ Hoja Usuarios creada');
  }

  // Comprobar si ya existe el admin
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: ID, range: 'Usuarios!A:Z' });
  const rows = res.data.values || [];
  const headers = rows[0] || [];
  const emailIdx = headers.indexOf('email');
  const idIdx    = headers.indexOf('id');
  const existing = rows.slice(1).find(r => r[emailIdx] === process.env.ADMIN_EMAIL);

  const hash = await bcrypt.hash(password, 10);

  if (existing) {
    // Actualizar contraseña y activar
    const rowNum = rows.indexOf(existing) + 1;
    const pwIdx  = headers.indexOf('password_hash');
    const stIdx  = headers.indexOf('estado');
    const tokIdx = headers.indexOf('token_activacion');
    existing[pwIdx]  = hash;
    existing[stIdx]  = 'activo';
    existing[tokIdx] = '';
    const endCol = String.fromCharCode(64 + headers.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId: ID,
      range: `Usuarios!A${rowNum + 1}:${endCol}${rowNum + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [existing] },
    });
    console.log(`✓ Contraseña actualizada para ${process.env.ADMIN_EMAIL}`);
  } else {
    // Crear cuenta nueva
    const row = [
      crypto.randomUUID(),
      'Chon',
      process.env.ADMIN_EMAIL,
      hash,
      'admin',
      'activo',
      '', '',
      new Date().toISOString(),
      '',
      'biblioteca_mami',
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: ID,
      range: 'Usuarios!A:A',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    console.log(`✓ Cuenta admin creada para ${process.env.ADMIN_EMAIL}`);
  }

  console.log('\n¡Listo! Ahora puedes entrar en:');
  console.log(`  http://localhost:3000/app/login.html`);
  console.log(`  Email:      ${process.env.ADMIN_EMAIL}`);
  console.log(`  Contraseña: la que acabas de elegir\n`);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
