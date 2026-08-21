const puppeteer = require('puppeteer');
const path = require('path');
const fs   = require('fs');
const https = require('https');

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

function httpsGet(url, auth) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search,
      headers: { Authorization: auth } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej); req.end();
  });
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const freeUser = { id: 'free-test-001', email: 'ana@test.com', nombre: 'Ana', role: 'client' };
  const adminUser = { id: '3875198d-1285-48bd-a0e2-19f72bfdabf7', email: 'chon@maternalmind.es', nombre: 'Chon', role: 'admin' };

  // ── 1. Biblioteca FREE → paywall ──
  await page.goto(BASE + '/app/cliente/biblioteca.html', { waitUntil: 'domcontentloaded' });
  await injectUser(page, freeUser, 'free');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  await shot(page, '20-biblioteca-free-paywall');

  // ── 2. Perfil FREE → botón suscripción ──
  await page.goto(BASE + '/app/cliente/perfil.html', { waitUntil: 'domcontentloaded' });
  await injectUser(page, freeUser, 'free');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));
  await shot(page, '21-perfil-free-boton-stripe');

  // ── 3. Pago exitoso → confirmación ──
  await page.goto(BASE + '/app/pago-exitoso.html', { waitUntil: 'domcontentloaded' });
  await injectUser(page, adminUser, 'biblioteca_mami');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '22-pago-exitoso');

  // ── 4. Biblioteca PREMIUM tras el pago ──
  await page.goto(BASE + '/app/cliente/biblioteca.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  await shot(page, '23-biblioteca-premium-post-pago');

  // ── 5. Generar URL de Stripe y abrirla en el navegador real ──
  const adminToken = jwt.sign({ ...adminUser, plan: 'free' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const resp = await page.evaluate(async (base, tok) => {
    try {
      const r = await fetch(`${base}/api/stripe-checkout`, {
        method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }
      });
      return r.json();
    } catch(e) { return { error: e.message }; }
  }, BASE, adminToken);

  if (resp.url) {
    console.log('\n🔗 URL de Stripe Checkout (abriendo en navegador real):');
    console.log(resp.url);
    const { execSync } = require('child_process');
    execSync(`open "${resp.url}"`);
  }

  await browser.close();
  console.log('\n✅ Tour completado. Stripe checkout abierto en navegador.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
