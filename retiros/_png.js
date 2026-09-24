#!/usr/bin/env node
/* Genera el PNG de una pieza cuadrada para redes a partir de su HTML.

   Uso: node _png.js img/retiro-whatsapp.html   → img/retiro-whatsapp.png (1080x1080)
        node _png.js img/retiro-og.html 1200x630 → img/retiro-og.jpg (1200x630) */
const puppeteer = require('puppeteer');
const path = require('path');

async function main() {
  const archivo = process.argv[2];
  if (!archivo) {
    console.error('Uso: node _png.js <pieza.html>');
    process.exit(1);
  }
  const src = path.resolve(__dirname, archivo);
  const [width, height] = (process.argv[3] || '1080x1080').split('x').map(Number);
  const png = src.replace(/\.html$/, width === height ? '.png' : '.jpg');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto('file://' + src, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: png });
  await browser.close();
  console.log(path.relative(__dirname, png), width + 'x' + height);
}

main();
