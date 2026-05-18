const crypto = require('crypto');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, append, updateById, deleteById } = require('../lib/sheets');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Recursos');
      rows.sort((a, b) => Number(a.modulo) - Number(b.modulo) || Number(a.orden) - Number(b.orden));
      return ok(rows);
    }

    const body = JSON.parse(event.body || '{}');

    if (event.httpMethod === 'POST') {
      const { titulo, descripcion, tipo, modulo, modulo_nombre, orden, contenido, url_archivo, duracion } = body;
      if (!titulo) return fail('El título es obligatorio');
      await append('Recursos', {
        id: crypto.randomUUID(),
        titulo, descripcion: descripcion || '', tipo: tipo || 'texto',
        modulo: modulo || '1', modulo_nombre: modulo_nombre || '',
        orden: orden || '1', contenido: contenido || '',
        url_archivo: url_archivo || '', duracion: duracion || '',
        activo: 'TRUE', created_at: new Date().toISOString(),
      });
      return ok({ success: true }, 201);
    }

    if (event.httpMethod === 'PUT') {
      const { id, ...updates } = body;
      if (!id) return fail('ID requerido');
      delete updates.created_at;
      const done = await updateById('Recursos', id, updates);
      return done ? ok({ success: true }) : fail('Recurso no encontrado', 404);
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = body;
      if (!id) return fail('ID requerido');
      const done = await deleteById('Recursos', id);
      return done ? ok({ success: true }) : fail('Recurso no encontrado', 404);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
