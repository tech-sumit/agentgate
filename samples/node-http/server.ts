/**
 * ContentSignals + plain Node.js http sample
 *
 * Zero dependencies beyond contentsignals itself. Shows that the middleware
 * works with any (req, res, next) consumer — no Express required.
 *
 * Run:
 *   npx tsx samples/node-http/server.ts
 *
 * Test:
 *   curl -i http://localhost:3001/
 *   curl -i -H "Accept: text/markdown" http://localhost:3001/about
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentsignals } from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '..', 'shared-fixtures');

const middleware = contentsignals({
  signals: { search: true, aiInput: true, aiTrain: false },
  staticDir: fixtures,
});

const server = http.createServer((req, res) => {
  middleware(req, res, () => {
    const urlPath = (req.url ?? '/').split('?')[0];
    const filePath = urlPath === '/' ? '/index.html' : `${urlPath}.html`;
    const fullPath = join(fixtures, filePath);

    try {
      const html = readFileSync(fullPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
});

const port = Number(process.env.PORT) || 3001;
server.listen(port, () => {
  console.log(`Node.js HTTP sample listening on http://localhost:${port}`);
  console.log('');
  console.log('Try these requests:');
  console.log(`  curl -i http://localhost:${port}/`);
  console.log(`  curl -i -H "Accept: text/markdown" http://localhost:${port}/about`);
});
