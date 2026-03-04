/**
 * ContentSignals + Next.js sample (custom server)
 *
 * Next.js doesn't expose raw (req, res, next) in its App Router,
 * so this sample uses a custom server that wraps Next.js with
 * contentsignals middleware.
 *
 * For App Router projects without a custom server, use the
 * route handler approach shown in route-handler.ts.
 *
 * Run:
 *   npx tsx samples/nextjs/middleware.ts
 *
 * Test:
 *   curl -i http://localhost:3005/
 *   curl -i -H "Accept: text/markdown" http://localhost:3005/about
 */
import http from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentsignals, buildSignal, wantsMarkdown, resolveCompanion, extractTokenCount } from '../../src/index.js';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '..', 'shared-fixtures');

const middleware = contentsignals({
  signals: { search: true, aiInput: true, aiTrain: false },
  staticDir: fixtures,
});

const server = http.createServer((req, res) => {
  middleware(req, res, () => {
    const url = req.url ?? '/';
    if (url === '/api/signal') {
      const signal = buildSignal(
        { search: true, aiInput: true, aiTrain: false },
        undefined,
        url,
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ signal }));
      return;
    }

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

const port = Number(process.env.PORT) || 3005;
server.listen(port, () => {
  console.log(`Next.js-style custom server listening on http://localhost:${port}`);
  console.log('');
  console.log('This demonstrates how contentsignals works with a Next.js custom server.');
  console.log('For App Router projects, see route-handler.ts for the API route approach.');
  console.log('');
  console.log('Try these requests:');
  console.log(`  curl -i http://localhost:${port}/`);
  console.log(`  curl -i -H "Accept: text/markdown" http://localhost:${port}/about`);
  console.log(`  curl -i http://localhost:${port}/api/signal`);
});
