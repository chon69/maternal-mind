/**
 * get-tokens.js — Ejecución única para obtener el refresh_token de Google
 *
 * Requisitos previos:
 *   1. En Google Cloud Console (console.cloud.google.com):
 *      - Activa "Gmail API" y "Google Sheets API" en el proyecto
 *      - En OAuth consent screen → añade chon@maternalmind.es como Test user
 *      - En Credentials → tu OAuth 2.0 Client ID → añade http://localhost:3000/callback
 *        como "Authorized redirect URI"
 *   2. Comparte el Google Sheet con chon@maternalmind.es (o la cuenta que uses)
 *
 * Ejecución:
 *   node get-tokens.js
 */

const { google } = require('googleapis');
const http       = require('http');
const fs         = require('fs');
const path       = require('path');
const { URL }    = require('url');

// Leer .env.local
const envPath    = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env        = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^([^=\s]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const CLIENT_ID     = env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3000/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  No se encontraron GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env.local');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n🌿  Maternal Mind — Configuración OAuth Google\n');
console.log('Abre esta URL en tu navegador y autoriza con chon@maternalmind.es:\n');
console.log(authUrl);
console.log('\n⏳  Esperando callback en http://localhost:3000/callback …\n');

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost:3000');
  if (reqUrl.pathname !== '/callback') { res.end('404'); return; }

  const code = reqUrl.searchParams.get('code');
  if (!code) {
    res.writeHead(400); res.end('Error: no se recibió el código de autorización.');
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
    res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#EDF4F5;">
      <h2 style="color:#4A8A8E;">✅ ¡Autorización completada!</h2>
      <p>Copia el <strong>GOOGLE_REFRESH_TOKEN</strong> de la terminal y añádelo a .env.local y Netlify.</p>
      <p>Puedes cerrar esta ventana.</p>
    </body></html>`);

    console.log('\n✅  ¡Tokens obtenidos con éxito!\n');
    console.log('══════════════════════════════════════════════════════');
    console.log('  Añade estas variables a tu .env.local:');
    console.log('══════════════════════════════════════════════════════');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GOOGLE_SPREADSHEET_ID=10ucqdwcLjuNL4K6Fv565nhQMXtPR5oE8QsXhKrdAaXw`);
    console.log(`SENDER_EMAIL=chon@maternalmind.es`);
    console.log('\n══════════════════════════════════════════════════════');
    console.log('  Y también en Netlify Dashboard → Site configuration');
    console.log('  → Environment variables:');
    console.log('══════════════════════════════════════════════════════');
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GOOGLE_SPREADSHEET_ID=10ucqdwcLjuNL4K6Fv565nhQMXtPR5oE8QsXhKrdAaXw`);
    console.log(`SENDER_EMAIL=chon@maternalmind.es`);
    console.log('══════════════════════════════════════════════════════\n');

    server.close();
  } catch (err) {
    console.error('❌  Error intercambiando código:', err.message);
    res.writeHead(500); res.end('Error: ' + err.message);
    server.close();
  }
});

server.listen(3000);
