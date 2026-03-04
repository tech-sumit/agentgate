/**
 * ContentSignals + Hono sample
 *
 * Hono uses its own request/response model, so we wrap contentsignals
 * in a Hono-compatible middleware adapter.
 *
 * Run:
 *   npx tsx samples/hono/server.ts
 *
 * Test:
 *   curl -i http://localhost:3002/
 *   curl -i -H "Accept: text/markdown" http://localhost:3002/about
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentsignals } from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '..', 'shared-fixtures');

const middleware = contentsignals({
  signals: { search: true, aiInput: true, aiTrain: false },
  overrides: {
    '/api/**': { search: false, aiInput: false, aiTrain: false },
  },
  staticDir: fixtures,
});

const app = new Hono();

app.use('*', async (c, next) => {
  const { raw } = c.req;

  const nodeRes = await new Promise<Response | null>((resolve) => {
    const chunks: Buffer[] = [];
    let headersSent = false;
    let statusCode = 200;
    const headers: Record<string, string> = {};

    const fakeRes = {
      writeHead(code: number, hdrs?: Record<string, string>) {
        statusCode = code;
        if (hdrs) Object.assign(headers, hdrs);
        headersSent = true;
      },
      setHeader(name: string, value: string) { headers[name.toLowerCase()] = value; },
      getHeader(name: string) { return headers[name.toLowerCase()]; },
      removeHeader(name: string) { delete headers[name.toLowerCase()]; },
      end(chunk?: string | Buffer) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        if (headersSent || chunks.length > 0) {
          resolve(new Response(Buffer.concat(chunks), {
            status: statusCode,
            headers: new Headers(headers),
          }));
        } else {
          resolve(null);
        }
      },
    };

    middleware(
      raw as any,
      fakeRes as any,
      () => resolve(null),
    );
  });

  if (nodeRes) {
    nodeRes.headers.forEach((value, key) => c.header(key, value));
    return c.body(await nodeRes.text(), nodeRes.status as any);
  }

  const signal = c.res.headers.get('Content-Signal');
  if (!signal) {
    const { buildSignal } = await import('../../src/signals.js');
    c.header('Content-Signal', buildSignal(
      { search: true, aiInput: true, aiTrain: false },
      { '/api/**': { search: false, aiInput: false, aiTrain: false } },
      c.req.path,
    ));
    c.header('Vary', 'Accept');
  }

  await next();
});

app.get('/', (c) => c.html('<h1>Home</h1><p>Hono + ContentSignals</p>'));
app.get('/about', (c) => c.html('<h1>About</h1><p>ContentSignals middleware demo with Hono.</p>'));
app.get('/api/v1/status', (c) => c.json({ status: 'ok' }));

const port = Number(process.env.PORT) || 3002;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Hono sample listening on http://localhost:${port}`);
  console.log('');
  console.log('Try these requests:');
  console.log(`  curl -i http://localhost:${port}/`);
  console.log(`  curl -i -H "Accept: text/markdown" http://localhost:${port}/about`);
  console.log(`  curl -i http://localhost:${port}/api/v1/status`);
});
