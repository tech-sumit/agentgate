import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Content-Signal values for search, ai-input, and ai-train.
 * Follows the Cloudflare Content Signals spec (contentsignals.org).
 */
export interface SignalConfig {
  /** Allow building a search index and providing search results. */
  search?: boolean;
  /** Allow real-time retrieval for AI models (RAG, grounding, generative answers). */
  aiInput?: boolean;
  /** Allow training or fine-tuning AI model weights. */
  aiTrain?: boolean;
}

/** Turndown conversion options for on-the-fly HTML-to-markdown. */
export interface ConvertOptions {
  /** HTML elements/selectors to strip entirely (e.g. 'nav', 'footer', '.ad'). */
  strip?: string[];
  /** If present, only convert content within these selectors (e.g. 'article', 'main'). */
  prefer?: string[];
}

/** Configuration for the contentsignals middleware. */
export interface ContentSignalsOptions {
  /** Default Content-Signal values applied to every response. */
  signals: SignalConfig;
  /** Per-path glob overrides for Content-Signal values. Keys are glob patterns. */
  overrides?: Record<string, Partial<SignalConfig>>;
  /** Directory containing pre-built .html.md companion files. */
  staticDir?: string;
  /** Convert HTML to markdown on-the-fly when no .md companion exists. Default: false. */
  convert?: boolean;
  /** Turndown options when `convert` is true. */
  convertOptions?: ConvertOptions;
}

export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => void;
