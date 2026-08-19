const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = `file://${__dirname}`;
const OUT  = path.join(__dirname, 'jardinera-img');
fs.mkdirSync(OUT, { recursive: true });

const carruseles = [
  { file: 'carrusel-jardinera-1.html', prefix: 'jardinera1', slides: 5 },
  { file: 'carrusel-jardinera-2.html', prefix: 'jardinera2', slides: 5 },
  { file: 'carrusel-jardinera-3.html', prefix: 'jardinera3', slides: 5 },
  { file: 'carrusel-jardinera-4.html', prefix: 'jardinera4', slides: 5 },
];

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  for (const c of carruseles) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/${c.file}`, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));

    for (let i = 0; i < c.slides; i++) {
      await page.evaluate(idx => { if (typeof go === 'function') go(idx); }, i);
      await new Promise(r => setTimeout(r, 400));
      const el = await page.$('.wrap');
      const name = `${c.prefix}-s${i + 1}.png`;
      await el.screenshot({ path: path.join(OUT, name) });
      console.log('OK', name);
    }
    await page.close();
  }

  await browser.close();
  const n = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length;
  console.log('TOTAL', n, 'PNG en funnel/jardinera-img/');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
