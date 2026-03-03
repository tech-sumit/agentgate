# agentgate

Content-Signal headers and markdown content negotiation for AI agents.
Like [helmet](https://helmetjs.github.io/) for security headers, but for AI agent compatibility.

```
npm install agentgate
```

## Quick Start

```typescript
import express from 'express';
import { agentgate } from 'agentgate';

const app = express();

app.use(agentgate({
  signals: { search: true, aiInput: true, aiTrain: false },
  staticDir: './public',
}));

app.use(express.static('./public'));
app.listen(3000);
```

Every response now includes:

```http
Content-Signal: search=yes, ai-input=yes, ai-train=no
Vary: Accept
```

When an AI agent sends `Accept: text/markdown`, it gets the `.html.md` companion file instead of HTML.

---

## What It Does

One `app.use()` call. Three behaviors:

### 1. Content-Signal Header (every response)

Adds `Content-Signal` and `Vary: Accept` to every HTTP response, telling AI agents what they may do with your content. Based on the [Content Signals](https://contentsignals.org/) spec.

### 2. Content Negotiation (when agent asks for markdown)

When a request includes `Accept: text/markdown`:

- Looks for a `.html.md` companion file in `staticDir`
- If found, serves it as `text/markdown; charset=utf-8`
- If not found and `convert: true`, converts the HTML response on-the-fly via Turndown
- Otherwise falls through to the normal response

### 3. Token Count Header (on markdown responses)

When serving markdown, adds `x-markdown-tokens: <count>` — read from YAML frontmatter or estimated at ~4 characters per token.

---

## API

```typescript
import { agentgate } from 'agentgate';

app.use(agentgate({
  // Content-Signal header values (required)
  signals: {
    search: true,       // allow search indexing
    aiInput: true,      // allow RAG / grounding / generative answers
    aiTrain: false,     // disallow model training
  },

  // Per-path overrides — keys are glob patterns (optional)
  overrides: {
    '/api/**':  { search: false, aiInput: false, aiTrain: false },
    '/blog/**': { aiTrain: false },
  },

  // Directory with pre-built .html.md companions (optional)
  staticDir: './public',

  // Convert HTML on-the-fly when no .md companion exists (optional, default: false)
  convert: false,

  // Turndown options when convert is true (optional)
  convertOptions: {
    strip: ['nav', 'footer', 'header', 'aside', 'script', 'style'],
    prefer: ['article', 'main'],
  },
}));
```

### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `signals` | `SignalConfig` | Yes | — | Default Content-Signal values for all responses |
| `overrides` | `Record<string, Partial<SignalConfig>>` | No | `undefined` | Per-path glob overrides |
| `staticDir` | `string` | No | `undefined` | Directory containing `.html.md` companion files |
| `convert` | `boolean` | No | `false` | Convert HTML to markdown on-the-fly when no companion exists |
| `convertOptions` | `ConvertOptions` | No | `undefined` | Turndown options for on-the-fly conversion |

### SignalConfig

| Field | Type | Description |
|-------|------|-------------|
| `search` | `boolean` | Allow building a search index and providing search results |
| `aiInput` | `boolean` | Allow real-time retrieval for AI models (RAG, grounding, generative answers) |
| `aiTrain` | `boolean` | Allow training or fine-tuning AI model weights |

### ConvertOptions

| Field | Type | Description |
|-------|------|-------------|
| `strip` | `string[]` | HTML elements/selectors to strip (e.g. `'nav'`, `'.ad'`) |
| `prefer` | `string[]` | Only convert content within these selectors (e.g. `'article'`, `'main'`) |

---

## Response Headers

| Header | Value | When |
|--------|-------|------|
| `Content-Signal` | `search=yes, ai-input=yes, ai-train=no` | Every response |
| `Vary` | `Accept` (appended to existing) | Every response |
| `Content-Type` | `text/markdown; charset=utf-8` | When serving markdown |
| `x-markdown-tokens` | `<integer>` | When serving markdown |

---

## Companion Files

Place `.html.md` files alongside your HTML pages. Agentgate resolves them by convention:

| Request Path | Companion Lookup Order |
|---|---|
| `/about` | `about.html.md` → `about.md` → `about/index.html.md` |
| `/about.html` | `about.html.md` |
| `/` | `index.html.md` |
| `/blog/post-1` | `blog/post-1.html.md` → `blog/post-1.md` → `blog/post-1/index.html.md` |

Companion files can include YAML frontmatter with a `tokens` field:

```markdown
---
tokens: 312
---
# About Us

We build things.
```

If `tokens` is missing, agentgate estimates it (~4 characters per token).

---

## Framework Integration

### Express

```typescript
import express from 'express';
import { agentgate } from 'agentgate';

const app = express();
app.use(agentgate({ signals: { search: true, aiInput: true, aiTrain: false } }));
```

### Fastify (via @fastify/middie)

```typescript
import Fastify from 'fastify';
import middie from '@fastify/middie';
import { agentgate } from 'agentgate';

const app = Fastify();
await app.register(middie);
app.use(agentgate({ signals: { search: true, aiInput: true, aiTrain: false } }));
```

### Hono (using buildSignal directly)

```typescript
import { Hono } from 'hono';
import { buildSignal } from 'agentgate';

const app = new Hono();
app.use('*', async (c, next) => {
  c.header('Content-Signal', buildSignal(
    { search: true, aiInput: true, aiTrain: false },
    undefined,
    c.req.path,
  ));
  c.header('Vary', 'Accept');
  await next();
});
```

### Plain Node.js

```typescript
import http from 'node:http';
import { agentgate } from 'agentgate';

const middleware = agentgate({
  signals: { search: true, aiInput: true, aiTrain: false },
  staticDir: './public',
});

http.createServer((req, res) => {
  middleware(req, res, () => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Hello</h1>');
  });
}).listen(3000);
```

---

## Samples

Runnable samples are in `samples/`. Each has its own README with run and test instructions.

| Sample | Framework | Port | Features Shown |
|--------|-----------|------|----------------|
| [`samples/express`](samples/express/) | Express | 3000 | All three modes: headers, companions, on-the-fly |
| [`samples/node-http`](samples/node-http/) | Plain Node.js | 3001 | Headers + companion serving, no framework |
| [`samples/hono`](samples/hono/) | Hono | 3002 | Web Standard adapter pattern |
| [`samples/fastify`](samples/fastify/) | Fastify | 3003 | @fastify/middie integration |

```bash
# Run any sample
npx tsx samples/express/server.ts

# Test it
curl -i http://localhost:3000/
curl -i -H "Accept: text/markdown" http://localhost:3000/about
```

---

## On-the-fly Conversion

When `convert: true` and no `.html.md` companion exists, agentgate converts the HTML response to markdown using [Turndown](https://github.com/mixmark-io/turndown). Install the optional dependencies:

```bash
npm install turndown turndown-plugin-gfm
```

These are listed as `optionalDependencies` — agentgate works without them if you only use companion files.

---

## FAQ

### Q: What is a Content-Signal header?

A: Content-Signal is an HTTP response header defined by the [Content Signals](https://contentsignals.org/) specification. It tells AI agents and crawlers what they may do with your content — whether they can use it for search indexing (`search`), real-time AI retrieval like RAG (`ai-input`), or model training (`ai-train`). Think of it as `robots.txt` but per-response and more granular.

### Q: What problem does agentgate solve?

A: AI agents are crawling the web, but there's no standard way to tell them "you can use this page for search answers but not for training your model." Content-Signal headers fill that gap. Agentgate makes it trivial to add these headers to any Node.js server with one `app.use()` call.

### Q: How is this different from robots.txt?

A: `robots.txt` controls whether a crawler can access a URL at all. Content-Signal headers are more granular — they're set per-response and distinguish between search, AI input (RAG/grounding), and AI training. A page might allow search and RAG but block training. You can't express that in `robots.txt`.

### Q: What is content negotiation and why does it matter for AI agents?

A: Content negotiation is an HTTP mechanism where the client says what format it prefers (via the `Accept` header) and the server responds accordingly. AI agents prefer markdown over HTML because it's cleaner, smaller, and doesn't contain layout noise. When an agent sends `Accept: text/markdown`, agentgate serves the markdown version instead of HTML.

### Q: What is a .html.md companion file?

A: It's a markdown version of an HTML page, placed alongside the original. For `about.html`, the companion is `about.html.md`. You write it once (or generate it at build time), and agentgate serves it to agents that request markdown. The companion can include YAML frontmatter with a `tokens` field for accurate token counting.

### Q: Do I need to create .html.md files for every page?

A: No. You have three options:
1. **Companion files only** — create `.html.md` files for important pages (set `staticDir`)
2. **On-the-fly conversion** — set `convert: true` and agentgate converts HTML to markdown automatically using Turndown
3. **Headers only** — skip `staticDir` and `convert`, and agentgate only adds Content-Signal headers (no markdown serving)

### Q: What is the x-markdown-tokens header?

A: It tells AI agents how many tokens the markdown response contains, so they can budget their context window before downloading. The count comes from the `tokens` field in YAML frontmatter, or is estimated at ~4 characters per token if not specified.

### Q: How do per-path overrides work?

A: Override keys are glob patterns matched via [picomatch](https://github.com/micromatch/picomatch). The first matching pattern wins. Example:

```typescript
overrides: {
  '/api/**': { search: false, aiInput: false, aiTrain: false },  // block everything for API
  '/blog/**': { aiTrain: false },  // allow search + RAG, block training for blog
}
```

If no pattern matches, the default `signals` config applies.

### Q: Does agentgate work with Next.js, Nuxt, or other meta-frameworks?

A: Agentgate is framework-agnostic — it uses the standard Node.js `(req, res, next)` signature. For Next.js, use it in a custom server or API route middleware. For Nuxt, use it as server middleware. For any framework that supports Express-style middleware, it's a single `app.use()` call.

### Q: What happens if turndown is not installed and convert is true?

A: Agentgate throws a clear error: `"agentgate: on-the-fly conversion requires turndown and turndown-plugin-gfm."` Install them with `npm install turndown turndown-plugin-gfm`. If you only use companion files, these packages are not needed.

### Q: How does on-the-fly conversion work internally?

A: Agentgate intercepts the response by monkey-patching `res.write()` and `res.end()`. It buffers the HTML output, checks that the response is `text/html`, then converts it to markdown via Turndown. The `strip` option removes unwanted elements (nav, footer, ads) and `prefer` extracts content from specific containers (article, main) before conversion.

### Q: What is the performance impact?

A: **For companion files**: near-zero overhead — a synchronous file existence check and `readFileSync`. **For on-the-fly conversion**: Turndown adds processing time proportional to HTML size. Cache the output at the application or CDN layer for production use. **For headers only**: negligible — two `setHeader` calls per request.

### Q: How do I generate .html.md companion files at build time?

A: Agentgate is a runtime middleware, not a build tool. For generating companion files, use [llmoptimizer](https://www.npmjs.com/package/llmoptimizer) or write a simple script:

```bash
for f in dist/*.html; do
  npx turndown "$f" > "${f}.md"
done
```

### Q: Is this related to Cloudflare's "Markdown for Agents" feature?

A: Yes — both implement content negotiation for AI agents. Cloudflare's feature does it at the edge for Pro+ customers. Agentgate does it at the application level for any Node.js server. If you're already on Cloudflare Pro+, you may not need agentgate for markdown serving, but you'd still use it for Content-Signal headers if Cloudflare doesn't add them automatically.

### Q: What's the bundle size?

A: ~7 KB (ESM) / ~7.3 KB (CJS) with two runtime dependencies (picomatch, gray-matter). Turndown is only loaded if `convert: true`.

### Q: Can I use agentgate with TypeScript?

A: Yes. Agentgate is written in TypeScript and ships with full type declarations. All config options have JSDoc annotations.

### Q: What Node.js versions are supported?

A: Node.js 18 and above.

---

## Exported Utilities

Beyond the main `agentgate()` middleware, these lower-level functions are exported for custom integrations:

| Export | Description |
|--------|-------------|
| `agentgate(options)` | Middleware factory — the primary API |
| `buildSignal(defaults, overrides, path)` | Build a Content-Signal header string |
| `wantsMarkdown(req)` | Check if the request accepts text/markdown |
| `resolveCompanion(staticDir, path)` | Find the .html.md companion for a path |
| `extractTokenCount(content)` | Get token count from frontmatter or estimate |
| `estimateTokens(text)` | Rough token estimate (~4 chars per token) |

---

## License

MIT

## Author

Sumit Agrawal ([mr.sumitagrawal.17@gmail.com](mailto:mr.sumitagrawal.17@gmail.com))
