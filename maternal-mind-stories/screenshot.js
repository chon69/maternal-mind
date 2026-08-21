const puppeteer = require('/Users/ascensionjorquera/Desktop/maternal-mind/node_modules/puppeteer');
const path = require('path');

async function screenshot(htmlFile, outputFile) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(htmlFile), { waitUntil: 'networkidle0', timeout: 30000 });
  // Extra wait for fonts
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: outputFile, type: 'png', fullPage: false });
  await browser.close();
  console.log('✅ ' + outputFile);
}

(async () => {
  const base = '/Users/ascensionjorquera/Desktop/maternal-mind-stories';
  await screenshot(`${base}/dia1/slide1.html`, `${base}/dia1/dia1_slide1.png`);
  await screenshot(`${base}/dia1/slide2.html`, `${base}/dia1/dia1_slide2.png`);
})();
