---
tokens: 71
---
# Hello World

This is a sample blog post to demonstrate per-path Content-Signal overrides.

Blog posts might allow AI input (RAG/grounding) but disallow AI training:

```
Content-Signal: search=yes, ai-input=yes, ai-train=no
```

Meanwhile, the `/api` routes block all AI access entirely.
