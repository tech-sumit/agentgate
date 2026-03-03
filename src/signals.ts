import picomatch from 'picomatch';
import type { SignalConfig } from './types.js';

/**
 * Build the Content-Signal header string for a given request path.
 * Merges default signals with the first matching per-path override.
 */
export function buildSignal(
  defaults: SignalConfig,
  overrides: Record<string, Partial<SignalConfig>> | undefined,
  path: string,
): string {
  const matched = overrides ? matchOverride(path, overrides) : undefined;
  const config = matched ? { ...defaults, ...matched } : defaults;

  const parts: string[] = [];
  if (config.search !== undefined)
    parts.push(`search=${config.search ? 'yes' : 'no'}`);
  if (config.aiInput !== undefined)
    parts.push(`ai-input=${config.aiInput ? 'yes' : 'no'}`);
  if (config.aiTrain !== undefined)
    parts.push(`ai-train=${config.aiTrain ? 'yes' : 'no'}`);

  return parts.join(', ');
}

function matchOverride(
  path: string,
  overrides: Record<string, Partial<SignalConfig>>,
): Partial<SignalConfig> | undefined {
  for (const [pattern, config] of Object.entries(overrides)) {
    if (picomatch.isMatch(path, pattern)) {
      return config;
    }
  }
  return undefined;
}
