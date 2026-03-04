/**
 * ContentSignals in a Next.js App Router API route
 *
 * This file shows how to use buildSignal and wantsMarkdown directly
 * in a Next.js Route Handler (app/api/content/route.ts) without
 * needing a custom server.
 *
 * Copy this pattern into your Next.js project's app/api/ directory.
 */

// ---- app/api/content/route.ts ----

import { buildSignal, wantsMarkdown, resolveCompanion, extractTokenCount } from '../../src/index.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STATIC_DIR = join(process.cwd(), 'public');
const SIGNALS = { search: true, aiInput: true, aiTrain: false } as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const signal = buildSignal(SIGNALS, undefined, url.pathname);

  const headers: Record<string, string> = {
    'Content-Signal': signal,
    Vary: 'Accept',
  };

  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/markdown')) {
    const companion = resolveCompanion(STATIC_DIR, url.pathname);
    if (companion) {
      const content = readFileSync(companion, 'utf-8');
      const tokens = extractTokenCount(content);
      return new Response(content, {
        headers: {
          ...headers,
          'Content-Type': 'text/markdown; charset=utf-8',
          'x-markdown-tokens': String(tokens),
        },
      });
    }
  }

  return new Response('<html><body><h1>Hello from Next.js</h1></body></html>', {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}
