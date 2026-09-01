#!/usr/bin/env node
/* Genera los PDF de un cartel: el A4 normal y la versión con sangrado para imprenta.

   Uso: node _pdf.js cartel-volver-a-ti.html

   El sangrado (3 mm por lado, 216x303) se añade POR FUERA: el cartel sigue
   midiendo 210x297 y solo se le pone alrededor un marco del color del papel.
   Ensanchar el cartel en su lugar haría crecer toda la tipografía con él,
   porque las medidas del diseño están en unidades de contenedor (cqw). */
const puppeteer = require('puppeteer');
const path = require('path');

const SANGRE = 3; // mm por lado, lo que pide la imprenta para recortar

async function main() {
  const archivo = process.argv[2];
  if (!archivo) {
    console.error('Uso: node _pdf.js <cartel.html>');
    process.exit(1);
  }
  const src  = path.resolve(__dirname, archivo);
  const base = path.join(__dirname, path.basename(archivo, '.html'));

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + src, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMediaType('print');

  await page.pdf({
    path: base + '.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  // El papel llena la hoja y el cartel se centra dejando el sangrado alrededor.
  await page.addStyleTag({ content: `
    @page{ size:${210 + 2 * SANGRE}mm ${297 + 2 * SANGRE}mm; margin:0 }
    html,body{ height:${297 + 2 * SANGRE}mm !important; background:#FAF2E1 !important }
    .cartel{ margin:${SANGRE}mm !important }
  ` });
  await page.pdf({
    path: base + '-sangrado.pdf',
    width: `${210 + 2 * SANGRE}mm`, height: `${297 + 2 * SANGRE}mm`,
    preferCSSPageSize: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  console.log(`${path.basename(base)}.pdf          A4, para imprimir en casa`);
  console.log(`${path.basename(base)}-sangrado.pdf ${210 + 2 * SANGRE}x${297 + 2 * SANGRE} mm, para la imprenta`);
}

main();
