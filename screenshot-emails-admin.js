const fs = require('fs');
const path = require('path');

fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([^=#\s][^=]*)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
});

const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');

const BASE = 'https://maternalmind.es';
const OUT  = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const ADMIN = { id: 'admin-test', email: 'chon@maternalmind.es', nombre: 'Chon', role: 'admin', plan: 'biblioteca_mami' };

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const token = jwt.sign(ADMIN, process.env.JWT_SECRET || 'change-me-in-production', { expiresIn: '2h' });

  // Use CDP to set localStorage before page scripts run
  await page.goto(BASE + '/app/login.html', { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Set localStorage and verify it was set
  const set = await page.evaluate((t, u) => {
    localStorage.setItem('mm_token', t);
    localStorage.setItem('mm_user', JSON.stringify(u));
    return { token: localStorage.getItem('mm_token'), user: localStorage.getItem('mm_user') };
  }, token, ADMIN);
  console.log('localStorage set:', set.token ? 'token OK' : 'token MISSING', set.user ? 'user OK' : 'user MISSING');

  // Navigate to admin emails page and intercept any redirect
  await page.goto(BASE + '/app/admin/emails.html', { waitUntil: 'load', timeout: 20000 });
  console.log('Current URL after nav:', page.url());

  // If redirected to login, re-set localStorage and navigate again
  if (page.url().includes('login')) {
    console.log('Redirected to login — re-setting localStorage...');
    await page.evaluate((t, u) => {
      localStorage.setItem('mm_token', t);
      localStorage.setItem('mm_user', JSON.stringify(u));
    }, token, ADMIN);
    await page.goto(BASE + '/app/admin/emails.html', { waitUntil: 'load', timeout: 20000 });
    console.log('URL after second nav:', page.url());
  }

  await new Promise(r => setTimeout(r, 3000));

  await page.screenshot({ path: path.join(OUT, 'admin-emails-grupos.png'), fullPage: false });
  console.log('Screenshot guardado: screenshots/admin-emails-grupos.png');

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
