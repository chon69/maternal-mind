const crypto = require('crypto');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, append, updateById, deleteById } = require('../lib/db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Podcast');
      rows.sort((a, b) => Number(b.numero_episodio || 0) - Number(a.numero_episodio || 0));
      return ok(rows);
    }

    const body = JSON.parse(event.body || '{}');

    if (event.httpMethod === 'POST') {
      const { titulo, descripcion, numero_episodio, temporada, url_spotify, url_apple, url_ivoox, imagen_url } = body;
      if (!titulo) return fail('El título es obligatorio');
      await append('Podcast', {
        id: crypto.randomUUID(),
        titulo,
        descripcion: descripcion || '',
        numero_episodio: numero_episodio || '',
        temporada: temporada || '1',
        url_spotify: url_spotify || '',
        url_apple: url_apple || '',
        url_ivoox: url_ivoox || '',
        imagen_url: imagen_url || '',
        activo: 'TRUE',
        created_at: new Date().toISOString(),
      });
      return ok({ success: true }, 201);
    }

    if (event.httpMethod === 'PUT') {
      const { id, ...updates } = body;
      if (!id) return fail('ID requerido');
      delete updates.created_at;
      const done = await updateById('Podcast', id, updates);
      return done ? ok({ success: true }) : fail('Episodio no encontrado', 404);
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = body;
      if (!id) return fail('ID requerido');
      const done = await deleteById('Podcast', id);
      return done ? ok({ success: true }) : fail('Episodio no encontrado', 404);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
