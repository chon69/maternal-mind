const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const BASE = 'https://maternalmind.es';
const OUT  = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

// Load env
fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{
  const m=l.match(/^([^=#\s][^=]*)=(.*)$/);
  if(m) process.env[m[1].trim()]=m[2].trim();
});

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false });
  console.log('📸 ' + name);
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // ── PASO 1: Usuaria FREE ve Biblioteca bloqueada ──
  // Generar JWT free
  const jwt = require('jsonwebtoken');
  const freeToken = jwt.sign(
    { id: 'free-visual-test', email: 'test@free.com', nombre: 'Ana', role: 'client', plan: 'free' },
    process.env.JWT_SECRET, { expiresIn: '1h' }
  );

  await page.goto(BASE + '/app/cliente/biblioteca.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(t => localStorage.setItem('mm_token', t), freeToken);
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));
  await shot(page, '14-biblioteca-free-paywall');

  // ── PASO 2: Perfil FREE con botón de suscripción ──
  await page.goto(BASE + '/app/cliente/perfil.html', { waitUntil: 'networkidle0' });
  await page.evaluate(t => localStorage.setItem('mm_token', t), freeToken);
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '15-perfil-free-con-boton-stripe');

  // ── PASO 3: Obtener URL de checkout Stripe y abrir la página ──
  const adminToken = jwt.sign(
    { id: '3875198d-1285-48bd-a0e2-19f72bfdabf7', email: 'chon@maternalmind.es', nombre: 'Chon', role: 'admin', plan: 'free' },
    process.env.JWT_SECRET, { expiresIn: '1h' }
  );
  const resp = await page.evaluate(async (base, tok) => {
    const r = await fetch(base + '/api/stripe-checkout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }
    });
    return r.json();
  }, BASE, adminToken);

  if (resp.url) {
    console.log('  Stripe checkout URL obtenida ✓');
    await page.goto(resp.url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await shot(page, '16-stripe-checkout-page');
  }

  // ── PASO 4: Página de pago exitoso ──
  const adminTokenPremium = jwt.sign(
    { id: '3875198d-1285-48bd-a0e2-19f72bfdabf7', email: 'chon@maternalmind.es', nombre: 'Chon', role: 'admin', plan: 'biblioteca_mami' },
    process.env.JWT_SECRET, { expiresIn: '1h' }
  );
  await page.goto(BASE + '/app/pago-exitoso.html', { waitUntil: 'networkidle0' });
  await page.evaluate(t => localStorage.setItem('mm_token', t), adminTokenPremium);
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '17-pago-exitoso');

  // ── PASO 5: Biblioteca tras el pago (premium) ──
  await page.goto(BASE + '/app/cliente/biblioteca.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  await shot(page, '18-biblioteca-premium-acceso');

  await browser.close();
  console.log('\n✅ Tour flujo de pago completado.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
