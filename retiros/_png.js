#!/usr/bin/env node
/* Genera el PNG de una pieza cuadrada para redes a partir de su HTML.

   Uso: node _png.js img/retiro-whatsapp.html   → img/retiro-whatsapp.png (1080x1080) */
const puppeteer = require('puppeteer');
const path = require('path');

async function main() {
  const archivo = process.argv[2];
  if (!archivo) {
    console.error('Uso: node _png.js <pieza.html>');
    process.exit(1);
  }
  const src = path.resolve(__dirname, archivo);
  const png = src.replace(/\.html$/, '.png');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080 });
  await page.goto('file://' + src, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: png });
  await browser.close();
  console.log(path.relative(__dirname, png), '1080x1080');
}

main();
