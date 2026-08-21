const puppeteer = require('puppeteer');
const path = require('path');

const BASE = path.join(__dirname);
const files = [
  { file: 'circulo-feed-v2.html',  w: 1080, h: 1350, out: 'circulo-feed.png' },
  { file: 'circulo-story-v2.html', w: 1080, h: 1920, out: 'circulo-story.png' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  for (const { file, w, h, out } of files) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 }); // @2x = 2160×2700 / 2160×3840
    await page.goto(`file://${path.join(BASE, file)}`, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1200)); // espera fuentes Google
    await page.screenshot({ path: path.join(BASE, out), clip: { x: 0, y: 0, width: w, height: h } });
    console.log('✅', out, `(${w}×${h} @2x)`);
    await page.close();
  }

  await browser.close();
  console.log('\nGuardadas en:', BASE);
})().catch(e => { console.error(e.message); process.exit(1); });
