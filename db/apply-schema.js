/**
 * db/apply-schema.js — Aplica db/schema.sql sobre la base de datos.
 * Uso: node db/apply-schema.js
 *
 * Idempotente (todo el schema usa IF NOT EXISTS). A diferencia de db/migrate.js,
 * no necesita credenciales de Google: sirve para aplicar cambios de estructura
 * en staging y luego en producción.
 */

const fs   = require('fs');
const path = require('path');

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

async function main() {
  if (!process.env.DATABASE_URL) { console.error('❌ DATABASE_URL no configurado'); process.exit(1); }
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✓ Schema aplicado');
  await pool.end();
}

main().catch(async e => {
  console.error('❌ Error:', e.message);
  await pool.end();
  process.exit(1);
});
