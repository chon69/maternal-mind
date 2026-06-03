const crypto = require('crypto');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, append, updateById, deleteById } = require('../lib/db');

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
      const { titulo, descripcion, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, precio, moneda, url_inscripcion, imagen_url, imagen_posicion, destacado } = body;
      if (!titulo) return fail('El título es obligatorio');
      await append('Eventos', {
        id: crypto.randomUUID(),
        titulo,
        descripcion:     descripcion || '',
        tipo:            tipo || 'taller',
        fecha_inicio:    fecha_inicio || null,
        fecha_fin:       fecha_fin    || null,
        hora_inicio:     hora_inicio  || '',
        hora_fin:        hora_fin     || '',
        precio:          precio       || '0',
        moneda:          moneda       || 'EUR',
        url_inscripcion: url_inscripcion || '',
        imagen_url:      imagen_url   || '',
        imagen_posicion: imagen_posicion || 'center',
        activo:          true,
        destacado:       destacado === true || destacado === 'TRUE',
        created_at:      new Date().toISOString(),
      });
      return ok({ success: true }, 201);
    }

    if (event.httpMethod === 'PUT') {
      const { id, ...updates } = body;
      if (!id) return fail('ID requerido');
      delete updates.created_at;
      // Convertir fechas vacías a null para columnas DATE de PostgreSQL
      if ('fecha_inicio' in updates) updates.fecha_inicio = updates.fecha_inicio || null;
      if ('fecha_fin'    in updates) updates.fecha_fin    = updates.fecha_fin    || null;
      // Normalizar booleanos que llegan como strings desde el formulario
      if ('activo'    in updates) updates.activo    = updates.activo    === true || updates.activo    === 'TRUE';
      if ('destacado' in updates) updates.destacado = updates.destacado === true || updates.destacado === 'TRUE';
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
