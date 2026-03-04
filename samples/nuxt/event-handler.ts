/**
 * ContentSignals in a Nuxt 3 / Nitro event handler
 *
 * This shows how to use contentsignals utilities directly in a Nitro
 * API route / event handler without the full middleware. Copy this
 * pattern into your Nuxt 3 project's server/api/ directory.
 */

// ---- server/api/page.get.ts ----

import { buildSignal, resolveCompanion, extractTokenCount } from '../../src/index.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STATIC_DIR = join(process.cwd(), 'public');
const SIGNALS = { search: true, aiInput: true, aiTrain: false } as const;

// In a real Nuxt project, use defineEventHandler from 'h3':
//   export default defineEventHandler((event) => { ... })
//
// This standalone version mirrors that API shape.

export function handler(req: { url: string; headers: Record<string, string | undefined> }) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const signal = buildSignal(SIGNALS, undefined, pathname);

  const headers: Record<string, string> = {
    'Content-Signal': signal,
    Vary: 'Accept',
  };

  const accept = req.headers.accept ?? '';
  if (accept.includes('text/markdown')) {
    const companion = resolveCompanion(STATIC_DIR, pathname);
    if (companion) {
      const content = readFileSync(companion, 'utf-8');
      const tokens = extractTokenCount(content);
      return {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/markdown; charset=utf-8',
          'x-markdown-tokens': String(tokens),
        },
        body: content,
      };
    }
  }

  return {
    status: 200,
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
    body: '<html><body><h1>Hello from Nuxt / Nitro</h1></body></html>',
  };
}
