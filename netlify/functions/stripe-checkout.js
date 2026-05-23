const https  = require('https');
const qs     = require('querystring');
const { requireAuth, ok, fail, preflight } = require('../lib/auth');

function stripePost(path, params, secretKey) {
  return new Promise((resolve, reject) => {
    const body = qs.stringify(params);
    const opts = {
      hostname: 'api.stripe.com',
      path,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Method not allowed', 405);

  let user;
  try { user = requireAuth(event); }
  catch (e) { return fail(e.message, e.status || 401); }

  const KEY      = (process.env.STRIPE_SECRET_KEY  || '').trim();
  const PRICE_ID = (process.env.STRIPE_PRICE_ID    || '').trim();
  const APP_URL  = process.env.APP_URL || 'http://localhost:3000';

  if (!KEY || !PRICE_ID) {
    return fail('Stripe no configurado', 503);
  }

  try {
    const res = await stripePost('/v1/checkout/sessions', {
      mode: 'subscription',
      'line_items[0][price]': PRICE_ID,
      'line_items[0][quantity]': '1',
      customer_email: user.email,
      'metadata[user_id]': user.id,
      success_url: `${APP_URL}/app/pago-exitoso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/app/cliente/perfil.html`,
      locale: 'es',
    }, KEY);

    if (res.status !== 200) {
      console.error('Stripe API error:', res.body);
      return fail(res.body?.error?.message || 'Error al crear sesión de pago', 500);
    }

    return ok({ url: res.body.url });
  } catch (err) {
    console.error('Stripe connection error:', err.message);
    return fail('Error de conexión: ' + err.message, 500);
  }
};
