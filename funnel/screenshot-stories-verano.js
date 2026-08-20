const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = `file://${__dirname}`;
const OUT  = path.join(__dirname, 'stories-verano-img');
fs.mkdirSync(OUT, { recursive: true });

// Difusión del artículo de verano. Se publican las seis seguidas, el mismo día.
const NOMBRES = [
  'verano-1-gancho.png', 'verano-2-snorkel.png', 'verano-3-fondo.png',
  'verano-4-padre.png',  'verano-5-ficha.png',   'verano-6-pregunta.png',
];

// Una página nueva por story: encadenar las 12 capturas a 2160×3840 en la misma
// pestaña agota el navegador y la última se queda colgada.
async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: 300000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  for (let i = 0; i < NOMBRES.length; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/stories-verano.html`, { waitUntil: 'load', timeout: 30000 });

    // El visor se ve reducido en pantalla; para exportar lo devolvemos a tamaño real
    // y ocultamos la interfaz de navegación y las guías de sticker.
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
    await page.evaluate(idx => go(idx), i);
    await new Promise(r => setTimeout(r, 1200));

    const wrap = await page.$('.wrap');
    await wrap.screenshot({ path: path.join(OUT, NOMBRES[i]) });
    console.log('OK', NOMBRES[i]);
    await page.close();
  }

  await browser.close();
  const n = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length;
  console.log('TOTAL', n, 'PNG en funnel/stories-verano-img/');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
