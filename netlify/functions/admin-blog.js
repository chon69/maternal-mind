const crypto = require('crypto');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, append, updateById, deleteById } = require('../lib/sheets');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Articulos');
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return ok(rows);
    }

    const body = JSON.parse(event.body || '{}');

    if (event.httpMethod === 'POST') {
      const { titulo, slug, descripcion, contenido_html, imagen_url, categoria } = body;
      if (!titulo) return fail('El título es obligatorio');
      const safeSlug = slug || titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await append('Articulos', {
        id: crypto.randomUUID(),
        titulo,
        slug: safeSlug,
        descripcion: descripcion || '',
        contenido_html: contenido_html || '',
        imagen_url: imagen_url || '',
        categoria: categoria || 'general',
        activo: 'TRUE',
        created_at: new Date().toISOString(),
      });
      return ok({ success: true }, 201);
    }

    if (event.httpMethod === 'PUT') {
      const { id, ...updates } = body;
      if (!id) return fail('ID requerido');
      delete updates.created_at;
      const done = await updateById('Articulos', id, updates);
      return done ? ok({ success: true }) : fail('Artículo no encontrado', 404);
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = body;
      if (!id) return fail('ID requerido');
      const done = await deleteById('Articulos', id);
      return done ? ok({ success: true }) : fail('Artículo no encontrado', 404);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
