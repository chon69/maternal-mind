const { append, findBy, updateById } = require('../lib/db');
const { send, activationEmail, kitEmail } = require('../lib/email');
const { subscribe } = require('../lib/substack');
const crypto = require('crypto');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'chon@maternalmind.es';
const APP_URL     = process.env.APP_URL || 'http://localhost:3000';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// El correo no debe tumbar el alta: si Gmail falla, la madre ya está guardada y
// se le puede reenviar desde el panel. Lo que sí tiene que fallar hacia fuera es
// no poder guardarla, para que la página se lo diga en vez de fingir que ha ido bien.
async function enviar(email, asunto, html) {
  try { await send(email, asunto, html); }
  catch (err) { console.error('[submit-form] email no enviado a', email + ':', err.message); }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const nombre = (body.nombre || '').trim();
  const email  = (body.email  || '').trim().toLowerCase();
  // De dónde llega el alta: la home no lo manda ('web'), la página del retiro sí.
  const origen = (body.origen || 'web').trim().slice(0, 40);
  if (!nombre || !email) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Faltan datos' }) };

  const [leadResult, userResult, substackResult] = await Promise.allSettled([
    append('Leads', { nombre, email, created_at: new Date().toISOString(), origen }),
    (async () => {
      const existing = await findBy('Usuarios', 'email', email);
      // El origen guardado es aquel por el que llegó la primera vez. Solo lo pisamos
      // si ahora viene del retiro: es lo que Chon necesita ver de un vistazo.
      const reOrigen = origen.startsWith('retiro') ? { origen } : {};
      if (existing && existing.estado === 'activo') {
        // Ya tiene cuenta y contraseña: mandarle otra vez el email de activación
        // la confundiría. Se le manda el Kit a secas, que es a lo que ha venido.
        await updateById('Usuarios', existing.id, { nombre, ...reOrigen });
        await enviar(email, 'Tu Kit de Pausa 🌿', kitEmail(nombre, `${APP_URL}/kit`));
        return 'already_active';
      }
      if (existing) {
        // Cualquier contacto que aún no ha activado su cuenta: puede estar
        // 'pendiente' (ya se le invitó) o 'suscriptor' (llegó importado de Substack).
        // Reutilizamos el token existente: así TODOS los emails de activación
        // enviados a esta madre siguen siendo válidos (el enlace nunca caduca).
        // Solo generamos uno si por algún motivo no lo tuviera.
        let token = existing.token_activacion;
        if (!token) {
          token = crypto.randomUUID();
          await updateById('Usuarios', existing.id, { token_activacion: token, token_expiry: null });
        }
        // El nombre importado de Substack es una suposición a partir del email:
        // el que escribe ella en el formulario manda.
        await updateById('Usuarios', existing.id, { nombre, estado: 'pendiente', ...reOrigen });
        const url = `${APP_URL}/app/activar.html?token=${token}&email=${encodeURIComponent(email)}`;
        await enviar(email, 'Tu Kit de Pausa 🌿', activationEmail(nombre, url));
        return 'resent';
      }
      const token = crypto.randomUUID();
      const role  = email === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'client';
      await append('Usuarios', {
        id: crypto.randomUUID(),
        nombre, email,
        password_hash: '',
        role, estado: 'pendiente',
        token_activacion: token,
        token_expiry: null,
        created_at: new Date().toISOString(),
        last_login: null,
        origen,
      });
      const url = `${APP_URL}/app/activar.html?token=${token}&email=${encodeURIComponent(email)}`;
      await enviar(email, 'Tu Kit de Pausa 🌿', activationEmail(nombre, url));
      return 'created';
    })(),
    // Alta paralela en la newsletter: el funnel empieza en Substack, así que
    // quien entra por el formulario propio también debe recibirla. Si falla,
    // no pasa nada: el contacto ya está guardado y se recuperará en el próximo CSV.
    subscribe(email),
  ]);

  if (leadResult.status === 'rejected') console.error('[submit-form] lead error:', leadResult.reason?.message);
  if (userResult.status === 'rejected') console.error('[submit-form] user error:', userResult.reason?.message);
  if (userResult.status === 'fulfilled') console.log('[submit-form] result:', userResult.value);
  console.log('[submit-form] substack:', substackResult.value ? 'suscrita' : 'no suscrita');

  if (userResult.status === 'rejected') {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'No se ha podido guardar el alta' }) };
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
};
