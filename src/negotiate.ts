import type { IncomingMessage } from 'node:http';

/**
 * Returns true if the request's Accept header includes text/markdown.
 * Wildcard Accept headers do NOT trigger markdown — only explicit preference.
 */
export function wantsMarkdown(req: IncomingMessage): boolean {
  const accept = req.headers.accept ?? '';
  return accept.includes('text/markdown');
}
