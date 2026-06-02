const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TABLE_MAP = {
  Usuarios:  'usuarios',
  Recursos:  'recursos',
  Eventos:   'eventos',
  Plantillas:'plantillas',
  Articulos: 'articulos',
  Podcast:   'podcast',
  Comunidad: 'comunidad',
  Mensajes:  'mensajes',
  Leads:     'leads',
};

function t(name) {
  return TABLE_MAP[name] || name.toLowerCase();
}

function serialize(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) out[k] = '';
    else if (typeof v === 'boolean')   out[k] = v ? 'TRUE' : 'FALSE';
    else if (v instanceof Date)        out[k] = v.toISOString();
    else                               out[k] = String(v);
  }
  return out;
}

async function getAll(sheet) {
  const { rows } = await pool.query(`SELECT * FROM ${t(sheet)} ORDER BY created_at`);
  return rows.map(serialize);
}

async function findBy(sheet, field, value) {
  const { rows } = await pool.query(
    `SELECT * FROM ${t(sheet)} WHERE ${field} = $1 LIMIT 1`,
    [value]
  );
  return rows.length ? serialize(rows[0]) : null;
}

async function append(sheet, data) {
  const keys = Object.keys(data);
  const cols = keys.join(', ');
  const phs  = keys.map((_, i) => `$${i + 1}`).join(', ');
  const vals = keys.map(k => data[k]);
  await pool.query(`INSERT INTO ${t(sheet)} (${cols}) VALUES (${phs})`, vals);
}

async function updateById(sheet, id, updates) {
  const keys = Object.keys(updates);
  if (!keys.length) return false;
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const vals = [...keys.map(k => updates[k]), id];
  const res  = await pool.query(
    `UPDATE ${t(sheet)} SET ${sets} WHERE id = $${keys.length + 1}`,
    vals
  );
  return res.rowCount > 0;
}

async function deleteById(sheet, id) {
  const res = await pool.query(`DELETE FROM ${t(sheet)} WHERE id = $1`, [id]);
  return res.rowCount > 0;
}

module.exports = { getAll, findBy, append, updateById, deleteById, pool };
