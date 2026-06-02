/**
 * db/migrate.js — Migración de Google Sheets → PostgreSQL
 *
 * Uso:
 *   DATABASE_URL=postgres://... node db/migrate.js
 *
 * O con .env.local configurado (DATABASE_URL apuntando a Render o local):
 *   node db/migrate.js
 */

const fs   = require('fs');
const path = require('path');

// Cargar .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const { google } = require('googleapis');
const { Pool }   = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function sheetsAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

async function getSheet(sheetsApi, name) {
  try {
    const res = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: `${name}!A:Z`,
    });
    const rows = res.data.values || [];
    if (rows.length < 2) return [];
    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });
  } catch {
    console.log(`  ⚠  Hoja "${name}" no encontrada o vacía, omitiendo.`);
    return [];
  }
}

function parseBool(val) {
  if (val === 'TRUE' || val === 'true' || val === '1' || val === true) return true;
  return false;
}

function parseDate(val) {
  if (!val || val === '') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseNum(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

async function applySchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✓ Schema aplicado');
}

async function migrateUsuarios(sheetsApi) {
  const rows = await getSheet(sheetsApi, 'Usuarios');
  let count = 0;
  for (const r of rows) {
    if (!r.id || !r.email) continue;
    try {
      await pool.query(
        `INSERT INTO usuarios (id, nombre, email, password_hash, role, estado, token_activacion, token_expiry, created_at, last_login, plan)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, r.nombre || '', r.email,
          r.password_hash || '',
          r.role || 'client',
          r.estado || 'pendiente',
          r.token_activacion || '',
          parseDate(r.token_expiry),
          parseDate(r.created_at) || new Date(),
          parseDate(r.last_login),
          r.plan || 'free',
        ]
      );
      count++;
    } catch (e) {
      console.error(`  ✗ usuario ${r.email}:`, e.message);
    }
  }
  console.log(`✓ Usuarios: ${count}/${rows.length}`);
}

async function migrateArticulos(sheetsApi) {
  const rows = await getSheet(sheetsApi, 'Articulos');
  let count = 0;
  for (const r of rows) {
    if (!r.id || !r.titulo) continue;
    const slug = r.slug || r.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      await pool.query(
        `INSERT INTO articulos (id, titulo, slug, descripcion, contenido_html, imagen_url, categoria, activo, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, r.titulo, slug,
          r.descripcion || '',
          r.contenido_html || '',
          r.imagen_url || '',
          r.categoria || 'general',
          parseBool(r.activo),
          parseDate(r.created_at) || new Date(),
        ]
      );
      count++;
    } catch (e) {
      console.error(`  ✗ articulo ${r.titulo}:`, e.message);
    }
  }
  console.log(`✓ Artículos: ${count}/${rows.length}`);
}

async function migratePodcast(sheetsApi) {
  const rows = await getSheet(sheetsApi, 'Podcast');
  let count = 0;
  for (const r of rows) {
    if (!r.id || !r.titulo) continue;
    try {
      await pool.query(
        `INSERT INTO podcast (id, titulo, descripcion, numero_episodio, temporada, url_spotify, url_apple, url_ivoox, imagen_url, activo, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, r.titulo,
          r.descripcion || '',
          parseNum(r.numero_episodio),
          parseNum(r.temporada) || 1,
          r.url_spotify || '',
          r.url_apple || '',
          r.url_ivoox || '',
          r.imagen_url || '',
          parseBool(r.activo),
          parseDate(r.created_at) || new Date(),
        ]
      );
      count++;
    } catch (e) {
      console.error(`  ✗ podcast ${r.titulo}:`, e.message);
    }
  }
  console.log(`✓ Podcast: ${count}/${rows.length}`);
}

async function migrateEventos(sheetsApi) {
  const rows = await getSheet(sheetsApi, 'Eventos');
  let count = 0;
  for (const r of rows) {
    if (!r.id || !r.titulo) continue;
    try {
      await pool.query(
        `INSERT INTO eventos (id, titulo, descripcion, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, precio, moneda, url_inscripcion, imagen_url, activo, destacado, created_at, imagen_posicion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, r.titulo,
          r.descripcion || '',
          r.tipo || 'taller',
          parseDate(r.fecha_inicio),
          parseDate(r.fecha_fin),
          r.hora_inicio || '',
          r.hora_fin || '',
          parseNum(r.precio),
          r.moneda || 'EUR',
          r.url_inscripcion || '',
          r.imagen_url || '',
          parseBool(r.activo),
          parseBool(r.destacado),
          parseDate(r.created_at) || new Date(),
          r.imagen_posicion || 'center',
        ]
      );
      count++;
    } catch (e) {
      console.error(`  ✗ evento ${r.titulo}:`, e.message);
    }
  }
  console.log(`✓ Eventos: ${count}/${rows.length}`);
}

async function migrateRecursos(sheetsApi) {
  const rows = await getSheet(sheetsApi, 'Recursos');
  let count = 0;
  for (const r of rows) {
    if (!r.id || !r.titulo) continue;
    try {
      await pool.query(
        `INSERT INTO recursos (id, titulo, descripcion, tipo, modulo, modulo_nombre, orden, contenido, url_archivo, duracion, activo, created_at, premium)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, r.titulo,
          r.descripcion || '',
          r.tipo || '',
          r.modulo || '',
          r.modulo_nombre || '',
          parseNum(r.orden),
          r.contenido || '',
          r.url_archivo || '',
          r.duracion || '',
          parseBool(r.activo),
          parseDate(r.created_at) || new Date(),
          parseBool(r.premium),
        ]
      );
      count++;
    } catch (e) {
      console.error(`  ✗ recurso ${r.titulo}:`, e.message);
    }
  }
  console.log(`✓ Recursos: ${count}/${rows.length}`);
}

async function migratePlantillas(sheetsApi) {
  const rows = await getSheet(sheetsApi, 'Plantillas');
  let count = 0;
  for (const r of rows) {
    if (!r.id || !r.nombre) continue;
    try {
      await pool.query(
        `INSERT INTO plantillas (id, nombre, asunto, cuerpo_html, tipo, activo, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, r.nombre,
          r.asunto || '',
          r.cuerpo_html || '',
          r.tipo || '',
          parseBool(r.activo),
          parseDate(r.created_at) || new Date(),
        ]
      );
      count++;
    } catch (e) {
      console.error(`  ✗ plantilla ${r.nombre}:`, e.message);
    }
  }
  console.log(`✓ Plantillas: ${count}/${rows.length}`);
}

async function migrateComunidad(sheetsApi) {
  const rows = await getSheet(sheetsApi, 'Comunidad');
  let count = 0;
  for (const r of rows) {
    if (!r.id) continue;
    try {
      await pool.query(
        `INSERT INTO comunidad (id, autor_id, autor_nombre, categoria, contenido, activo, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.autor_id || '',
          r.autor_nombre || '',
          r.categoria || '',
          r.contenido || '',
          parseBool(r.activo),
          parseDate(r.created_at) || new Date(),
        ]
      );
      count++;
    } catch (e) {
      console.error(`  ✗ comunidad ${r.id}:`, e.message);
    }
  }
  console.log(`✓ Comunidad: ${count}/${rows.length}`);
}

async function migrateMensajes(sheetsApi) {
  const rows = await getSheet(sheetsApi, 'Mensajes');
  let count = 0;
  for (const r of rows) {
    if (!r.id) continue;
    try {
      await pool.query(
        `INSERT INTO mensajes (id, cliente_id, cliente_nombre, cliente_email, asunto, contenido, respuesta, estado, created_at, respondido_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.cliente_id || '',
          r.cliente_nombre || '',
          r.cliente_email || '',
          r.asunto || '',
          r.contenido || '',
          r.respuesta || '',
          r.estado || 'pendiente',
          parseDate(r.created_at) || new Date(),
          parseDate(r.respondido_at),
        ]
      );
      count++;
    } catch (e) {
      console.error(`  ✗ mensaje ${r.id}:`, e.message);
    }
  }
  console.log(`✓ Mensajes: ${count}/${rows.length}`);
}

async function main() {
  console.log('\n🌿 Maternal Mind — Migración Google Sheets → PostgreSQL\n');
  console.log(`  DATABASE_URL: ${(process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@')}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL no configurado en .env.local');
    process.exit(1);
  }

  const sheetsApi = google.sheets({ version: 'v4', auth: sheetsAuth() });

  await applySchema();

  await migrateUsuarios(sheetsApi);
  await migrateArticulos(sheetsApi);
  await migratePodcast(sheetsApi);
  await migrateEventos(sheetsApi);
  await migrateRecursos(sheetsApi);
  await migratePlantillas(sheetsApi);
  await migrateComunidad(sheetsApi);
  await migrateMensajes(sheetsApi);

  console.log('\n✅  Migración completada.\n');
  await pool.end();
}

main().catch(e => {
  console.error('❌  Error fatal:', e.message);
  pool.end();
  process.exit(1);
});
