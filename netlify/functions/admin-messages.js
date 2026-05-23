const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, updateById } = require('../lib/sheets');
const { send, wrapEmail } = require('../lib/email');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Mensajes');
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return ok(rows);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, respuesta } = body;
      if (!id) return fail('ID requerido');

      // Obtener el mensaje original para tener email y nombre de la clienta
      const rows = await getAll('Mensajes');
      const original = rows.find(r => r.id === id);

      const done = await updateById('Mensajes', id, {
        respuesta: respuesta || '',
        estado: 'respondido',
        respondido_at: new Date().toISOString(),
      });
      if (!done) return fail('Mensaje no encontrado', 404);

      // Notificar a la clienta (no bloqueante)
      if (original?.cliente_email && respuesta) {
        send(original.cliente_email, 'Tienes una respuesta de Chon · Maternal Mind',
          wrapEmail(`
            <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:20px;font-style:italic;color:#3A3A3A;">Hola, ${original.cliente_nombre || 'mamá'} 🌿</p>
            <p style="margin:0 0 12px;color:#5E5E5E;line-height:1.75;">He respondido a tu mensaje sobre: <strong style="color:#3A3A3A;">${original.asunto || 'tu consulta'}</strong></p>
            <blockquote style="margin:0 0 24px;padding:14px 18px;background:#EEF9F8;border-left:3px solid #7DCFCA;border-radius:0 8px 8px 0;font-size:14px;color:#3A3A3A;line-height:1.75;white-space:pre-wrap;">${(respuesta||'').replace(/</g,'&lt;')}</blockquote>
            <a href="${process.env.APP_URL||'http://localhost:3000'}/app/cliente/mensajes.html" style="display:inline-block;background:#7DCFCA;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;font-weight:600">Ver mis mensajes →</a>
            <p style="margin:24px 0 0;color:#5E5E5E;font-style:italic;line-height:1.75;">Con calma y cariño,<br><strong style="font-style:normal;color:#3A3A3A;">Chon</strong></p>`)
        ).catch(e => console.error('[admin-messages] notif cliente:', e.message));
      }

      return ok({ success: true });
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
