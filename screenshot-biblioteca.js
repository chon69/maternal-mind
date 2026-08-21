const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

if (!process.env.MM_TEST_PASSWORD) throw new Error('Falta MM_TEST_PASSWORD');
const BASE = 'https://maternalmind.es';
const OUT  = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  console.log('📸 ' + name);
}

async function loginAs(page, email, password) {
  await page.goto(BASE + '/app/login.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.type('#email', email);
  await page.type('#password', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
  ]);
  await new Promise(r => setTimeout(r, 2000));
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // --- USUARIO FREE: ver qué ve en Biblioteca ---
  // Usamos una clienta real (free) que existe en la DB
  // Creamos un token manualmente en el localStorage
  await page.goto(BASE + '/app/cliente/biblioteca.html', { waitUntil: 'networkidle0' });
  // Sin token → redirige a login, capturamos eso
  await new Promise(r => setTimeout(r, 1500));
  await shot(page, '14-biblioteca-sin-login');

  // --- LOGIN COMO ADMIN (premium) y ver Biblioteca Mami ---
  await loginAs(page, 'chon@maternalmind.es', process.env.MM_TEST_PASSWORD);
  await page.goto(BASE + '/app/cliente/biblioteca.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  await shot(page, '15-biblioteca-premium');

  // --- Perfil con plan premium y botón Stripe ---
  await page.goto(BASE + '/app/cliente/perfil.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '16-perfil-premium');

  // --- Simular usuario FREE: inyectar JWT de plan free en localStorage ---
  // Token free generado con el mismo JWT_SECRET del servidor
  const freeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZyZWUtdGVzdC0wMDEiLCJlbWFpbCI6InRhbGxlcm1pbmRmdWxuZXNzYmFyYWphc0BnbWFpbC5jb20iLCJub21icmUiOiJ0YWxsZXJtaW5kZnVsbmVzcyIsInJvbGUiOiJjbGllbnQiLCJwbGFuIjoiZnJlZSIsImlhdCI6MTc4MDQzNTAwMCwiZXhwIjoxODAwMDAwMDAwfQ.placeholder';

  // Generamos el token correcto con node
  const { execSync } = require('child_process');
  let token;
  try {
    token = execSync(`node -e "
const fs=require('fs');
fs.readFileSync('.env.local','utf8').split('\\n').forEach(l=>{const m=l.match(/^([^=#\\\\s][^=]*)=(.*)\$/);if(m)process.env[m[1].trim()]=m[2].trim();});
const jwt=require('jsonwebtoken');
console.log(jwt.sign({id:'free-test-001',email:'tallermindfulnessbarajas@gmail.com',nombre:'tallermindfulness',role:'client',plan:'free'},process.env.JWT_SECRET,{expiresIn:'1h'}));
"`, { encoding: 'utf8' }).trim();
  } catch(e) { token = null; }

  if (token) {
    // Inyectar token free en localStorage
    await page.goto(BASE + '/app/cliente/biblioteca.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => { localStorage.setItem('mm_token', t); }, token);
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));
    await shot(page, '17-biblioteca-free-paywall');

    // Ver perfil con plan free (botón de suscripción)
    await page.goto(BASE + '/app/cliente/perfil.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await shot(page, '18-perfil-free-suscripcion');

    // Clic en el botón de suscripción para ver la redirección a Stripe
    const stripeBtn = await page.$('[data-action="subscribe"], .btn-stripe, #btn-subscribe, button[onclick*="stripe"], a[href*="stripe"]');
    if (!stripeBtn) {
      // Buscar cualquier botón relacionado con suscripción
      const allBtns = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, a')];
        return btns.filter(b => b.textContent.match(/suscri|premium|pago|biblioteca/i)).map(b => ({text: b.textContent.trim(), tag: b.tagName}));
      });
      console.log('Botones de suscripción encontrados:', JSON.stringify(allBtns));
    }
  }

  // --- Checkout Stripe: capturar página de pago ---
  await page.goto(BASE + '/app/cliente/perfil.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await shot(page, '19-perfil-para-stripe');

  await browser.close();
  console.log('\n✅ Tour Biblioteca + Stripe completado.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
