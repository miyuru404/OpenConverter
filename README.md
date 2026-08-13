# OpenConverter

Convert your files, online, for free. PDFs to Markdown, Word, images, spreadsheets and back — no signup, no installs.

**Live at [openconverter-web.onrender.com](https://openconverter-web.onrender.com/)**

## What is OpenConverter?

A web-based file conversion workbench. It started as a way to turn research paper PDFs into
clean, structure-preserving Markdown — headings, tables and reading order, not a flat text
dump — and has grown into a general document, image and data conversion hub.

Pick a conversion, drop a file in, get the result back. Nothing is stored.

## Tools

All ten conversions are live:

| Tool | From → To | Notes |
| --- | --- | --- |
| PDF to Markdown | PDF → MD | Headings, tables and multi-column reading order preserved |
| PDF to Word | PDF → DOCX | Editable text with headings, paragraphs and tables |
| Word / PowerPoint to Markdown | DOCX, PPTX → MD | Headings, lists, tables and slide notes |
| Markdown to PDF | MD → PDF | Typeset output, A4 or US Letter |
| Image Format Converter | PNG, JPG, WebP, BMP, TIFF, GIF → PNG, JPG, WebP, BMP, TIFF | Quality control; alpha flattened for formats without it |
| PDF to Images | PDF → PNG, JPG | Every page exported, 96–200 DPI |
| Table Extraction | PDF → XLSX, CSV | One worksheet per table, or zipped CSVs |
| Citation Extraction | PDF → BibTeX | Parses the reference list into `.bib` entries |
| PDF Utilities | PDF → PDF | Merge, split, rotate, compress |
| OCR | Scanned PDF, image → searchable PDF, TXT | Adds a selectable text layer, or returns plain text |

Have a request? Open an issue.

## Known limitations

Worth reading before you rely on this for anything important.

**Citation extraction is heuristic.** Reference lists are prose formatted by convention, not
structured data, and conventions differ per venue. Extraction handles the common numbered,
APA and NeurIPS-style layouts and pulls out authors, title, year, DOI and URL — but it is
best-effort. Every `.bib` file carries a header comment saying so. Check the fields before
using them.

**Table extraction favours precision over recall.** Tables with ruling lines extract cleanly.
Borderless tables in dense multi-column papers often cannot be isolated at all — the
underlying text-detection strategy returns the whole page sliced into columns rather than the
table — and those results are rejected rather than handed back as garbage. Expect some real
tables to be missed.

**PDF to Word is text-first, not a layout clone.** It reconstructs headings, paragraphs and
tables. It does not reproduce the original page layout pixel for pixel. (The usual library for
that, `pdf2docx`, depends on OpenCV at ~90 MB, which does not fit the deployment's memory
budget.)

**The hosted API sleeps.** On the free tier the backend spins down after ~15 minutes idle, and
waking it takes around 45 seconds. The first conversion after a quiet spell is slow; the UI
says so while you wait. Everything after that is fast.

**OCR is English-only and capped at 25 pages.** Tesseract does the recognition, so accuracy
depends on scan quality — clean 300 DPI scans read well, photographs of pages much less so.
Adding a language means installing the matching `tesseract-ocr-<lang>` package in the
Dockerfile and listing it in `SUPPORTED_LANGUAGES`. It is also by far the slowest tool here:
every page is rasterised and recognised, so expect several seconds per page.

**Upload limits.** 25 MB per file and 20 files per batch by default, configurable through
`MAX_UPLOAD_MB` and `MAX_BATCH_FILES`. Individual tools cap pages (100 for rendering, 500 for
PDF utilities) to stay inside the memory budget.

## Tech Stack

* **Frontend:** [Next.js](https://nextjs.org/) (React, TypeScript, Tailwind) — statically
  exported, so it is served straight from a CDN
* **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python) — the conversion engine,
  running from a container so OCR has the Tesseract binary available
* **Conversion libraries:** `pymupdf4llm` and `PyMuPDF` (PDF reading, rendering, tables, PDF
  writing, and driving Tesseract for OCR), `Pillow` (images), `python-docx` / `python-pptx`
  (Office), `openpyxl` (Excel), `Markdown` (Markdown → HTML, rendered to PDF through
  PyMuPDF's Story API)

```
┌─────────────┐        HTTPS       ┌────────────────────┐
│   Next.js   │  ───────────────▶  │      FastAPI       │
│  (static)   │  ◀───────────────  │ (conversion engine)│
└─────────────┘   file result /    └────────────────────┘
                  error detail
```

## Project Structure

```
openconverter/
├── frontend/                  # Next.js app (static export)
│   ├── app/                   # layout, page, global styles, icon
│   ├── components/            # Sidebar, TopBar, ConverterPanel, ToolIndex, …
│   └── lib/
│       ├── features.ts        # the tool catalogue — single source of truth
│       └── recent.ts          # localStorage-backed conversion history
├── backend/                   # FastAPI service
│   ├── main.py                # routes
│   ├── utils.py               # upload limits, zip building, shared helpers
│   ├── converters/            # one module per conversion
│   ├── Dockerfile             # image with Tesseract, used for deployment
│   └── requirements.txt
├── render.yaml                # Render Blueprint: both services
├── DEPLOY.md                  # deployment guide and free-tier limits
└── README.md
```

`frontend/lib/features.ts` drives the entire UI — the tool cards, the category counts, the
From/To dropdowns and the per-tool options all read from it. Adding a tool means adding an
entry there and an endpoint in `backend/main.py`.

## API

All conversion endpoints take `multipart/form-data` and return the converted file with a
`Content-Disposition` filename. Errors come back as `{"detail": "..."}` with a 400 for bad
input or 422 when a conversion fails.

| Method | Path | Form fields |
| --- | --- | --- |
| GET | `/health` | — |
| POST | `/api/convert/pdf-to-markdown` | `file` |
| POST | `/api/convert/pdf-to-markdown/batch` | `files` |
| POST | `/api/convert/pdf-to-images` | `file`, `image_format`, `dpi` |
| POST | `/api/convert/pdf-to-docx` | `file` |
| POST | `/api/convert/office-to-markdown` | `file` |
| POST | `/api/convert/markdown-to-pdf` | `file`, `page_size` |
| POST | `/api/convert/image` | `file`, `output_format`, `quality` |
| POST | `/api/extract/tables` | `file`, `output_format` |
| POST | `/api/extract/citations` | `file` |
| POST | `/api/tools/pdf` | `files`, `operation`, `angle` |
| POST | `/api/ocr` | `file`, `output_format`, `language`, `dpi` |

Interactive docs are served at `/docs`.

## Getting Started (Local Development)

### Prerequisites

* Node.js 18+
* Python 3.12+ (developed against 3.14; the deployment pins 3.12 as a conservative
  choice, since `onnxruntime` — a transitive dependency — does not publish Linux wheels
  for every new release straight away)

1. Clone the repo

```bash
git clone https://github.com/miyuru404/OpenConverter.git
```

2. Set up the backend

```bash
cd backend && python -m venv venv && venv/Scripts/activate && pip install -r requirements.txt
```

On macOS or Linux use `source venv/bin/activate` instead. Then start it:

```bash
uvicorn main:app --reload --port 8000
```

Every tool except OCR works from this virtualenv. OCR additionally needs the Tesseract
binary on your PATH; without it that one endpoint returns a clear "OCR is unavailable"
error and everything else carries on. To run the backend exactly as deployed:

```bash
docker build -t openconverter-api backend && docker run --rm -p 8000:8000 openconverter-api
```

3. Set up the frontend

```bash
cd frontend && npm install && npm run dev
```

4. Point the frontend at the API with `frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The frontend runs at `http://localhost:3000`. `NEXT_PUBLIC_*` values are baked in at build
time, so changing this needs a rebuild — not just a restart.

## Deployment

Both services deploy to Render from [`render.yaml`](render.yaml) as a Blueprint. See
[DEPLOY.md](DEPLOY.md) for the setup steps, the environment variables the two services need
from each other, and the measured memory profile.

## Privacy

* Uploaded files are held in memory for the duration of the request and discarded when it
  ends. Nothing is written to disk and nothing is retained after the response is sent.
* File contents are never read, shared or used for anything beyond the requested conversion.
* Conversion history shown in the UI lives in your browser's `localStorage` — filenames and
  formats only, never file contents, and it is never sent anywhere.
* No account required.

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before
submitting a PR.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-converter`)
3. Commit your changes
4. Open a pull request

When adding a converter, import heavy libraries *inside* the converter function rather than at
module level. The deployment runs on 512 MB, and lazy imports keep tools you are not using out
of the idle footprint.

## License

[MIT](LICENSE) © Miyuru Bashitha

## Acknowledgments

* [pymupdf4llm](https://github.com/pymupdf/RAG) for high-quality PDF text and structure
  extraction
