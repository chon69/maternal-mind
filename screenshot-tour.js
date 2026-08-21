const puppeteer = require('puppeteer');
const path = require('path');

if (!process.env.MM_TEST_PASSWORD) throw new Error('Falta MM_TEST_PASSWORD');
const BASE = 'https://maternalmind.es';
const OUT  = path.join(__dirname, 'screenshots');
const fs   = require('fs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  console.log('📸 ' + name);
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Landing
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await shot(page, '01-landing');

  // 2. Login page
  await page.goto(BASE + '/app/login.html', { waitUntil: 'networkidle0' });
  await shot(page, '02-login');

  // 3. Login as admin
  await page.type('#email', 'chon@maternalmind.es');
  await page.type('#password', process.env.MM_TEST_PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
  ]);
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '03-post-login');

  // 4. Admin panel
  await page.goto(BASE + '/app/admin/index.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '04-admin-dashboard');

  // 5. Admin eventos
  await page.goto(BASE + '/app/admin/eventos.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '05-admin-eventos');

  // 6. Admin blog
  await page.goto(BASE + '/app/admin/blog.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '06-admin-blog');

  // 7. Admin usuarios
  await page.goto(BASE + '/app/admin/usuarios.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '07-admin-usuarios');

  // 8. Admin podcast
  await page.goto(BASE + '/app/admin/podcast.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '08-admin-podcast');

  // 9. Cliente panel
  await page.goto(BASE + '/app/cliente/index.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '09-cliente-inicio');

  // 10. Cliente blog
  await page.goto(BASE + '/app/cliente/blog.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '10-cliente-blog');

  // 11. Cliente eventos
  await page.goto(BASE + '/app/cliente/eventos.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '11-cliente-eventos');

  // 12. Cliente podcast
  await page.goto(BASE + '/app/cliente/podcast.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '12-cliente-podcast');

  // 13. Cliente perfil
  await page.goto(BASE + '/app/cliente/perfil.html', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '13-cliente-perfil');

  await browser.close();
  console.log('\n✅ Tour completo. Screenshots en ./screenshots/');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
