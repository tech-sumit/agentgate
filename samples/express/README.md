# Express Sample

Demonstrates agentsignal with Express.js, using all three features:
- Content-Signal headers on every response
- Pre-built `.html.md` companion serving
- On-the-fly HTML-to-markdown conversion for pages without companions

## Run

```bash
cd projects/agentgate
npx tsx samples/express/server.ts
```

## Test

```bash
# HTML response — note the Content-Signal header
curl -i http://localhost:3000/

# Markdown companion served (about.html.md exists)
curl -i -H "Accept: text/markdown" http://localhost:3000/about

# On-the-fly conversion (no companion for /dynamic)
curl -i -H "Accept: text/markdown" http://localhost:3000/dynamic

# API route — all signals blocked
curl -i http://localhost:3000/api/v1/users

# Blog route — aiTrain overridden to false
curl -i http://localhost:3000/blog/hello-world
```

## Expected Headers

Every response:
```
Content-Signal: search=yes, ai-input=yes, ai-train=no
Vary: Accept
```

API routes (`/api/**`):
```
Content-Signal: search=no, ai-input=no, ai-train=no
```

Markdown responses add:
```
Content-Type: text/markdown; charset=utf-8
x-markdown-tokens: <count>
```
