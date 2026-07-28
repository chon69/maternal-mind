const crypto = require('crypto');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { pool } = require('../lib/db');
const { send, activationEmail } = require('../lib/email');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Envía la invitación al Kit de Bienvenida a contactos concretos.
 *
 * Es un paso manual a propósito: una suscriptora de Substack se apuntó a la
 * newsletter, no a la plataforma. Chon decide a quién y cuándo se invita.
 * Tras invitarla pasa a estado 'pendiente', el mismo del alta por formulario.
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return fail('Method not allowed', 405);

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  let ids;
  try { ids = JSON.parse(event.body || '{}').ids; }
  catch { return fail('Invalid JSON'); }
  if (!Array.isArray(ids) || !ids.length) return fail('No has seleccionado ningún contacto');

  const { rows } = await pool.query(
    `SELECT id, nombre, email, estado, token_activacion FROM usuarios WHERE id = ANY($1::uuid[])`,
    [ids]
  );

  const resumen = { enviadas: 0, omitidas: 0, fallidas: 0 };
  const detalle = [];

  for (const u of rows) {
    if (u.estado === 'activo') {
      resumen.omitidas++;
      detalle.push({ email: u.email, resultado: 'ya tiene cuenta activa' });
      continue;
    }
    try {
      // Reutilizamos el token existente para que ningún enlace enviado antes deje de valer.
      let token = u.token_activacion;
      if (!token) {
        token = crypto.randomUUID();
        await pool.query('UPDATE usuarios SET token_activacion = $1, token_expiry = NULL WHERE id = $2', [token, u.id]);
      }
      const url = `${APP_URL}/app/activar.html?token=${token}&email=${encodeURIComponent(u.email)}`;
      await send(u.email, 'Accede a tu Kit de Bienvenida 🌿', activationEmail(u.nombre, url));
      await pool.query(`UPDATE usuarios SET estado = 'pendiente', invitado_at = NOW() WHERE id = $1`, [u.id]);
      resumen.enviadas++;
      detalle.push({ email: u.email, resultado: 'invitación enviada' });
    } catch (e) {
      resumen.fallidas++;
      detalle.push({ email: u.email, resultado: 'error: ' + e.message });
      console.error(`[invitar-kit] ${u.email}:`, e.message);
    }
  }

  console.log('[invitar-kit]', resumen);
  return ok({ success: true, resumen, detalle });
};
