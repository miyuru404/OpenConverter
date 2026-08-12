# Deploying OpenConverter to Render

Both services are defined in [`render.yaml`](render.yaml) as a Render Blueprint:

| Service | Type | What it runs |
| --- | --- | --- |
| `openconverter-api` | Web Service (Python) | FastAPI + uvicorn conversion engine |
| `openconverter-web` | Static Site | Next.js exported to static files |

The frontend is a **static export** (`output: "export"` in `next.config.ts`), so Render
serves it from a CDN. It never sleeps and costs nothing.

## Why two services

The frontend is pure static HTML/JS and the backend needs a running Python process.
Splitting them means only the API sleeps on the free tier, and the UI always loads
instantly — the cold start only costs you the first *conversion*, not the first page view.

## First deploy

1. Push the repo to GitHub (see the commit commands from your session).

2. In the Render dashboard: **New → Blueprint**, connect the `OpenConverter` repo.
   Render reads `render.yaml` and creates both services.

3. Both env vars are marked `sync: false`, so Render will prompt for them — and there's a
   chicken-and-egg problem: each service needs the other's URL, which doesn't exist yet.
   Leave them blank on the first pass and fill them in at step 4.

4. Once both services exist, note their URLs (roughly
   `https://openconverter-api.onrender.com` and `https://openconverter-web.onrender.com`),
   then set:

   | Service | Variable | Value |
   | --- | --- | --- |
   | `openconverter-web` | `NEXT_PUBLIC_API_URL` | the **api** service URL |
   | `openconverter-api` | `ALLOWED_ORIGINS` | the **web** service URL |

5. Redeploy both. The frontend **must** be rebuilt after setting `NEXT_PUBLIC_API_URL` —
   Next.js bakes `NEXT_PUBLIC_*` values into the JS bundle at build time, so changing the
   variable without a rebuild has no effect.

No trailing slash on either URL. `ALLOWED_ORIGINS` accepts a comma-separated list if you
later add a custom domain.

## Free tier limits worth knowing

**The API sleeps after ~15 minutes idle.** The next request waits roughly 50 seconds while
the container wakes. The UI has no loading state for this yet — a user's first conversion
after a quiet period will just look slow.

**512 MB RAM.** Measured locally:

| Stage | Memory |
| --- | --- |
| baseline | 17 MB |
| after importing `pymupdf` alone | 48 MB |
| after importing `pymupdf4llm` | 127 MB |
| after converting a 1-page PDF | 188 MB |

That leaves ~320 MB of headroom. Fine for typical papers; large or image-heavy PDFs could
push it. `pymupdf4llm` eagerly imports `onnxruntime` (~78 MB of the baseline) via its
layout dependency — if you don't need layout detection, trimming that dependency would buy
back most of it.

**Batch conversion holds everything in memory.** `/api/convert/pdf-to-markdown/batch` reads
every uploaded file and builds the zip in RAM. A large batch is the most likely way to hit
the memory ceiling. Streaming to a temp file would fix it if that becomes a problem.

## Verifying a deploy

```bash
curl https://openconverter-api.onrender.com/health
```

Expect `{"status":"ok"}`. Render also uses this path as the service health check.

To confirm CORS is wired correctly, substituting your real URLs:

```bash
curl -i -X OPTIONS -H "Origin: https://openconverter-web.onrender.com" -H "Access-Control-Request-Method: POST" https://openconverter-api.onrender.com/api/convert/pdf-to-markdown
```

Expect `200` and an `access-control-allow-origin` header echoing your frontend URL. A
`400 Disallowed CORS origin` means `ALLOWED_ORIGINS` doesn't match the frontend URL exactly.

## Local development

Unchanged — `ALLOWED_ORIGINS` defaults to `http://localhost:3000` when unset:

```bash
cd backend && venv/Scripts/activate && uvicorn main:app --reload --port 8000
```

```bash
cd frontend && npm run dev
```
