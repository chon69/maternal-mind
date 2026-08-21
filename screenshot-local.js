/**
 * Arranca el servidor Express en el mismo proceso y toma screenshots.
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs   = require('fs');

// Cargar .env.local
fs.readFileSync(path.join(__dirname,'.env.local'),'utf8').split('\n').forEach(l=>{
  const m=l.match(/^([^=#\s][^=]*)=(.*)$/); if(m) process.env[m[1].trim()]=m[2].trim();
});

// Cambiar APP_URL a localhost para esta sesión
process.env.APP_URL = 'http://localhost:3000';

const OUT = path.join(__dirname,'screenshots');
if(!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

function mkToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '2h' });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name+'.png'), fullPage: false });
  console.log('📸', name);
}

async function gotoAs(page, url, payload) {
  const token = mkToken(payload);
  // Navegar primero a una página del mismo origen para poder escribir localStorage
  await page.goto('http://localhost:3000/app/login.html', { waitUntil: 'load', timeout: 10000 });
  await page.evaluate((t, u) => {
    localStorage.setItem('mm_token', t);
    localStorage.setItem('mm_user', JSON.stringify(u));
  }, token, payload);
  await page.goto(url, { waitUntil: 'load', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  return token;
}

async function startServer() {
  return new Promise(resolve => {
    const app = require('./server'); // server.js exports nothing but binds port 3000
    // server.js calls app.listen, so we just wait for it
    setTimeout(resolve, 1500);
  });
}

async function main() {
  console.log('Iniciando servidor local...');
  // Importar y arrancar el servidor (server.js llama a app.listen internamente)
  require('./server');
  await new Promise(r => setTimeout(r, 2000));
  console.log('Servidor arrancado en http://localhost:3000\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const FREE    = { id: 'free-test', email: 'ana@test.com', nombre: 'Ana', role: 'client', plan: 'free' };
  const PREMIUM = { id: '3875198d-1285-48bd-a0e2-19f72bfdabf7', email: 'chon@maternalmind.es', nombre: 'Chon', role: 'admin', plan: 'biblioteca_mami' };

  // 1. Biblioteca FREE → paywall
  await gotoAs(page, 'http://localhost:3000/app/cliente/biblioteca.html', FREE);
  await shot(page, '20-biblioteca-free-paywall');

  // 2. Perfil FREE → botón Stripe
  await gotoAs(page, 'http://localhost:3000/app/cliente/perfil.html', FREE);
  await shot(page, '21-perfil-free-boton-stripe');

  // 3. Pago exitoso
  await gotoAs(page, 'http://localhost:3000/app/pago-exitoso.html', PREMIUM);
  await shot(page, '22-pago-exitoso');

  // 4. Biblioteca PREMIUM tras pago
  await gotoAs(page, 'http://localhost:3000/app/cliente/biblioteca.html', PREMIUM);
  await shot(page, '23-biblioteca-premium-acceso');

  // 5. Generar URL Stripe real y abrir en navegador
  const tok = mkToken({ ...PREMIUM, plan: 'free' });
  const resp = await page.evaluate(async (tok) => {
    const r = await fetch('/api/stripe-checkout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }
    });
    return r.json();
  }, tok);

  if (resp.url) {
    console.log('\n🔗 Stripe Checkout URL generada ✓');
    console.log('   Abriendo en navegador...');
    require('child_process').execSync(`open "${resp.url}"`);
  }

  await browser.close();
  console.log('\n✅ Capturas completadas. Cerrando.');
  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
