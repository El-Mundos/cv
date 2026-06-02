import puppeteer from 'puppeteer';
import { readFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  headless: true
});

const page = await browser.newPage();
const html = readFileSync(resolve('./cv.html'), 'utf8');

await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluateHandle('document.fonts.ready');
await new Promise(r => setTimeout(r, 2000));

await page.pdf({
  path: './cv.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
  preferCSSPageSize: true
});

await browser.close();

// Update .raw as a copy of cv.html
copyFileSync('./cv.html', './cv.raw');

console.log('PDF rendered and cv.raw updated successfully');
