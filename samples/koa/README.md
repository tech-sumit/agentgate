# Koa Sample

Demonstrates contentsignals with [Koa](https://koajs.com).

## Install Extra Dependencies

```bash
npm install koa koa-static @types/koa @types/koa-static
```

## Run

```bash
npx tsx samples/koa/server.ts
```

## Test

```bash
curl -i http://localhost:3004/
curl -i -H "Accept: text/markdown" http://localhost:3004/about
curl -i http://localhost:3004/api/v1/status
```

## Integration Pattern

Koa uses `ctx` instead of raw `(req, res)`. The middleware wrapper bridges the two by passing `ctx.req` and `ctx.res` to contentsignals, then checking `ctx.res.writableEnded` — if contentsignals already sent a markdown response, set `ctx.respond = false` to prevent Koa from overwriting it.

```typescript
app.use(async (ctx, next) => {
  await new Promise<void>((resolve, reject) => {
    middleware(ctx.req, ctx.res, (err) => err ? reject(err) : resolve());
  });
  if (ctx.res.writableEnded) {
    ctx.respond = false;
    return;
  }
  await next();
});
```
