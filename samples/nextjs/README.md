# Next.js Sample

Demonstrates contentsignals with [Next.js](https://nextjs.org) using two approaches.

## Approach 1: Custom Server (`middleware.ts`)

Wraps Next.js with a custom Node.js server that applies contentsignals as middleware before handing off to Next.

```bash
npx tsx samples/nextjs/middleware.ts
```

```bash
curl -i http://localhost:3005/
curl -i -H "Accept: text/markdown" http://localhost:3005/about
```

Best for: projects that already use a custom server, or need full middleware features (on-the-fly conversion, companion files).

## Approach 2: Route Handler (`route-handler.ts`)

Uses `buildSignal`, `wantsMarkdown`, and `resolveCompanion` directly inside a Next.js App Router route handler. No custom server needed.

Copy the pattern into your project's `app/api/content/route.ts`:

```typescript
import { buildSignal, resolveCompanion, extractTokenCount } from 'contentsignals';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const signal = buildSignal(
    { search: true, aiInput: true, aiTrain: false },
    undefined,
    url.pathname,
  );

  const headers = { 'Content-Signal': signal, Vary: 'Accept' };
  const accept = request.headers.get('accept') ?? '';

  if (accept.includes('text/markdown')) {
    const companion = resolveCompanion('./public', url.pathname);
    if (companion) {
      const content = readFileSync(companion, 'utf-8');
      return new Response(content, {
        headers: { ...headers, 'Content-Type': 'text/markdown; charset=utf-8' },
      });
    }
  }

  return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html' } });
}
```

Best for: App Router projects that want Content-Signal headers without a custom server.

## Which approach should I use?

| Need | Approach |
|------|----------|
| Content-Signal headers on all pages | Custom server |
| Companion file serving | Either |
| On-the-fly HTML conversion | Custom server |
| No custom server (App Router only) | Route handler |
| Middleware-based (pages + API routes) | Custom server |
