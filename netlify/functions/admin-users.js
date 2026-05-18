const { requireAdmin, ok, fail, preflight } = require('../lib/auth');
const { getAll, updateById, deleteById } = require('../lib/sheets');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    requireAdmin(event);
  } catch (e) {
    return fail(e.message, e.status || 403);
  }

  try {
    if (event.httpMethod === 'GET') {
      const users = await getAll('Usuarios');
      const safe = users.map(u => ({
        id: u.id, nombre: u.nombre, email: u.email,
        role: u.role, estado: u.estado, created_at: u.created_at, last_login: u.last_login,
      }));
      return ok(safe);
    }

    if (event.httpMethod === 'PUT') {
      const { id, role, estado, plan } = JSON.parse(event.body || '{}');
      if (!id) return fail('ID requerido');
      const updates = {};
      if (role)   updates.role   = role;
      if (estado) updates.estado = estado;
      if (plan)   updates.plan   = plan;
      const done = await updateById('Usuarios', id, updates);
      return done ? ok({ success: true }) : fail('Usuario no encontrado', 404);
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return fail('ID requerido');
      const done = await deleteById('Usuarios', id);
      return done ? ok({ success: true }) : fail('Usuario no encontrado', 404);
    }

    return fail('Method not allowed', 405);
  } catch (err) {
    console.error(err);
    return fail('Error interno', 500);
  }
};
