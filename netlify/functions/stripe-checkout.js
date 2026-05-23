const { requireAuth, ok, fail, preflight } = require('../lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Method not allowed', 405);

  let user;
  try { user = requireAuth(event); }
  catch (e) { return fail(e.message, e.status || 401); }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return fail('Stripe no configurado. Añade STRIPE_SECRET_KEY y STRIPE_PRICE_ID al .env.local', 503);
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 0,
    timeout: 15000,
  });
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: user.email,
      metadata: { user_id: user.id },
      success_url: `${APP_URL}/app/pago-exitoso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/app/cliente/perfil.html`,
      locale: 'es',
    });
    return ok({ url: session.url });
  } catch (err) {
    console.error('Stripe error type:', err.type);
    console.error('Stripe error code:', err.code);
    console.error('Stripe error:', err.message);
    return fail(`Error Stripe [${err.type||'unknown'}]: ${err.message}`, 500);
  }
};
