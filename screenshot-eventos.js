const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = 'https://maternalmind.es';
const OUT  = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{
  const m=l.match(/^([^=#\s][^=]*)=(.*)$/); if(m) process.env[m[1].trim()]=m[2].trim();
});
const jwt = require('jsonwebtoken');

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name+'.png'), fullPage: false });
  console.log('📸', name);
}

async function gotoAs(page, url, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
  await page.goto(BASE + '/app/login.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t, u) => {
    localStorage.setItem('mm_token', t);
    localStorage.setItem('mm_user', JSON.stringify(u));
  }, token, payload);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const admin = { id: '3875198d-1285-48bd-a0e2-19f72bfdabf7', email: 'chon@maternalmind.es', nombre: 'Chon', role: 'admin', plan: 'biblioteca_mami' };
  const client = { id: 'free-test', email: 'test@test.com', nombre: 'Ana', role: 'client', plan: 'free' };

  // Panel cliente — filtros de eventos
  await gotoAs(page, BASE + '/app/cliente/eventos.html', client);
  await shot(page, '30-cliente-eventos-emojis');

  // Panel admin — tabla de eventos con badges
  await gotoAs(page, BASE + '/app/admin/eventos.html', admin);
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '31-admin-eventos-badges');

  // Admin — modal nuevo evento (selector de tipo)
  await page.click('button.btn-primary');
  await new Promise(r => setTimeout(r, 800));
  await shot(page, '32-admin-eventos-selector-tipo');

  await browser.close();
  console.log('\n✅ Capturas completadas.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
