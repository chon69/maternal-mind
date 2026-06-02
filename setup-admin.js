/**
 * setup-admin.js — Crea o actualiza la cuenta admin en PostgreSQL
 * Uso: node setup-admin.js <contraseña>
 */

const fs   = require('fs');
const path = require('path');

fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^=#\s][^=]*)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
});

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Pool } = require('pg');

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Uso: node setup-admin.js <contraseña>  (mínimo 8 caracteres)');
  process.exit(1);
}

const isLocal = (process.env.DATABASE_URL || '').includes('localhost');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'chon@maternalmind.es';

async function run() {
  const hash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    'SELECT id FROM usuarios WHERE email = $1',
    [ADMIN_EMAIL]
  );

  if (rows.length) {
    await pool.query(
      `UPDATE usuarios SET password_hash=$1, estado='activo', token_activacion='', plan='biblioteca_mami', role='admin' WHERE email=$2`,
      [hash, ADMIN_EMAIL]
    );
    console.log(`✓ Contraseña actualizada para ${ADMIN_EMAIL}`);
  } else {
    await pool.query(
      `INSERT INTO usuarios (id, nombre, email, password_hash, role, estado, token_activacion, created_at, plan)
       VALUES ($1, 'Chon', $2, $3, 'admin', 'activo', '', NOW(), 'biblioteca_mami')`,
      [crypto.randomUUID(), ADMIN_EMAIL, hash]
    );
    console.log(`✓ Cuenta admin creada para ${ADMIN_EMAIL}`);
  }

  console.log(`\n¡Listo! Ahora puedes entrar en:`);
  console.log(`  ${process.env.APP_URL || 'http://localhost:3000'}/app/login.html`);
  console.log(`  Email:      ${ADMIN_EMAIL}`);
  console.log(`  Contraseña: la que acabas de elegir\n`);

  await pool.end();
}

run().catch(e => { console.error('Error:', e.message); pool.end(); process.exit(1); });
