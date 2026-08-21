const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = `file://${__dirname}`;
const OUT  = path.join(__dirname, 'previews');
fs.mkdirSync(OUT, { recursive: true });

const visuals = [
  { file: 'quote-quien-cuida.html',      out: '1-quote',           w:1080, h:1080, sel:'.canvas' },
  { file: 'carrusel-nadie-te-conto.html', out: '2-carrusel-s1',    w:1080, h:1080, sel:'.slide:nth-child(1)', slide:0 },
  { file: 'carrusel-nadie-te-conto.html', out: '2-carrusel-s2',    w:1080, h:1080, sel:'.slide:nth-child(2)', slide:1 },
  { file: 'carrusel-nadie-te-conto.html', out: '2-carrusel-s6',    w:1080, h:1080, sel:'.slide:nth-child(6)', slide:5 },
  { file: 'reel-nadie-te-dijo.html',      out: '3-reel-f1',        w:540,  h:960,  sel:'.frame:nth-child(1)', frame:0 },
  { file: 'reel-nadie-te-dijo.html',      out: '3-reel-f2',        w:540,  h:960,  sel:'.frame:nth-child(2)', frame:1 },
  { file: 'reel-nadie-te-dijo.html',      out: '3-reel-f5',        w:540,  h:960,  sel:'.frame:nth-child(5)', frame:4 },
  { file: 'reel-nadie-te-dijo.html',      out: '3-reel-f6',        w:540,  h:960,  sel:'.frame:nth-child(6)', frame:5 },
  { file: 'story-pregunta-2.html',        out: '4-story-pregunta', w:540,  h:960,  sel:'.story' },
  { file: 'story-respuesta-cta.html',     out: '4-story-cta',      w:540,  h:960,  sel:'.story' },
];

async function main() {
  const browser = await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });

  for (const v of visuals) {
    const page = await browser.newPage();
    await page.setViewport({ width: v.w + 200, height: v.h + 200, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/${v.file}`, { waitUntil:'networkidle0', timeout:15000 });
    await new Promise(r => setTimeout(r, 1400));

    if (v.slide !== undefined) {
      await page.evaluate(i => { if(typeof go==='function') go(i); }, v.slide);
      await new Promise(r => setTimeout(r, 500));
    }
    if (v.frame !== undefined) {
      await page.evaluate(i => { if(typeof goF==='function') goF(i); }, v.frame);
      await new Promise(r => setTimeout(r, 500));
    }

    const el = await page.$(v.sel);
    if (el) {
      await el.screenshot({ path: path.join(OUT, v.out+'.png') });
      console.log('📸', v.out);
    } else {
      await page.screenshot({ path: path.join(OUT, v.out+'.png'), clip:{x:0,y:0,width:v.w,height:v.h} });
      console.log('📸 (clip)', v.out);
    }
    await page.close();
  }

  await browser.close();
  console.log('\n✅ Listo en campana/semana1/previews/');
}

main().catch(e => { console.error(e.message); process.exit(1); });
