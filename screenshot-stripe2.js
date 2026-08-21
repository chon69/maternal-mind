const puppeteer = require('puppeteer');
const path = require('path');
const fs   = require('fs');

const BASE = 'https://maternalmind.es';
const OUT  = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{
  const m=l.match(/^([^=#\s][^=]*)=(.*)$/);
  if(m) process.env[m[1].trim()]=m[2].trim();
});
const jwt = require('jsonwebtoken');

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
  console.log('📸 ' + name);
}

async function injectUser(page, userData, plan) {
  const token = jwt.sign({ ...userData, plan }, process.env.JWT_SECRET, { expiresIn: '2h' });
  const user  = { ...userData, plan };
  await page.evaluate((t, u) => {
    localStorage.setItem('mm_token', t);
    localStorage.setItem('mm_user', JSON.stringify(u));
  }, token, user);
  return token;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const freeUser = { id: 'free-test-001', email: 'ana@test.com', nombre: 'Ana', role: 'client' };

  // ── PASO 1: Biblioteca como usuaria FREE (paywall) ──
  await page.goto(BASE + '/app/cliente/biblioteca.html', { waitUntil: 'domcontentloaded' });
  await injectUser(page, freeUser, 'free');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  await shot(page, '20-biblioteca-free-paywall');

  // ── PASO 2: Perfil FREE con botón "Suscribirme" ──
  await page.goto(BASE + '/app/cliente/perfil.html', { waitUntil: 'domcontentloaded' });
  await injectUser(page, freeUser, 'free');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));
  await shot(page, '21-perfil-free-boton-stripe');

  // ── PASO 3: Obtener URL de Stripe checkout y mostrar la página de pago ──
  const premiumUser = { id: '3875198d-1285-48bd-a0e2-19f72bfdabf7', email: 'chon@maternalmind.es', nombre: 'Chon', role: 'admin' };
  await page.goto(BASE + '/app/cliente/perfil.html', { waitUntil: 'domcontentloaded' });
  const tok = await injectUser(page, premiumUser, 'free'); // plan free para generar checkout
  const resp = await page.evaluate(async (base, t) => {
    const r = await fetch(`${base}/api/stripe-checkout`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }
    });
    return r.json();
  }, BASE, tok);

  if (resp.url) {
    console.log('  ✓ Stripe checkout URL obtenida');
    await page.goto(resp.url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await shot(page, '22-stripe-checkout-formulario-pago');
  } else {
    console.log('  ✗ Error Stripe:', resp);
  }

  // ── PASO 4: Página pago exitoso ──
  await page.goto(BASE + '/app/pago-exitoso.html', { waitUntil: 'domcontentloaded' });
  await injectUser(page, premiumUser, 'biblioteca_mami');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '23-pago-exitoso-confirmacion');

  // ── PASO 5: Biblioteca como PREMIUM tras el pago ──
  await page.goto(BASE + '/app/cliente/biblioteca.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  await shot(page, '24-biblioteca-premium-post-pago');

  await browser.close();
  console.log('\n✅ Tour completo del flujo de pago Stripe.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
