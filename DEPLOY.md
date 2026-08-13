# Deploying OpenConverter to Render

Both services are defined in [`render.yaml`](render.yaml) as a Render Blueprint:

| Service | Type | What it runs |
| --- | --- | --- |
| `openconverter-api` | Web Service (Docker) | FastAPI + uvicorn conversion engine |
| `openconverter-web` | Static Site | Next.js exported to static files |

The frontend is a **static export** (`output: "export"` in `next.config.ts`), so Render
serves it from a CDN. It never sleeps and costs nothing.

## Why the API runs from a container

The API service builds from [`backend/Dockerfile`](backend/Dockerfile) rather than Render's
native Python runtime, because OCR needs the Tesseract binary and only `apt` can install it.
Two consequences:

- **Builds take longer.** The image installs system packages on top of ~250 MB of Python
  wheels. Dependencies are copied and installed before the application code so that ordinary
  code changes reuse the cached layer.
- **`PYTHON_VERSION` no longer applies.** The Dockerfile's base image (`python:3.12-slim`)
  decides the Python version, so that environment variable was removed from `render.yaml`.

`backend/.dockerignore` excludes the local `venv/`, which would otherwise add ~250 MB to the
build context and shadow the dependencies installed inside the image.

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

**The API sleeps after ~15 minutes idle.** The next request waits roughly 45 seconds while
the container wakes (measured against the live service). After four seconds the converter
panel explains the wait, so it doesn't read as a hang.

**512 MB RAM.** Measured locally with every converter loaded:

| Stage | Memory |
| --- | --- |
| bare Python | 48 MB |
| idle server (all converters imported) | 145 MB |
| peak after exercising every converter | 242 MB |

That leaves ~270 MB of headroom. Fine for typical documents; large or image-heavy PDFs
could push it.

Two things keep the idle figure down. `pymupdf4llm` eagerly imports `onnxruntime` (~78 MB)
via its layout dependency — trimming that would buy back most of the baseline if layout
detection isn't needed. And the heavier optional libraries (`Pillow`, `python-docx`,
`python-pptx`, `openpyxl`, `markdown`) are imported *inside* their converter functions
rather than at module level, so a request that doesn't use them never pays for them. Keep
that pattern when adding converters.

**Batch conversion holds everything in memory.** `/api/convert/pdf-to-markdown/batch` reads
every uploaded file and builds the zip in RAM. A large batch is the most likely way to hit
the memory ceiling. Streaming to a temp file would fix it if that becomes a problem.

**OCR is the heaviest tool.** Each page is rasterised and then handed to Tesseract, which
keeps its own working copy — so it is capped at 25 pages and 300 DPI. It is also the
slowest: expect several seconds per page.

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

**Check OCR specifically after the first container deploy**, since it's the one tool that
depends on something outside Python:

```bash
curl -F "file=@scan.pdf" -F "output_format=txt" https://openconverter-api.onrender.com/api/ocr
```

Recognised text means Tesseract is wired up. `OCR is unavailable: Tesseract language data
was not found` means the image built without it — check the build log for the
`Resolved TESSDATA_PREFIX to ...` line the Dockerfile prints.

## Local development

Unchanged — `ALLOWED_ORIGINS` defaults to `http://localhost:3000` when unset:

```bash
cd backend && venv/Scripts/activate && uvicorn main:app --reload --port 8000
```

```bash
cd frontend && npm run dev
```
