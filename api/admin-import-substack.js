const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { pool } = require('../lib/db');
const { parseSubscribersCsv } = require('../lib/substack');

/**
 * Importa el CSV de suscriptoras de Substack al registro de contactos.
 *
 * Idempotente: se puede subir el mismo CSV mil veces. Quien ya existe no se
 * duplica ni se altera (solo se anota que también está en Substack); quien no
 * existe entra como estado 'suscriptor', sin recibir ningún email.
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return fail('Method not allowed', 405);

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  let csv;
  try { csv = (JSON.parse(event.body || '{}').csv || '').trim(); }
  catch { return fail('Invalid JSON'); }
  if (!csv) return fail('No has adjuntado ningún CSV');

  let filas;
  try { filas = parseSubscribersCsv(csv); }
  catch (e) { return fail(e.message); }
  if (!filas.length) return fail('El CSV no contiene ninguna suscriptora');

  const resumen = { leidas: filas.length, nuevas: 0, ya_estaban: 0, bajas_omitidas: 0, errores: 0 };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const f of filas) {
      if (!f.activa) { resumen.bajas_omitidas++; continue; }
      try {
        const { rows } = await client.query(
          `INSERT INTO usuarios (nombre, email, estado, origen, substack_at, created_at)
           VALUES ($1, $2, 'suscriptor', 'substack', $3, $3)
           ON CONFLICT (email) DO UPDATE
             SET substack_at = COALESCE(usuarios.substack_at, EXCLUDED.substack_at)
           RETURNING (xmax = 0) AS insertada`,
          [f.nombre, f.email, f.created_at]
        );
        rows[0].insertada ? resumen.nuevas++ : resumen.ya_estaban++;
      } catch (e) {
        resumen.errores++;
        console.error(`[import-substack] ${f.email}:`, e.message);
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[import-substack]', e);
    return fail('Error importando: ' + e.message, 500);
  } finally {
    client.release();
  }

  console.log('[import-substack]', resumen);
  return ok({ success: true, resumen });
};
