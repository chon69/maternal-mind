const crypto = require('crypto');
const { requireAuth, ok, fail, preflight } = require('../lib/auth');
const { getAll, append } = require('../lib/sheets');
const { send, wrapEmail } = require('../lib/email');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'chon@maternalmind.es';
const APP_URL     = process.env.APP_URL || 'http://localhost:3000';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  let user;
  try { user = requireAuth(event); }
  catch (e) { return fail(e.message, e.status || 401); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Mensajes');
      const mine = rows
        .filter(r => r.cliente_id === user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return ok(mine);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { asunto, contenido } = body;
      if (!contenido?.trim()) return fail('El contenido es obligatorio');
      const asuntoFinal = asunto?.trim() || 'Consulta';
      await append('Mensajes', {
        id: crypto.randomUUID(),
        cliente_id: user.id,
        cliente_nombre: user.nombre,
        cliente_email: user.email,
        asunto: asuntoFinal,
        contenido: contenido.trim(),
        respuesta: '',
        estado: 'pendiente',
        created_at: new Date().toISOString(),
        respondido_at: '',
      });
      // Notificar a Chon (no bloqueante)
      send(ADMIN_EMAIL, `Nuevo mensaje de ${user.nombre}: ${asuntoFinal}`,
        wrapEmail(`
          <p style="margin:0 0 12px;font-size:15px;color:#3A3A3A;"><strong>${user.nombre}</strong> (<a href="mailto:${user.email}" style="color:#5BBFB9">${user.email}</a>) te ha enviado un mensaje:</p>
          <blockquote style="margin:0 0 20px;padding:14px 18px;background:#EEF9F8;border-left:3px solid #7DCFCA;border-radius:0 8px 8px 0;font-size:14px;color:#3A3A3A;line-height:1.7;white-space:pre-wrap;">${contenido.trim().replace(/</g,'&lt;')}</blockquote>
          <a href="${APP_URL}/app/admin/mensajes.html" style="display:inline-block;background:#7DCFCA;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;font-weight:600">Ver y responder →</a>`)
      ).catch(e => console.error('[client-messages] notif admin:', e.message));
      return ok({ success: true }, 201);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
