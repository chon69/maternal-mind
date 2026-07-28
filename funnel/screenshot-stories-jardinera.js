const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = `file://${__dirname}`;
const OUT  = path.join(__dirname, 'stories-jardinera');
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/stories-jardinera.html`, { waitUntil: 'load', timeout: 30000 });

  // El visor se ve reducido en pantalla; para exportar lo devolvemos a tamaño real
  // y quitamos el margen de la página, que si no recorta los 1080px del borde.
  await page.evaluate(() => {
    document.body.style.padding = '0';
    const v = document.querySelector('.viewer');
    v.style.transform = 'none';
    v.style.marginBottom = '0';
    v.style.maxWidth = 'none';
    v.style.width = '1080px';
    document.querySelectorAll('.hint, .pb, .nav, .solo-preview').forEach(el => { el.style.display = 'none'; });
    document.querySelector('.wrap').style.boxShadow = 'none';
  });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    const name = `story-${i + 1}.png`;
    await slides[i].screenshot({ path: path.join(OUT, name) });
    console.log('OK', name);
  }

  await browser.close();
  const n = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length;
  console.log('TOTAL', n, 'PNG en funnel/stories-jardinera/');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
