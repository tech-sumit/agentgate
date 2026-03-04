import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildSignal } from './signals.js';
import { wantsMarkdown } from './negotiate.js';
import { resolveCompanion, serveMd } from './serve-md.js';
import { convertAndServe } from './convert.js';
import type { ContentSignalsOptions, Middleware } from './types.js';

export type {
  ContentSignalsOptions,
  SignalConfig,
  ConvertOptions,
  Middleware,
} from './types.js';
export { buildSignal } from './signals.js';
export { wantsMarkdown } from './negotiate.js';
export { resolveCompanion, extractTokenCount, estimateTokens } from './serve-md.js';

/**
 * Create a contentsignals middleware that adds Content-Signal headers
 * and handles Accept: text/markdown content negotiation.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { contentsignals } from 'contentsignals';
 *
 * const app = express();
 * app.use(contentsignals({
 *   signals: { search: true, aiInput: true, aiTrain: false },
 *   staticDir: './dist',
 * }));
 * app.use(express.static('./dist'));
 * ```
 */
export function contentsignals(options: ContentSignalsOptions): Middleware {
  const { signals, overrides, staticDir, convert, convertOptions } = options;

  return (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) => {
    const path = parseUrlPath(req.url);

    // 1. Set Content-Signal header on every response
    const signal = buildSignal(signals, overrides, path);
    res.setHeader('Content-Signal', signal);
    appendVary(res, 'Accept');

    // 2. If the client doesn't want markdown, pass through
    if (!wantsMarkdown(req)) {
      return next();
    }

    // 3. Try to serve a pre-built .html.md companion
    if (staticDir) {
      const mdPath = resolveCompanion(staticDir, path);
      if (mdPath) {
        return serveMd(mdPath, signal, res);
      }
    }

    // 4. Optionally convert HTML on-the-fly
    if (convert) {
      return convertAndServe(req, res, next, signal, convertOptions);
    }

    // 5. No markdown available — fall through to normal handler
    next();
  };
}

function parseUrlPath(url: string | undefined): string {
  if (!url) return '/';
  const qIdx = url.indexOf('?');
  return qIdx >= 0 ? url.slice(0, qIdx) : url;
}

function appendVary(res: ServerResponse, value: string): void {
  const existing = res.getHeader('Vary');
  if (!existing) {
    res.setHeader('Vary', value);
    return;
  }
  const current =
    typeof existing === 'string' ? existing : String(existing);
  if (!current.toLowerCase().includes(value.toLowerCase())) {
    res.setHeader('Vary', `${current}, ${value}`);
  }
}
