/**
 * db/migrate.js — Migración de Google Sheets → PostgreSQL
 * Uso: node db/migrate.js
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const { Pool } = require('pg');
const isLocal = (process.env.DATABASE_URL || '').includes('localhost');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

function httpsPost(hostname, path, data) {
  return new Promise((resolve, reject) => {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const req = https.request({ hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.end();
  });
}

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const res = await httpsPost('oauth2.googleapis.com', '/token', params.toString());
  if (!res.access_token) throw new Error('No se obtuvo access_token: ' + JSON.stringify(res));
  return res.access_token;
}

function normalizeHeader(h) {
  return h.toLowerCase().replace(/\s+/g, '_');
}

async function getSheet(token, name) {
  const id  = process.env.GOOGLE_SPREADSHEET_ID;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(name + '!A:Z')}`;
  try {
    const res = await httpsGet(url, token);
    const rows = res.values || [];
    if (rows.length < 2) return [];
    const headers = rows[0].map(normalizeHeader);
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });
  } catch {
    console.log(`  ⚠  Hoja "${name}" no encontrada, omitiendo.`);
    return [];
  }
}

async function getSheetList(token) {
  const id  = process.env.GOOGLE_SPREADSHEET_ID;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties.title`;
  const res = await httpsGet(url, token);
  return (res.sheets || []).map(s => s.properties.title);
}

function parseBool(v) { return v === 'TRUE' || v === 'true' || v === '1' || v === true; }
function parseDate(v) { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d; }
function parseNum(v)  { const n = Number(v); return isNaN(n) ? 0 : n; }

async function applySchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✓ Schema aplicado');
}

async function migrate(token) {
  // USUARIOS
  const usuarios = await getSheet(token, 'Usuarios');
  let c = 0;
  for (const r of usuarios) {
    if (!r.id || !r.email) continue;
    try {
      await pool.query(
        `INSERT INTO usuarios (id,nombre,email,password_hash,role,estado,token_activacion,token_expiry,created_at,last_login,plan)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.nombre||'', r.email, r.password_hash||'', r.role||'client', r.estado||'pendiente',
         r.token_activacion||'', parseDate(r.token_expiry), parseDate(r.created_at)||new Date(),
         parseDate(r.last_login), r.plan||'free']
      ); c++;
    } catch(e) { console.error(`  ✗ usuario ${r.email}:`, e.message); }
  }
  console.log(`✓ Usuarios: ${c}/${usuarios.length}`);

  // ARTICULOS
  const articulos = await getSheet(token, 'Articulos');
  c = 0;
  for (const r of articulos) {
    if (!r.id || !r.titulo) continue;
    const slug = r.slug || r.titulo.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    try {
      await pool.query(
        `INSERT INTO articulos (id,titulo,slug,descripcion,contenido_html,imagen_url,categoria,activo,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.titulo, slug, r.descripcion||'', r.contenido_html||'', r.imagen_url||'',
         r.categoria||'general', parseBool(r.activo), parseDate(r.created_at)||new Date()]
      ); c++;
    } catch(e) { console.error(`  ✗ articulo ${r.titulo}:`, e.message); }
  }
  console.log(`✓ Artículos: ${c}/${articulos.length}`);

  // PODCAST
  const podcast = await getSheet(token, 'Podcast');
  c = 0;
  for (const r of podcast) {
    if (!r.id || !r.titulo) continue;
    try {
      await pool.query(
        `INSERT INTO podcast (id,titulo,descripcion,numero_episodio,temporada,url_spotify,url_apple,url_ivoox,imagen_url,activo,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.titulo, r.descripcion||'', parseNum(r.numero_episodio), parseNum(r.temporada)||1,
         r.url_spotify||'', r.url_apple||'', r.url_ivoox||'', r.imagen_url||'',
         parseBool(r.activo), parseDate(r.created_at)||new Date()]
      ); c++;
    } catch(e) { console.error(`  ✗ podcast ${r.titulo}:`, e.message); }
  }
  console.log(`✓ Podcast: ${c}/${podcast.length}`);

  // EVENTOS
  const eventos = await getSheet(token, 'Eventos');
  c = 0;
  for (const r of eventos) {
    if (!r.id || !r.titulo) continue;
    try {
      await pool.query(
        `INSERT INTO eventos (id,titulo,descripcion,tipo,fecha_inicio,fecha_fin,hora_inicio,hora_fin,precio,moneda,url_inscripcion,imagen_url,activo,destacado,created_at,imagen_posicion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.titulo, r.descripcion||'', r.tipo||'taller', parseDate(r.fecha_inicio), parseDate(r.fecha_fin),
         r.hora_inicio||'', r.hora_fin||'', parseNum(r.precio), r.moneda||'EUR',
         r.url_inscripcion||'', r.imagen_url||'', parseBool(r.activo), parseBool(r.destacado),
         parseDate(r.created_at)||new Date(), r.imagen_posicion||'center']
      ); c++;
    } catch(e) { console.error(`  ✗ evento ${r.titulo}:`, e.message); }
  }
  console.log(`✓ Eventos: ${c}/${eventos.length}`);

  // RECURSOS
  const recursos = await getSheet(token, 'Recursos');
  c = 0;
  for (const r of recursos) {
    if (!r.id || !r.titulo) continue;
    try {
      await pool.query(
        `INSERT INTO recursos (id,titulo,descripcion,tipo,modulo,modulo_nombre,orden,contenido,url_archivo,duracion,activo,created_at,premium)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.titulo, r.descripcion||'', r.tipo||'', r.modulo||'', r.modulo_nombre||'',
         parseNum(r.orden), r.contenido||'', r.url_archivo||'', r.duracion||'',
         parseBool(r.activo), parseDate(r.created_at)||new Date(), parseBool(r.premium)]
      ); c++;
    } catch(e) { console.error(`  ✗ recurso ${r.titulo}:`, e.message); }
  }
  console.log(`✓ Recursos: ${c}/${recursos.length}`);

  // PLANTILLAS
  const plantillas = await getSheet(token, 'Plantillas');
  c = 0;
  for (const r of plantillas) {
    if (!r.id || !r.nombre) continue;
    try {
      await pool.query(
        `INSERT INTO plantillas (id,nombre,asunto,cuerpo_html,tipo,activo,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.nombre, r.asunto||'', r.cuerpo_html||'', r.tipo||'',
         parseBool(r.activo), parseDate(r.created_at)||new Date()]
      ); c++;
    } catch(e) { console.error(`  ✗ plantilla ${r.nombre}:`, e.message); }
  }
  console.log(`✓ Plantillas: ${c}/${plantillas.length}`);

  // COMUNIDAD
  const comunidad = await getSheet(token, 'Comunidad');
  c = 0;
  for (const r of comunidad) {
    if (!r.id) continue;
    try {
      await pool.query(
        `INSERT INTO comunidad (id,autor_id,autor_nombre,categoria,contenido,activo,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.autor_id||'', r.autor_nombre||'', r.categoria||'', r.contenido||'',
         parseBool(r.activo), parseDate(r.created_at)||new Date()]
      ); c++;
    } catch(e) { console.error(`  ✗ comunidad ${r.id}:`, e.message); }
  }
  console.log(`✓ Comunidad: ${c}/${comunidad.length}`);

  // MENSAJES
  const mensajes = await getSheet(token, 'Mensajes');
  c = 0;
  for (const r of mensajes) {
    if (!r.id) continue;
    try {
      await pool.query(
        `INSERT INTO mensajes (id,cliente_id,cliente_nombre,cliente_email,asunto,contenido,respuesta,estado,created_at,respondido_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.cliente_id||'', r.cliente_nombre||'', r.cliente_email||'', r.asunto||'',
         r.contenido||'', r.respuesta||'', r.estado||'pendiente',
         parseDate(r.created_at)||new Date(), parseDate(r.respondido_at)]
      ); c++;
    } catch(e) { console.error(`  ✗ mensaje ${r.id}:`, e.message); }
  }
  console.log(`✓ Mensajes: ${c}/${mensajes.length}`);
}

async function main() {
  console.log('\n🌿 Maternal Mind — Migración Google Sheets → PostgreSQL\n');
  if (!process.env.DATABASE_URL) { console.error('❌ DATABASE_URL no configurado'); process.exit(1); }

  await applySchema();

  console.log('Obteniendo token de Google...');
  const token = await getAccessToken();
  console.log('✓ Token OK\n');

  const sheets = await getSheetList(token);
  console.log('Hojas encontradas:', sheets.join(', '), '\n');

  await migrate(token);

  console.log('\n✅ Migración completada.\n');
  await pool.end();
}

main().catch(async e => {
  console.error('❌ Error:', e.message);
  await pool.end();
  process.exit(1);
});
