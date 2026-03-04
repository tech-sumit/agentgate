import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import type { ServerResponse } from 'node:http';
import matter from 'gray-matter';

/**
 * Resolve the .html.md companion file for a request path.
 * Tries multiple conventions in order:
 *   /about       → about.html.md, about.md, about/index.html.md
 *   /about.html  → about.html.md
 *   /blog/post-1 → blog/post-1.html.md, blog/post-1.md, blog/post-1/index.html.md
 */
export function resolveCompanion(
  staticDir: string,
  requestPath: string,
): string | null {
  const cleaned = requestPath === '/' ? 'index' : requestPath.replace(/^\/+/, '');
  const ext = extname(cleaned);
  const root = resolve(staticDir);
  const rootPrefix = root.endsWith(sep) ? root : root + sep;

  const candidates: string[] = [];

  if (ext === '.html') {
    candidates.push(join(root, cleaned + '.md'));
  } else {
    candidates.push(
      join(root, cleaned + '.html.md'),
      join(root, cleaned + '.md'),
      join(root, cleaned, 'index.html.md'),
    );
  }

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (!resolved.startsWith(rootPrefix) && resolved !== root) continue;
    if (existsSync(resolved)) return resolved;
  }
  return null;
}

/**
 * Serve a markdown companion file with proper headers.
 */
export function serveMd(
  mdPath: string,
  signal: string,
  res: ServerResponse,
): void {
  const raw = readFileSync(mdPath, 'utf-8');
  const tokens = extractTokenCount(raw);

  res.writeHead(200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Content-Signal': signal,
    'x-markdown-tokens': String(tokens),
    Vary: 'Accept',
  });
  res.end(raw);
}

/**
 * Extract token count from YAML frontmatter, or estimate from content length.
 * Frontmatter field: `tokens: <number>`
 * Estimation heuristic: ~4 characters per token (GPT-4 cl100k_base average).
 */
export function extractTokenCount(content: string): number {
  try {
    const { data } = matter(content);
    if (typeof data.tokens === 'number' && data.tokens > 0) {
      return data.tokens;
    }
  } catch {
    // Malformed frontmatter — fall through to estimation
  }
  return estimateTokens(content);
}

/** Rough token estimate: ~4 characters per token. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
