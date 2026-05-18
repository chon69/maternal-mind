const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'mm-dev-secret-replace-in-production';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const sign = payload => jwt.sign(payload, SECRET, { expiresIn: '7d' });
const verify = token => jwt.verify(token, SECRET);

const getToken = event => {
  const h = event.headers.authorization || event.headers.Authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

const requireAuth = event => {
  const token = getToken(event);
  if (!token) throw { status: 401, message: 'No autorizado' };
  try { return verify(token); }
  catch { throw { status: 401, message: 'Sesión expirada, vuelve a iniciar sesión' }; }
};

const requireAdmin = event => {
  const user = requireAuth(event);
  if (user.role !== 'admin') throw { status: 403, message: 'Sin permisos de administrador' };
  return user;
};

const ok = (body, status = 200) => ({ statusCode: status, headers: CORS, body: JSON.stringify(body) });
const fail = (message, status = 400) => ({ statusCode: status, headers: CORS, body: JSON.stringify({ error: message }) });
const preflight = () => ({ statusCode: 204, headers: CORS, body: '' });

module.exports = { sign, verify, getToken, requireAuth, requireAdmin, ok, fail, preflight, CORS };
