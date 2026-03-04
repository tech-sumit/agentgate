/**
 * ContentSignals + Koa sample
 *
 * Koa uses its own context object, so we wrap contentsignals
 * in a Koa-compatible middleware that bridges to the Node.js
 * (req, res, next) signature.
 *
 * Run:
 *   npx tsx samples/koa/server.ts
 *
 * Test:
 *   curl -i http://localhost:3004/
 *   curl -i -H "Accept: text/markdown" http://localhost:3004/about
 *   curl -i http://localhost:3004/api/v1/status
 */
import Koa from 'koa';
import serve from 'koa-static';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentsignals } from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '..', 'shared-fixtures');

const app = new Koa();

const middleware = contentsignals({
  signals: { search: true, aiInput: true, aiTrain: false },
  overrides: {
    '/api/**': { search: false, aiInput: false, aiTrain: false },
  },
  staticDir: fixtures,
});

app.use(async (ctx, next) => {
  await new Promise<void>((resolve, reject) => {
    middleware(ctx.req, ctx.res, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });

  if (ctx.res.writableEnded) {
    ctx.respond = false;
    return;
  }

  await next();
});

app.use(serve(fixtures));

app.use(async (ctx) => {
  if (ctx.path === '/api/v1/status') {
    ctx.body = { status: 'ok' };
    return;
  }
  ctx.status = 404;
  ctx.body = 'Not Found';
});

const port = Number(process.env.PORT) || 3004;
app.listen(port, () => {
  console.log(`Koa sample listening on http://localhost:${port}`);
  console.log('');
  console.log('Try these requests:');
  console.log(`  curl -i http://localhost:${port}/`);
  console.log(`  curl -i -H "Accept: text/markdown" http://localhost:${port}/about`);
  console.log(`  curl -i http://localhost:${port}/api/v1/status`);
});
