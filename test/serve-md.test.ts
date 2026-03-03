import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import {
  resolveCompanion,
  extractTokenCount,
  estimateTokens,
} from '../src/serve-md.js';

const FIXTURES = join(import.meta.dirname, '__fixtures__');

beforeAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true });
  mkdirSync(join(FIXTURES, 'blog'), { recursive: true });

  writeFileSync(
    join(FIXTURES, 'about.html.md'),
    '---\ntokens: 42\n---\n# About\n',
  );
  writeFileSync(join(FIXTURES, 'index.html.md'), '# Home\n');
  writeFileSync(join(FIXTURES, 'blog', 'post-1.html.md'), '# Post 1\n');
  writeFileSync(join(FIXTURES, 'raw.md'), '# Raw\n');
});

afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true });
});

describe('resolveCompanion', () => {
  it('resolves /about to about.html.md', () => {
    expect(resolveCompanion(FIXTURES, '/about')).toBe(
      join(FIXTURES, 'about.html.md'),
    );
  });

  it('resolves /about.html to about.html.md', () => {
    expect(resolveCompanion(FIXTURES, '/about.html')).toBe(
      join(FIXTURES, 'about.html.md'),
    );
  });

  it('resolves / to index.html.md', () => {
    const result = resolveCompanion(FIXTURES, '/');
    expect(result).toBe(join(FIXTURES, 'index.html.md'));
  });

  it('resolves /blog/post-1 to blog/post-1.html.md', () => {
    expect(resolveCompanion(FIXTURES, '/blog/post-1')).toBe(
      join(FIXTURES, 'blog', 'post-1.html.md'),
    );
  });

  it('resolves .md fallback when .html.md does not exist', () => {
    expect(resolveCompanion(FIXTURES, '/raw')).toBe(
      join(FIXTURES, 'raw.md'),
    );
  });

  it('returns null when no companion exists', () => {
    expect(resolveCompanion(FIXTURES, '/nonexistent')).toBeNull();
  });

  it('blocks path traversal via ../', () => {
    expect(resolveCompanion(FIXTURES, '/../../../etc/passwd')).toBeNull();
  });

  it('blocks path traversal via encoded segments', () => {
    expect(resolveCompanion(FIXTURES, '/..%2F..%2Fetc/passwd')).toBeNull();
  });
});

describe('extractTokenCount', () => {
  it('reads token count from YAML frontmatter', () => {
    expect(extractTokenCount('---\ntokens: 42\n---\n# Hello\n')).toBe(42);
  });

  it('estimates tokens when frontmatter has no tokens field', () => {
    const content = '---\ntitle: Test\n---\n# Hello World\n';
    const result = extractTokenCount(content);
    expect(result).toBe(Math.ceil(content.length / 4));
  });

  it('estimates tokens when no frontmatter present', () => {
    const content = '# Just markdown\nSome text here.';
    expect(extractTokenCount(content)).toBe(Math.ceil(content.length / 4));
  });
});

describe('estimateTokens', () => {
  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('a'.repeat(100))).toBe(25);
  });

  it('rounds up', () => {
    expect(estimateTokens('abc')).toBe(1);
  });

  it('handles empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});
