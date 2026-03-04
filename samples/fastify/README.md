# Fastify Sample

Demonstrates contentsignals with [Fastify](https://fastify.dev) via `@fastify/middie`.

## Install Extra Dependencies

```bash
npm install fastify @fastify/middie @fastify/static
```

## Run

```bash
cd projects/agentgate
npx tsx samples/fastify/server.ts
```

## Test

```bash
curl -i http://localhost:3003/
curl -i -H "Accept: text/markdown" http://localhost:3003/about
curl -i http://localhost:3003/api/v1/health
```

## Integration Pattern

Fastify supports Express-style middleware through `@fastify/middie`. Two lines:

```typescript
await app.register(middie);
app.use(contentsignals({ signals: { ... }, staticDir: './public' }));
```

That's it. Every Fastify response now includes Content-Signal headers, and markdown content negotiation works automatically.
