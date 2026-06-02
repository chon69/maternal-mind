const { requireAuth, ok, fail, preflight } = require('../lib/auth');
const { findBy } = require('../lib/db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const decoded = requireAuth(event);
    const user = await findBy('Usuarios', 'id', decoded.id);
    if (!user || user.estado !== 'activo') return fail('Usuario no encontrado', 404);
    return ok({ id: user.id, nombre: user.nombre, email: user.email, role: user.role, plan: user.plan || 'free', created_at: user.created_at });
  } catch (err) {
    if (err.status) return fail(err.message, err.status);
    console.error(err);
    return fail('Error interno', 500);
  }
};
