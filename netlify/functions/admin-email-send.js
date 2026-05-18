const crypto = require('crypto');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, append, updateById, deleteById } = require('../lib/sheets');
const { send, wrapEmail } = require('../lib/email');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    // GET → list templates
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Plantillas');
      return ok(rows);
    }

    const body = JSON.parse(event.body || '{}');
    const { type } = body;

    // POST → create template or send email
    if (event.httpMethod === 'POST') {
      if (type === 'send') {
        const { asunto, cuerpo_html, destinatarios } = body;
        if (!asunto || !cuerpo_html) return fail('Faltan asunto y cuerpo');
        let targets = [];
        if (destinatarios === 'all') {
          const users = await getAll('Usuarios');
          targets = users.filter(u => u.estado === 'activo').map(u => ({ email: u.email, nombre: u.nombre }));
        } else {
          targets = [{ email: destinatarios, nombre: '' }];
        }
        if (!targets.length) return fail('No hay destinatarios válidos');
        const results = await Promise.allSettled(
          targets.map(t => {
            const html = cuerpo_html.replace(/{{nombre}}/gi, t.nombre || 'Mamá');
            return send(t.email, asunto, wrapEmail(html));
          })
        );
        const sent   = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        return ok({ sent, failed });
      }
      // create template
      const { nombre, asunto, cuerpo_html, tipo } = body;
      if (!nombre || !asunto || !cuerpo_html) return fail('Nombre, asunto y cuerpo son obligatorios');
      await append('Plantillas', {
        id: crypto.randomUUID(), nombre, asunto, cuerpo_html,
        tipo: tipo || 'general', activo: 'TRUE', created_at: new Date().toISOString(),
      });
      return ok({ success: true }, 201);
    }

    // PUT → update template
    if (event.httpMethod === 'PUT') {
      const { id, ...updates } = body;
      if (!id) return fail('ID requerido');
      delete updates.created_at; delete updates.type;
      const done = await updateById('Plantillas', id, updates);
      return done ? ok({ success: true }) : fail('Plantilla no encontrada', 404);
    }

    // DELETE → delete template
    if (event.httpMethod === 'DELETE') {
      const { id } = body;
      if (!id) return fail('ID requerido');
      const done = await deleteById('Plantillas', id);
      return done ? ok({ success: true }) : fail('Plantilla no encontrada', 404);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
