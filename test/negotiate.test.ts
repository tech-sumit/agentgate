import { describe, it, expect } from 'vitest';
import { wantsMarkdown } from '../src/negotiate.js';
import type { IncomingMessage } from 'node:http';

function fakeReq(accept?: string): IncomingMessage {
  return { headers: { accept } } as IncomingMessage;
}

describe('wantsMarkdown', () => {
  it('returns true when Accept includes text/markdown', () => {
    expect(wantsMarkdown(fakeReq('text/markdown'))).toBe(true);
  });

  it('returns true when text/markdown is among multiple types', () => {
    expect(wantsMarkdown(fakeReq('text/html, text/markdown'))).toBe(true);
  });

  it('returns true with quality values', () => {
    expect(
      wantsMarkdown(fakeReq('text/markdown;q=0.9, text/html;q=1.0')),
    ).toBe(true);
  });

  it('returns false for plain text/html', () => {
    expect(wantsMarkdown(fakeReq('text/html'))).toBe(false);
  });

  it('returns false for wildcard accept', () => {
    expect(wantsMarkdown(fakeReq('*/*'))).toBe(false);
  });

  it('returns false when accept header is missing', () => {
    expect(wantsMarkdown(fakeReq(undefined))).toBe(false);
  });

  it('returns false for empty accept header', () => {
    expect(wantsMarkdown(fakeReq(''))).toBe(false);
  });
});
