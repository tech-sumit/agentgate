/**
 * AgentGate + Express sample
 *
 * Demonstrates all three modes:
 *   1. Content-Signal headers on every response
 *   2. Pre-built .html.md companion serving
 *   3. On-the-fly HTML-to-markdown conversion (fallback)
 *
 * Run:
 *   npx tsx samples/express/server.ts
 *
 * Test:
 *   # Normal HTML request
 *   curl -i http://localhost:3000/
 *
 *   # Markdown request (serves companion .html.md)
 *   curl -i -H "Accept: text/markdown" http://localhost:3000/about
 *
 *   # Markdown request with on-the-fly conversion (no companion exists)
 *   curl -i -H "Accept: text/markdown" http://localhost:3000/dynamic
 *
 *   # API route (all signals blocked)
 *   curl -i http://localhost:3000/api/v1/users
 */
import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentgate } from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, '..', 'shared-fixtures');

const app = express();

app.use(agentgate({
  signals: { search: true, aiInput: true, aiTrain: false },

  overrides: {
    '/api/**': { search: false, aiInput: false, aiTrain: false },
    '/blog/**': { aiTrain: false },
  },

  staticDir: fixtures,

  convert: true,
  convertOptions: {
    strip: ['nav', 'footer'],
    prefer: ['article', 'main'],
  },
}));

app.use(express.static(fixtures));

app.get('/dynamic', (_req, res) => {
  res.type('html').send(`
    <html><body>
      <nav><a href="/">Skip me</a></nav>
      <main>
        <h1>Dynamic Page</h1>
        <p>This page has no .html.md companion. AgentGate converts it on-the-fly.</p>
      </main>
      <footer>Strip me too</footer>
    </body></html>
  `);
});

app.get('/api/v1/users', (_req, res) => {
  res.json([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Express sample listening on http://localhost:${port}`);
  console.log('');
  console.log('Try these requests:');
  console.log(`  curl -i http://localhost:${port}/`);
  console.log(`  curl -i -H "Accept: text/markdown" http://localhost:${port}/about`);
  console.log(`  curl -i -H "Accept: text/markdown" http://localhost:${port}/dynamic`);
  console.log(`  curl -i http://localhost:${port}/api/v1/users`);
});
