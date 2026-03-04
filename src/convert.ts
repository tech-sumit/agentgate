import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import type { ConvertOptions } from './types.js';
import { estimateTokens } from './serve-md.js';

const _require = createRequire(import.meta.url);

/**
 * Intercept the downstream response, convert HTML to markdown on-the-fly,
 * and serve with markdown headers. Requires the optional `turndown` dependency.
 */
export function convertAndServe(
  _req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
  signal: string,
  options?: ConvertOptions,
): void {
  const originalWrite = res.write.bind(res) as typeof res.write;
  const originalEnd = res.end.bind(res) as typeof res.end;
  const originalWriteHead = res.writeHead.bind(res) as typeof res.writeHead;
  const chunks: Buffer[] = [];

  let capturedHeaders: Record<string, string | number> = {};
  let writeHeadCalled = false;
  let capturedStatus: number | undefined;
  let capturedStatusMessage: string | undefined;

  res.writeHead = function (
    statusCode: number,
    ...rest: unknown[]
  ): ServerResponse {
    capturedStatus = statusCode;
    writeHeadCalled = true;
    for (const arg of rest) {
      if (typeof arg === 'string') {
        capturedStatusMessage = arg;
      } else if (typeof arg === 'object' && arg !== null) {
        for (const [k, v] of Object.entries(
          arg as Record<string, string | number>,
        )) {
          capturedHeaders[k.toLowerCase()] = v;
        }
      }
    }
    return res;
  };

  res.write = function (chunk: unknown, ...args: unknown[]): boolean {
    if (chunk != null) {
      chunks.push(
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string),
      );
    }
    const cb = args.find((a) => typeof a === 'function') as
      | (() => void)
      | undefined;
    if (cb) cb();
    return true;
  };

  res.end = function (chunk?: unknown, ..._args: unknown[]): ServerResponse {
    if (chunk != null) {
      chunks.push(
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string),
      );
    }

    const html = Buffer.concat(chunks).toString('utf-8');
    const status = capturedStatus ?? res.statusCode;

    const contentType =
      capturedHeaders['content-type'] ?? res.getHeader('content-type');
    const isHtml =
      typeof contentType === 'string' && contentType.includes('text/html');

    if (!isHtml || !html.trim()) {
      res.writeHead = originalWriteHead;
      res.write = originalWrite;
      res.end = originalEnd;
      if (writeHeadCalled) {
        originalWriteHead(status, capturedHeaders);
      }
      return originalEnd(Buffer.concat(chunks)) as ServerResponse;
    }

    try {
      const md = htmlToMarkdown(html, options);
      const tokens = estimateTokens(md);

      const existingVary = capturedHeaders['vary'];
      const mergedVary = mergeVary(
        typeof existingVary === 'string' ? existingVary : undefined,
        'Accept',
      );

      const finalHeaders: Record<string, string | number> = {
        ...capturedHeaders,
        'content-type': 'text/markdown; charset=utf-8',
        'content-signal': signal,
        'x-markdown-tokens': String(tokens),
        vary: mergedVary,
      };
      delete finalHeaders['content-length'];

      if (capturedStatusMessage) {
        originalWriteHead(status, capturedStatusMessage, finalHeaders);
      } else {
        originalWriteHead(status, finalHeaders);
      }
      return originalEnd(md) as ServerResponse;
    } catch {
      res.writeHead = originalWriteHead;
      res.write = originalWrite;
      res.end = originalEnd;
      if (writeHeadCalled) {
        originalWriteHead(status, capturedHeaders);
      }
      return originalEnd(Buffer.concat(chunks)) as ServerResponse;
    }
  };

  next();
}

/**
 * Convert HTML to markdown using Turndown (optional dependency).
 * Applies strip/prefer selectors from config.
 */
function htmlToMarkdown(html: string, options?: ConvertOptions): string {
  let TurndownService: new (opts: Record<string, string>) => {
    use: (plugin: unknown) => void;
    remove: (tags: string[]) => void;
    turndown: (html: string) => string;
  };
  let gfm: { gfm: unknown };
  try {
    TurndownService = _require('turndown') as typeof TurndownService;
    gfm = _require('turndown-plugin-gfm') as typeof gfm;
  } catch {
    throw new Error(
      'contentsignals: on-the-fly conversion requires "turndown" and "turndown-plugin-gfm". ' +
        'Install them: npm install turndown turndown-plugin-gfm',
    );
  }

  let inputHtml = html;

  if (options?.prefer?.length) {
    const extracted = extractPreferred(html, options.prefer);
    if (extracted) inputHtml = extracted;
  }

  if (options?.strip?.length) {
    inputHtml = stripElements(inputHtml, options.strip);
  }

  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  td.use(gfm.gfm);

  td.remove(['script', 'style', 'noscript']);

  return td.turndown(inputHtml);
}

/** Extract content from preferred selectors using simple regex matching. */
function extractPreferred(html: string, selectors: string[]): string | null {
  for (const sel of selectors) {
    const tag = sel.replace(/[^a-zA-Z]/g, '') || 'div';
    const regex = new RegExp(
      `<${tag}[^>]*${sel !== tag ? sel.replace(tag, '') : ''}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
      'i',
    );
    const match = html.match(regex);
    if (match) return match[0];
  }
  return null;
}

/** Strip elements matching tag names or simple selectors. */
function stripElements(html: string, selectors: string[]): string {
  let result = html;
  for (const sel of selectors) {
    if (sel.startsWith('.') || sel.startsWith('#')) {
      const attr = sel.startsWith('.') ? 'class' : 'id';
      const value = sel.slice(1);
      const regex = new RegExp(
        `<[a-z][a-z0-9]*[^>]*${attr}="[^"]*\\b${value}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/[a-z][a-z0-9]*>`,
        'gi',
      );
      result = result.replace(regex, '');
    } else {
      const regex = new RegExp(
        `<${sel}[^>]*>[\\s\\S]*?<\\/${sel}>`,
        'gi',
      );
      result = result.replace(regex, '');
    }
  }
  return result;
}

function mergeVary(existing: string | undefined, value: string): string {
  if (!existing) return value;
  if (existing.toLowerCase().includes(value.toLowerCase())) return existing;
  return `${existing}, ${value}`;
}
