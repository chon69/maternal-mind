/**
 * lib/substack.js — Puente con Substack.
 *
 * Substack no ofrece API pública ni webhooks, así que aquí hay dos piezas:
 *   1. parseSubscribersCsv(): lee el CSV que exporta Substack (Settings → Export).
 *   2. subscribe(): da de alta un email usando el mismo endpoint que su formulario
 *      embebido. Es un endpoint no documentado, por eso NUNCA debe romper el alta
 *      propia: quien lo llama ignora el fallo y sigue.
 */

const PUB_URL = (process.env.SUBSTACK_PUB_URL || '').replace(/\/+$/, '');

/** Parser CSV mínimo con soporte de comillas dobles (formato RFC 4180). */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** "ana.lopez" → "Ana Lopez". Substack no guarda el nombre de las suscriptoras gratuitas. */
function nombreDesdeEmail(email) {
  return email.split('@')[0]
    .split(/[._\-+]/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ') || 'Hola';
}

/**
 * Lee el CSV de suscriptoras y devuelve { email, nombre, created_at, activa }.
 * Tolerante con el formato: busca las columnas por nombre, no por posición,
 * porque Substack ha cambiado el orden más de una vez.
 */
function parseSubscribersCsv(text) {
  const rows = parseCsv(text).filter(r => r.some(c => c.trim() !== ''));
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const idx = (...candidatos) => headers.findIndex(h => candidatos.some(c => h.includes(c)));

  const iEmail    = idx('email address', 'email');
  const iNombre   = idx('name', 'nombre');
  const iFecha    = idx('created_at', 'subscribed', 'created');
  const iBaja     = idx('email_disabled', 'unsubscribed', 'disabled');
  if (iEmail === -1) throw new Error('El CSV no tiene columna de email. ¿Es el export de suscriptores de Substack?');

  const vistos = new Set();
  const out = [];
  for (const r of rows.slice(1)) {
    const email = (r[iEmail] || '').trim().toLowerCase();
    if (!email || !email.includes('@') || vistos.has(email)) continue;
    vistos.add(email);

    const baja = iBaja !== -1 && /^(true|1|yes)$/i.test((r[iBaja] || '').trim());
    const fecha = iFecha !== -1 ? new Date(r[iFecha]) : null;
    const nombre = (iNombre !== -1 && (r[iNombre] || '').trim()) || nombreDesdeEmail(email);

    out.push({
      email,
      nombre,
      created_at: fecha && !isNaN(fecha) ? fecha.toISOString() : new Date().toISOString(),
      activa: !baja,
    });
  }
  return out;
}

/**
 * Suscribe un email a la newsletter. Devuelve true/false; nunca lanza.
 * Si SUBSTACK_PUB_URL no está configurado, no hace nada.
 */
async function subscribe(email) {
  if (!PUB_URL) return false;
  try {
    const res = await fetch(`${PUB_URL}/api/v1/free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, first_url: PUB_URL, source: 'cover_page' }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('[substack] alta rechazada:', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[substack] alta fallida:', err.message);
    return false;
  }
}

module.exports = { parseSubscribersCsv, subscribe, nombreDesdeEmail };
