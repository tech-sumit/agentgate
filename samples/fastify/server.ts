/**
 * ContentSignals + Fastify sample
 *
 * Fastify supports Express-style middleware via @fastify/middie.
 * This is the simplest integration — register middie, then app.use(contentsignals()).
 *
 * Run:
 *   npx tsx samples/fastify/server.ts
 *
 * Test:
 *   curl -i http://localhost:3003/
 *   curl -i -H "Accept: text/markdown" http://localhost:3003/about
 *   curl -i http://localhost:3003/api/v1/health
 */
import Fastify from 'fastify';
import middie from '@fastify/middie';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentsignals } from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '..', 'shared-fixtures');

const app = Fastify({ logger: false });

async function start() {
  await app.register(middie);

  app.use(contentsignals({
    signals: { search: true, aiInput: true, aiTrain: false },
    overrides: {
      '/api/**': { search: false, aiInput: false, aiTrain: false },
    },
    staticDir: fixtures,
  }));

  await app.register(fastifyStatic, {
    root: fixtures,
    prefix: '/',
  });

  app.get('/api/v1/health', async () => ({ status: 'healthy' }));

  const port = Number(process.env.PORT) || 3003;
  await app.listen({ port });

  console.log(`Fastify sample listening on http://localhost:${port}`);
  console.log('');
  console.log('Try these requests:');
  console.log(`  curl -i http://localhost:${port}/`);
  console.log(`  curl -i -H "Accept: text/markdown" http://localhost:${port}/about`);
  console.log(`  curl -i http://localhost:${port}/api/v1/health`);
}

start().catch(console.error);
