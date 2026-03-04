---
tokens: 980
title: ContentSignals — Content-Signal headers & markdown negotiation for AI agents
description: Node.js middleware that adds Content-Signal headers and serves markdown to AI agents via content negotiation.
---

# ContentSignals

Content-Signal headers and markdown content negotiation for AI agents. Like [helmet](https://helmetjs.github.io/) for security headers, but for AI agent compatibility.

## Install

```
npm install contentsignals
```

## What it does

One `app.use()` call. Three behaviors:

1. **Content-Signal Header** — Adds `Content-Signal` and `Vary: Accept` to every HTTP response, telling AI agents what they may do with your content (search, AI input/RAG, training). Based on the [Content Signals](https://contentsignals.org/) spec.

2. **Content Negotiation** — When a request includes `Accept: text/markdown`, looks for a `.html.md` companion file. If found, serves it as `text/markdown`. If not found and `convert: true`, converts HTML to markdown on-the-fly via Turndown.

3. **Token Count Header** — When serving markdown, adds `x-markdown-tokens: <count>` so agents can budget their context window.

## Quick Start

```typescript
import express from 'express';
import { contentsignals } from 'contentsignals';

const app = express();

app.use(contentsignals({
  signals: { search: true, aiInput: true, aiTrain: false },
  staticDir: './public',
  convert: true,
}));

app.use(express.static('./public'));
app.listen(3000);
```

Every response now includes:

```
Content-Signal: search=yes, ai-input=yes, ai-train=no
Vary: Accept
```

## API Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `signals` | `SignalConfig` | Yes | — | Default Content-Signal values |
| `overrides` | `Record<string, Partial<SignalConfig>>` | No | `undefined` | Per-path glob overrides |
| `staticDir` | `string` | No | `undefined` | Directory with `.html.md` companions |
| `convert` | `boolean` | No | `false` | On-the-fly HTML-to-markdown conversion |
| `convertOptions` | `ConvertOptions` | No | `undefined` | Turndown strip/prefer options |

### SignalConfig

- `search` (boolean) — Allow search indexing
- `aiInput` (boolean) — Allow RAG / grounding / generative answers
- `aiTrain` (boolean) — Allow model training

## Response Headers

| Header | Value | When |
|--------|-------|------|
| `Content-Signal` | `search=yes, ai-input=yes, ai-train=no` | Every response |
| `Vary` | `Accept` | Every response |
| `Content-Type` | `text/markdown; charset=utf-8` | Markdown responses |
| `x-markdown-tokens` | `<integer>` | Markdown responses |

## Framework Support

Works with any Node.js framework using the standard `(req, res, next)` middleware signature:

- Express
- Fastify (via @fastify/middie)
- Hono (via adapter or buildSignal directly)
- Next.js (custom server or API route middleware)
- Nuxt (server middleware)
- Koa
- Plain Node.js http.createServer

## Companion Files

Place `.html.md` files alongside HTML pages:

| Request Path | Companion Lookup |
|---|---|
| `/about` | `about.html.md` → `about.md` → `about/index.html.md` |
| `/about.html` | `about.html.md` |
| `/` | `index.html.md` |

Companions support YAML frontmatter with a `tokens` field for accurate token counting.

## Exported Utilities

| Export | Description |
|--------|-------------|
| `contentsignals(options)` | Middleware factory |
| `buildSignal(defaults, overrides, path)` | Build Content-Signal header string |
| `wantsMarkdown(req)` | Check if request accepts text/markdown |
| `resolveCompanion(staticDir, path)` | Find .html.md companion |
| `extractTokenCount(content)` | Token count from frontmatter or estimate |
| `estimateTokens(text)` | Rough estimate (~4 chars/token) |

## Links

- [GitHub](https://github.com/tech-sumit/contentsignals)
- [npm](https://www.npmjs.com/package/contentsignals)
- [Content Signals Spec](https://contentsignals.org/)

## License

MIT — by Sumit Agrawal
