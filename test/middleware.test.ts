import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { agentsignal } from '../src/index.js';

const FIXTURES = join(import.meta.dirname, '__fixtures_mw__');
let server: http.Server;
let convertServer: http.Server;
let baseUrl: string;
let convertBaseUrl: string;

function fetchFrom(base: string, path: string, headers: Record<string, string> = {}) {
  return new Promise<{
    status: number;
    headers: http.IncomingHttpHeaders;
    body: string;
  }>((resolve, reject) => {
    const req = http.get(`${base}${path}`, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode!, headers: res.headers, body }),
      );
    });
    req.on('error', reject);
  });
}

function fetch(path: string, headers: Record<string, string> = {}) {
  return fetchFrom(baseUrl, path, headers);
}

beforeAll(async () => {
  rmSync(FIXTURES, { recursive: true, force: true });
  mkdirSync(FIXTURES, { recursive: true });
  writeFileSync(
    join(FIXTURES, 'about.html.md'),
    '---\ntokens: 55\n---\n# About Us\n\nWe build things.\n',
  );
  writeFileSync(
    join(FIXTURES, 'index.html.md'),
    '# Home\n\nWelcome.\n',
  );

  const middleware = agentsignal({
    signals: { search: true, aiInput: true, aiTrain: false },
    overrides: {
      '/api/**': { search: false, aiInput: false, aiTrain: false },
    },
    staticDir: FIXTURES,
  });

  server = http.createServer((req, res) => {
    middleware(req, res, () => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Hello</h1></body></html>');
    });
  });

  const convertMiddleware = agentsignal({
    signals: { search: true, aiInput: true, aiTrain: false },
    convert: true,
    convertOptions: { strip: ['nav', 'footer'], prefer: ['main'] },
  });

  convertServer = http.createServer((req, res) => {
    convertMiddleware(req, res, () => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<html><body>' +
          '<nav>Skip</nav>' +
          '<main><h1>Converted</h1><p>On-the-fly.</p></main>' +
          '<footer>Strip</footer>' +
          '</body></html>',
      );
    });
  });

  await Promise.all([
    new Promise<void>((resolve) => {
      server.listen(0, () => {
        baseUrl = `http://localhost:${(server.address() as { port: number }).port}`;
        resolve();
      });
    }),
    new Promise<void>((resolve) => {
      convertServer.listen(0, () => {
        convertBaseUrl = `http://localhost:${(convertServer.address() as { port: number }).port}`;
        resolve();
      });
    }),
  ]);
});

afterAll(async () => {
  await Promise.all([
    new Promise<void>((resolve) => server.close(() => resolve())),
    new Promise<void>((resolve) => convertServer.close(() => resolve())),
  ]);
  rmSync(FIXTURES, { recursive: true, force: true });
});

describe('agentsignal middleware', () => {
  it('adds Content-Signal header to every response', async () => {
    const res = await fetch('/');
    expect(res.headers['content-signal']).toBe(
      'search=yes, ai-input=yes, ai-train=no',
    );
  });

  it('adds Vary: Accept header', async () => {
    const res = await fetch('/');
    expect(res.headers.vary).toContain('Accept');
  });

  it('serves HTML normally when no Accept: text/markdown', async () => {
    const res = await fetch('/about', { Accept: 'text/html' });
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<h1>Hello</h1>');
    expect(res.headers['content-signal']).toBe(
      'search=yes, ai-input=yes, ai-train=no',
    );
  });

  it('serves .html.md companion when Accept: text/markdown', async () => {
    const res = await fetch('/about', { Accept: 'text/markdown' });
    expect(res.headers['content-type']).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(res.body).toContain('# About Us');
    expect(res.headers['x-markdown-tokens']).toBe('55');
    expect(res.headers['content-signal']).toBe(
      'search=yes, ai-input=yes, ai-train=no',
    );
  });

  it('serves index.html.md for root path', async () => {
    const res = await fetch('/', { Accept: 'text/markdown' });
    expect(res.headers['content-type']).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(res.body).toContain('# Home');
  });

  it('falls through when no .md companion exists', async () => {
    const res = await fetch('/nonexistent', {
      Accept: 'text/markdown',
    });
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<h1>Hello</h1>');
  });

  it('applies per-path signal overrides', async () => {
    const res = await fetch('/api/v1/users');
    expect(res.headers['content-signal']).toBe(
      'search=no, ai-input=no, ai-train=no',
    );
  });

  it('estimates tokens when frontmatter has no tokens field', async () => {
    const res = await fetch('/', { Accept: 'text/markdown' });
    const tokens = parseInt(res.headers['x-markdown-tokens'] as string, 10);
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('agentsignal on-the-fly conversion', () => {
  it('converts HTML to markdown when Accept: text/markdown', async () => {
    const res = await fetchFrom(convertBaseUrl, '/', {
      Accept: 'text/markdown',
    });
    expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(res.body).toContain('# Converted');
    expect(res.body).toContain('On-the-fly.');
  });

  it('sets x-markdown-tokens on converted response', async () => {
    const res = await fetchFrom(convertBaseUrl, '/', {
      Accept: 'text/markdown',
    });
    const tokens = parseInt(res.headers['x-markdown-tokens'] as string, 10);
    expect(tokens).toBeGreaterThan(0);
  });

  it('sets Content-Signal on converted response', async () => {
    const res = await fetchFrom(convertBaseUrl, '/', {
      Accept: 'text/markdown',
    });
    expect(res.headers['content-signal']).toBe(
      'search=yes, ai-input=yes, ai-train=no',
    );
  });

  it('strips nav and footer from converted output', async () => {
    const res = await fetchFrom(convertBaseUrl, '/', {
      Accept: 'text/markdown',
    });
    expect(res.body).not.toContain('Skip');
    expect(res.body).not.toContain('Strip');
  });

  it('serves original HTML when Accept is not text/markdown', async () => {
    const res = await fetchFrom(convertBaseUrl, '/', {
      Accept: 'text/html',
    });
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<h1>Converted</h1>');
  });

  it('works when downstream uses writeHead (Bug 2 regression)', async () => {
    const res = await fetchFrom(convertBaseUrl, '/', {
      Accept: 'text/markdown',
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(res.body).not.toContain('<html>');
    expect(res.body).toContain('Converted');
  });
});

describe('agentsignal status code preservation', () => {
  let statusServer: http.Server;
  let statusBaseUrl: string;

  beforeAll(async () => {
    const mw = agentsignal({
      signals: { search: true, aiInput: true, aiTrain: false },
      convert: true,
    });

    statusServer = http.createServer((req, res) => {
      mw(req, res, () => {
        if (req.url === '/created') {
          res.writeHead(201, 'Created', { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Created</h1></body></html>');
        } else if (req.url === '/set-status') {
          res.statusCode = 202;
          res.setHeader('Content-Type', 'text/html');
          res.end('<html><body><h1>Accepted</h1></body></html>');
        } else if (req.url === '/vary-merge') {
          res.writeHead(200, {
            'Content-Type': 'text/html',
            Vary: 'Accept-Encoding',
          });
          res.end('<html><body><h1>Vary</h1></body></html>');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>OK</h1></body></html>');
        }
      });
    });

    await new Promise<void>((resolve) => {
      statusServer.listen(0, () => {
        statusBaseUrl = `http://localhost:${(statusServer.address() as { port: number }).port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => statusServer.close(() => resolve()));
  });

  it('preserves status code from writeHead', async () => {
    const res = await fetchFrom(statusBaseUrl, '/created', {
      Accept: 'text/markdown',
    });
    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(res.body).toContain('Created');
  });

  it('preserves status code from res.statusCode', async () => {
    const res = await fetchFrom(statusBaseUrl, '/set-status', {
      Accept: 'text/markdown',
    });
    expect(res.status).toBe(202);
    expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(res.body).toContain('Accepted');
  });

  it('merges Vary header instead of overwriting', async () => {
    const res = await fetchFrom(statusBaseUrl, '/vary-merge', {
      Accept: 'text/markdown',
    });
    expect(res.headers['content-type']).toBe('text/markdown; charset=utf-8');
    const vary = res.headers.vary as string;
    expect(vary).toContain('Accept-Encoding');
    expect(vary).toContain('Accept');
  });
});
