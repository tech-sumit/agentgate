import { describe, it, expect } from 'vitest';
import { buildSignal } from '../src/signals.js';

describe('buildSignal', () => {
  it('builds header from default signals', () => {
    const result = buildSignal(
      { search: true, aiInput: true, aiTrain: false },
      undefined,
      '/about',
    );
    expect(result).toBe('search=yes, ai-input=yes, ai-train=no');
  });

  it('omits undefined signal values', () => {
    const result = buildSignal({ search: true }, undefined, '/');
    expect(result).toBe('search=yes');
  });

  it('handles all-false signals', () => {
    const result = buildSignal(
      { search: false, aiInput: false, aiTrain: false },
      undefined,
      '/',
    );
    expect(result).toBe('search=no, ai-input=no, ai-train=no');
  });

  it('applies per-path overrides via glob match', () => {
    const result = buildSignal(
      { search: true, aiInput: true, aiTrain: false },
      { '/api/**': { search: false, aiInput: false, aiTrain: false } },
      '/api/v1/users',
    );
    expect(result).toBe('search=no, ai-input=no, ai-train=no');
  });

  it('uses defaults when path does not match any override', () => {
    const result = buildSignal(
      { search: true, aiInput: true, aiTrain: false },
      { '/api/**': { search: false, aiInput: false, aiTrain: false } },
      '/about',
    );
    expect(result).toBe('search=yes, ai-input=yes, ai-train=no');
  });

  it('merges overrides with defaults (partial override)', () => {
    const result = buildSignal(
      { search: true, aiInput: true, aiTrain: false },
      { '/blog/**': { aiTrain: true } },
      '/blog/my-post',
    );
    expect(result).toBe('search=yes, ai-input=yes, ai-train=yes');
  });

  it('matches first override when multiple could match', () => {
    const result = buildSignal(
      { search: true, aiInput: true, aiTrain: false },
      {
        '/blog/**': { aiTrain: true },
        '/blog/private/**': { search: false },
      },
      '/blog/private/draft',
    );
    expect(result).toBe('search=yes, ai-input=yes, ai-train=yes');
  });
});
