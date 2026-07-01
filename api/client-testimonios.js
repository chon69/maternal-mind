const { getAll } = require('../lib/db');

// Lectura pública (sin auth): se usa tanto en la landing como dentro de la
// plataforma. Solo devuelve testimonios activos y campos no sensibles.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET')    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const rows = await getAll('Testimonios');
    const visibles = rows
      .filter(r => r.activo !== 'FALSE')
      .sort((a, b) => (Number(a.orden || 0) - Number(b.orden || 0)) || (new Date(b.created_at) - new Date(a.created_at)))
      .map(r => ({
        nombre: r.nombre,
        contexto: r.contexto || '',
        testimonio: r.testimonio,
        destacado: r.destacado === 'TRUE',
      }));
    return { statusCode: 200, headers: CORS, body: JSON.stringify(visibles) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Error interno' }) };
  }
};
