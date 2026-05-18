const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const HEADERS = {
  Usuarios:  ['id','nombre','email','password_hash','role','estado','token_activacion','token_expiry','created_at','last_login','plan'],
  Recursos:  ['id','titulo','descripcion','tipo','modulo','modulo_nombre','orden','contenido','url_archivo','duracion','activo','created_at','premium'],
  Eventos:   ['id','titulo','descripcion','tipo','fecha_inicio','fecha_fin','precio','moneda','url_inscripcion','imagen_url','activo','destacado','created_at'],
  Plantillas:['id','nombre','asunto','cuerpo_html','tipo','activo','created_at'],
  Articulos: ['id','titulo','slug','descripcion','contenido_html','imagen_url','categoria','activo','created_at'],
  Podcast:   ['id','titulo','descripcion','numero_episodio','temporada','url_spotify','url_apple','url_ivoox','imagen_url','activo','created_at'],
};

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

function api() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

async function ensureSheet(name) {
  const sheets = api();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === name);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: name } } }] },
    });
    if (HEADERS[name]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${name}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS[name]] },
      });
    }
  }
}

async function getAll(sheet) {
  const sheets = api();
  let res;
  try {
    res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheet}!A:Z`,
    });
  } catch (e) {
    // Sheet doesn't exist yet — return empty, it will be created on first write
    if (e.message && e.message.includes('Unable to parse range')) return [];
    throw e;
  }
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

async function findBy(sheet, field, value) {
  const rows = await getAll(sheet);
  return rows.find(r => r[field] === value) || null;
}

async function append(sheet, data) {
  await ensureSheet(sheet);
  const sheets = api();
  const row = HEADERS[sheet].map(h => data[h] !== undefined ? String(data[h]) : '');
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

async function updateById(sheet, id, updates) {
  const sheets = api();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:Z`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return false;
  const headers = rows[0];
  const idIdx = headers.indexOf('id');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === id) {
      const updated = [...rows[i]];
      Object.entries(updates).forEach(([k, v]) => {
        const col = headers.indexOf(k);
        if (col >= 0) updated[col] = String(v);
      });
      const endCol = String.fromCharCode(64 + headers.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet}!A${i + 1}:${endCol}${i + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updated] },
      });
      return true;
    }
  }
  return false;
}

async function deleteById(sheet, id) {
  const sheets = api();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetMeta = meta.data.sheets.find(s => s.properties.title === sheet);
  if (!sheetMeta) return false;
  const sheetId = sheetMeta.properties.sheetId;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:A`,
  });
  const col = res.data.values || [];
  const rowIdx = col.findIndex((r, i) => i > 0 && r[0] === id);
  if (rowIdx < 1) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIdx, endIndex: rowIdx + 1 },
        },
      }],
    },
  });
  return true;
}

module.exports = { ensureSheet, getAll, findBy, append, updateById, deleteById };
