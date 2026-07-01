const crypto = require('crypto');
const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, append, updateById, deleteById } = require('../lib/db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try { requireAdmin(event); }
  catch (e) { return fail(e.message, e.status || 403); }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await getAll('Testimonios');
      rows.sort((a, b) => (Number(a.orden || 0) - Number(b.orden || 0)) || (new Date(b.created_at) - new Date(a.created_at)));
      return ok(rows);
    }

    const body = JSON.parse(event.body || '{}');

    if (event.httpMethod === 'POST') {
      const { nombre, contexto, testimonio, destacado, orden } = body;
      if (!nombre?.trim())     return fail('El nombre es obligatorio');
      if (!testimonio?.trim()) return fail('El testimonio es obligatorio');
      await append('Testimonios', {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        contexto: (contexto || '').trim(),
        testimonio: testimonio.trim(),
        destacado: destacado === true || destacado === 'TRUE' ? 'TRUE' : 'FALSE',
        activo: 'TRUE',
        orden: String(Number(orden) || 0),
        created_at: new Date().toISOString(),
      });
      return ok({ success: true }, 201);
    }

    if (event.httpMethod === 'PUT') {
      const { id, ...updates } = body;
      if (!id) return fail('ID requerido');
      delete updates.created_at;
      const done = await updateById('Testimonios', id, updates);
      return done ? ok({ success: true }) : fail('Testimonio no encontrado', 404);
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = body;
      if (!id) return fail('ID requerido');
      const done = await deleteById('Testimonios', id);
      return done ? ok({ success: true }) : fail('Testimonio no encontrado', 404);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
