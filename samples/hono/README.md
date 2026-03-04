# Hono Sample

Demonstrates agentsignal with the [Hono](https://hono.dev) framework using `@hono/node-server`.

## Install Extra Dependencies

```bash
npm install hono @hono/node-server
```

## Run

```bash
cd projects/agentgate
npx tsx samples/hono/server.ts
```

## Test

```bash
curl -i http://localhost:3002/
curl -i -H "Accept: text/markdown" http://localhost:3002/about
curl -i http://localhost:3002/api/v1/status
```

## Integration Pattern

Hono uses Web Standard Request/Response, not Node.js `IncomingMessage`/`ServerResponse`. The sample wraps agentsignal in a Hono middleware that creates a shim between the two models.

For simpler setups, you can also use `buildSignal()` directly:

```typescript
import { buildSignal, wantsMarkdown } from 'agentsignal';

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
