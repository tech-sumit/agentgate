# Nuxt 3 Sample

Demonstrates contentsignals with [Nuxt 3](https://nuxt.com) (Nitro server engine) using two approaches.

## Approach 1: Server Middleware (`server-middleware.ts`)

Nuxt 3 / Nitro auto-discovers files in `server/middleware/`. Place a contentsignals middleware there and it runs before every request.

In your Nuxt project, create `server/middleware/contentsignals.ts`:

```typescript
import { contentsignals } from 'contentsignals';
import { join } from 'node:path';

const middleware = contentsignals({
  signals: { search: true, aiInput: true, aiTrain: false },
  staticDir: join(process.cwd(), 'public'),
  convert: true,
});

export default defineEventHandler((event) => {
  return new Promise<void>((resolve, reject) => {
    middleware(event.node.req, event.node.res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});
```

### Demo (standalone)

```bash
npx tsx samples/nuxt/server-middleware.ts
```

```bash
curl -i http://localhost:3006/
curl -i -H "Accept: text/markdown" http://localhost:3006/about
```

## Approach 2: Event Handler (`event-handler.ts`)

Use `buildSignal`, `resolveCompanion`, and `extractTokenCount` directly inside a Nitro event handler for fine-grained control.

```typescript
import { buildSignal, resolveCompanion, extractTokenCount } from 'contentsignals';

export default defineEventHandler((event) => {
  const signal = buildSignal(
    { search: true, aiInput: true, aiTrain: false },
    undefined,
    event.path,
  );

  setResponseHeader(event, 'Content-Signal', signal);
  setResponseHeader(event, 'Vary', 'Accept');

  const accept = getRequestHeader(event, 'accept') ?? '';
  if (accept.includes('text/markdown')) {
    const companion = resolveCompanion('./public', event.path);
    if (companion) {
      const content = readFileSync(companion, 'utf-8');
      setResponseHeader(event, 'Content-Type', 'text/markdown; charset=utf-8');
      return content;
    }
  }

  return '<h1>Hello</h1>';
});
```

## Which approach should I use?

| Need | Approach |
|------|----------|
| Content-Signal on all routes | Server middleware |
| Companion file serving | Either |
| On-the-fly conversion | Server middleware |
| Selective per-route control | Event handler |
