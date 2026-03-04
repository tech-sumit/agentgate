/**
 * ContentSignals + Nuxt 3 server middleware
 *
 * Place this file at server/middleware/contentsignals.ts in your Nuxt project.
 * Nitro will auto-register it as server middleware.
 *
 * This sample uses a standalone Node.js server for demonstration.
 *
 * Run:
 *   npx tsx samples/nuxt/server-middleware.ts
 *
 * Test:
 *   curl -i http://localhost:3006/
 *   curl -i -H "Accept: text/markdown" http://localhost:3006/about
 */
import http from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { contentsignals } from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '..', 'shared-fixtures');

const middleware = contentsignals({
  signals: { search: true, aiInput: true, aiTrain: false },
  overrides: {
    '/api/**': { search: false, aiInput: false, aiTrain: false },
  },
  staticDir: fixtures,
  convert: true,
  convertOptions: { strip: ['nav', 'footer'], prefer: ['main'] },
});

const server = http.createServer((req, res) => {
  middleware(req, res, () => {
    const url = req.url ?? '/';
    const filePath = url === '/' ? '/index.html' : `${url}.html`;
    try {
      const html = readFileSync(join(fixtures, filePath), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
});

const port = Number(process.env.PORT) || 3006;
server.listen(port, () => {
  console.log(`Nuxt-style server middleware listening on http://localhost:${port}`);
  console.log('');
  console.log('Try these requests:');
  console.log(`  curl -i http://localhost:${port}/`);
  console.log(`  curl -i -H "Accept: text/markdown" http://localhost:${port}/about`);
});
