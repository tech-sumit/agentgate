# Plain Node.js HTTP Sample

Demonstrates agentsignal with Node.js `http.createServer` — no framework required.

## Run

```bash
cd projects/agentgate
npx tsx samples/node-http/server.ts
```

## Test

```bash
# Normal HTML
curl -i http://localhost:3001/

# Markdown companion
curl -i -H "Accept: text/markdown" http://localhost:3001/about
```

## Key Takeaway

The middleware uses the standard `(req, res, next)` signature. Wrap your handler as the `next()` callback and agentsignal handles the rest.

```typescript
const middleware = agentsignal({ signals: { ... }, staticDir: './public' });

http.createServer((req, res) => {
  middleware(req, res, () => {
    // Your normal request handler here
  });
});
```
