# Changelog

## v1.0.0 — Initial Release (2026-03-04)

### Core library
- `agentgate()` middleware factory: composes Content-Signal headers, markdown content negotiation, companion file serving, and on-the-fly HTML-to-markdown conversion into a single `(req, res, next)` handler
- `buildSignal()`: constructs `Content-Signal` header strings from `SignalConfig` with per-path overrides via picomatch globs
- `wantsMarkdown()`: checks `Accept: text/markdown` for content negotiation
- `resolveCompanion()` + `serveCompanion()`: resolves `.html.md` companion files with token count extraction from YAML frontmatter
- `convertAndServe()`: on-the-fly HTML-to-markdown conversion via optional `turndown` dependency, with configurable element stripping and content extraction
- `appendVary()`: correctly merges `Vary` header values without duplicates

### Security
- Path traversal protection in `resolveCompanion()` — resolved paths are checked against the static directory root
- `Vary` header merging in `convertAndServe()` preserves downstream values instead of overwriting

### HTTP correctness
- `writeHead()` interceptor in `convertAndServe()` captures status code, status message, and headers for correct replay after conversion
- Status code preservation when downstream sets `res.statusCode` without calling `writeHead()`
- ESM-compatible dynamic require for optional `turndown` via `createRequire(import.meta.url)`

### Samples
- Express demo with static companions + on-the-fly conversion
- Plain Node.js HTTP server demo
- Hono framework demo
- Fastify framework demo
- Shared HTML/markdown fixture files for all samples

### Tests (45 passing)
- `signals.test.ts`: 7 tests for header construction and per-path overrides
- `negotiate.test.ts`: 7 tests for Accept header parsing
- `serve-md.test.ts`: 14 tests including path traversal prevention
- `middleware.test.ts`: 17 tests including on-the-fly conversion, status code preservation, and Vary header merging

### Build
- Dual ESM + CJS output via tsup with `.d.ts` / `.d.cts` declarations
- TypeScript strict mode, ES2022 target, Node.js >= 18
- `gray-matter` and `picomatch` as dependencies; `turndown` + `turndown-plugin-gfm` as optional
