const crypto = require('crypto');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, append, updateById, deleteById } = require('../lib/sheets');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Eventos');
      rows.sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
      return ok(rows);
    }

    const body = JSON.parse(event.body || '{}');

    if (event.httpMethod === 'POST') {
      const { titulo, descripcion, tipo, fecha_inicio, fecha_fin, precio, moneda, url_inscripcion, imagen_url, destacado } = body;
      if (!titulo) return fail('El título es obligatorio');
      await append('Eventos', {
        id: crypto.randomUUID(),
        titulo, descripcion: descripcion || '',
        tipo: tipo || 'taller',
        fecha_inicio: fecha_inicio || '',
        fecha_fin: fecha_fin || '',
        precio: precio || '0',
        moneda: moneda || 'EUR',
        url_inscripcion: url_inscripcion || '',
        imagen_url: imagen_url || '',
        activo: 'TRUE',
        destacado: destacado ? 'TRUE' : 'FALSE',
        created_at: new Date().toISOString(),
      });
      return ok({ success: true }, 201);
    }

    if (event.httpMethod === 'PUT') {
      const { id, ...updates } = body;
      if (!id) return fail('ID requerido');
      delete updates.created_at;
      const done = await updateById('Eventos', id, updates);
      return done ? ok({ success: true }) : fail('Evento no encontrado', 404);
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = body;
      if (!id) return fail('ID requerido');
      const done = await deleteById('Eventos', id);
      return done ? ok({ success: true }) : fail('Evento no encontrado', 404);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
