import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFile, copyFile } from 'fs/promises';
import { extname, join, normalize } from 'path';

const ROOT = process.cwd();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

// Minimal static file server rooted at the repo, so Puppeteer can resolve the
// relative font/photo paths in cv.html the same way a browser would.
const server = createServer(async (req, res) => {
  // Strip query string and prevent path traversal outside ROOT.
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = normalize(join(ROOT, urlPath === '/' ? '/cv.html' : urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

// Listen on an ephemeral port to avoid clashing with anything already running.
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  headless: true,
});

try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/cv.html`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 2000));

  await page.pdf({
    path: './cv.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    preferCSSPageSize: true,
  });
} finally {
  await browser.close();
  server.close();
}

// Update .raw as a copy of cv.html
await copyFile('./cv.html', './cv.raw');

console.log('PDF rendered and cv.raw updated successfully');
