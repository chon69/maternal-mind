const express = require('express');
const path    = require('path');
const fs      = require('fs');

// Cargar .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const app = express();

// Stripe webhook needs raw body — register BEFORE express.json()
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe no configurado' });
  }
  let event;
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const { updateById } = require('./netlify/lib/sheets');

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId  = session.metadata?.user_id;
    if (userId) {
      await updateById('Usuarios', userId, { plan: 'biblioteca_mami' });
      console.log(`Plan activado: biblioteca_mami → usuario ${userId}`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub    = event.data.object;
    const email  = sub.customer_email;
    if (email) {
      const { findBy } = require('./netlify/lib/sheets');
      const user = await findBy('Usuarios', 'email', email);
      if (user) await updateById('Usuarios', user.id, { plan: 'free' });
    }
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Converts an Express req/res pair to the Netlify Lambda handler contract
function netlify(handler) {
  return async (req, res) => {
    const event = {
      httpMethod: req.method,
      headers:    req.headers,
      body:       req.body !== undefined ? JSON.stringify(req.body) : null,
      queryStringParameters: req.query,
    };
    try {
      const result = await handler(event);
      res.status(result.statusCode);
      if (result.headers) {
        Object.entries(result.headers).forEach(([k, v]) => res.set(k, v));
      }
      res.send(result.body);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
}

const fns = [
  'auth-login',
  'auth-me',
  'auth-set-password',
  'auth-change-password',
  'auth-forgot',
  'admin-chat',
  'admin-email-send',
  'admin-events',
  'admin-resources',
  'admin-seed-kit',
  'admin-upload',
  'admin-users',
  'admin-blog',
  'admin-podcast',
  'admin-community',
  'admin-messages',
  'client-events',
  'client-community',
  'client-messages',
  'client-resources',
  'client-blog',
  'client-podcast',
  'client-notion',
  'notion-biblioteca',
  'stripe-checkout',
  'submit-form',
];

for (const fn of fns) {
  const { handler } = require(`./netlify/functions/${fn}`);
  app.all(`/api/${fn}`, netlify(handler));
}

// Endpoint de diagnóstico del sheet (cabeceras reales vs esperadas)
app.get('/api/diag-sheet', async (req, res) => {
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const sheets = google.sheets({ version: 'v4', auth });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Usuarios!A1:Z1',
    });
    const actual   = result.data.values?.[0] || [];
    const expected = ['id','nombre','email','password_hash','role','estado','token_activacion','token_expiry','created_at','last_login','plan'];
    const match    = JSON.stringify(actual) === JSON.stringify(expected);
    res.json({ match, expected, actual, APP_URL: process.env.APP_URL || '(no configurado → usa localhost:3000)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint de diagnóstico de email (solo admin)
app.post('/api/test-email', async (req, res) => {
  const { to } = req.body || {};
  if (!to) return res.status(400).json({ error: 'Falta campo to' });
  try {
    const { send, activationEmail } = require('./netlify/lib/email');
    const url = (process.env.APP_URL || 'http://localhost:3000') + '/app/activar.html?token=TEST&email=' + encodeURIComponent(to);
    await send(to, '[TEST] Email de prueba Maternal Mind 🌿', activationEmail('Prueba', url));
    res.json({ success: true, message: `Email enviado a ${to}` });
  } catch (err) {
    console.error('test-email error:', err);
    res.status(500).json({ error: err.message, details: err.errors || null });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Maternal Mind → http://localhost:${PORT}`);
});
