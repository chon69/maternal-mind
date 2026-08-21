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

// Inyecta credenciales en localStorage antes de navegar a la página
async function gotoAs(page, url, userData, plan) {
  const token = jwt.sign({ ...userData, plan }, process.env.JWT_SECRET, { expiresIn: '2h' });
  const user  = { ...userData, plan };
  // Primero ir a about:blank para poder escribir en localStorage del dominio
  // Usamos una página del mismo dominio para que el localStorage sea válido
  await page.goto(BASE + '/app/login.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t, u) => {
    localStorage.setItem('mm_token', t);
    localStorage.setItem('mm_user', JSON.stringify(u));
  }, token, user);
  // Ahora navegar a la página objetivo (localStorage ya está puesto)
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const freeUser  = { id: 'free-test-001', email: 'ana@test.com', nombre: 'Ana', role: 'client' };
  const adminUser = { id: '3875198d-1285-48bd-a0e2-19f72bfdabf7', email: 'chon@maternalmind.es', nombre: 'Chon', role: 'admin' };

  // 1. Biblioteca como FREE → paywall
  await gotoAs(page, BASE + '/app/cliente/biblioteca.html', freeUser, 'free');
  await shot(page, '20-biblioteca-free-paywall');

  // 2. Perfil FREE → botón "Suscribirme a Biblioteca Mami"
  await gotoAs(page, BASE + '/app/cliente/perfil.html', freeUser, 'free');
  await shot(page, '21-perfil-free-boton-stripe');

  // 3. Pago exitoso (simulado: ya tiene plan premium)
  await gotoAs(page, BASE + '/app/pago-exitoso.html', adminUser, 'biblioteca_mami');
  await shot(page, '22-pago-exitoso');

  // 4. Biblioteca PREMIUM tras el pago
  await gotoAs(page, BASE + '/app/cliente/biblioteca.html', adminUser, 'biblioteca_mami');
  await shot(page, '23-biblioteca-premium-acceso');

  // 5. Generar URL real de Stripe y abrirla en el navegador del sistema
  const adminToken = jwt.sign({ ...adminUser, plan: 'free' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const resp = await page.evaluate(async (base, tok) => {
    try {
      const r = await fetch(`${base}/api/stripe-checkout`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }
      });
      return r.json();
    } catch(e) { return { error: e.message }; }
  }, BASE, adminToken);

  if (resp.url) {
    console.log('\n🔗 Stripe Checkout URL:', resp.url.substring(0, 80) + '...');
    require('child_process').execSync(`open "${resp.url}"`);
    console.log('  ↳ Abierto en tu navegador');
  } else {
    console.log('  Stripe resp:', resp);
  }

  await browser.close();
  console.log('\n✅ Capturas completadas.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
