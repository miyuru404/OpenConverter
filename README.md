# OpenConverter

Convert your files, online, for free. PDF to Markdown, image formats, and more — no signup required to try it, no bloated desktop installs.

🚧 **Status:** Early development. PDF → Markdown is the first supported conversion; more formats are on the roadmap below.

## What is OpenConverter?

OpenConverter is a web-based file conversion tool. It started as a way to convert research paper PDFs into clean, structure-preserving Markdown (headings, tables, reading order — not just a flat text dump), and is growing into a general document/image conversion hub.

Convert a single file or a whole batch at once, right from your browser — drag and drop files in, get clean converted output back.

## Features

* 📄 PDF → Markdown — preserves headings, tables, and reading order (built for research papers, technical docs, and multi-column layouts)
* 📦 Batch conversion — drop in multiple files, convert them all at once, download as a `.zip`
* 🖱️ Drag-and-drop upload — no clunky file browsers
* ⚡ No install required — runs entirely in the browser + our servers, works on Mac, Windows, Linux
* 🔒 Files aren't kept around — uploaded files are processed and deleted after conversion (see [Privacy](#privacy) below)

## Roadmap

* [ ] PNG ↔ JPG (and other image format conversions)
* [ ] PDF → DOCX
* [ ] DOCX/PPTX → Markdown
* [ ] Markdown → PDF
* [ ] Table extraction → CSV/Excel
* [ ] Citation/reference extraction → BibTeX
* [ ] OCR support for scanned PDFs
* [ ] PDF utilities: merge, split, compress, rotate

Have a request? Open an issue.

## Tech Stack

* **Frontend:** [Next.js](https://nextjs.org/) (React) — upload UI, drag-and-drop, job status, download
* **Backend / conversion engine:** [FastAPI](https://fastapi.tiangolo.com/) (Python) — handles the actual file processing
  * PDF → Markdown powered by `pymupdf4llm`
* **Communication:** Next.js frontend calls the FastAPI service over an internal HTTP API

```
┌─────────────┐        HTTP        ┌──────────────────┐
│   Next.js   │  ───────────────▶  │      FastAPI      │
│  (frontend) │  ◀───────────────  │ (conversion engine)│
└─────────────┘     job status /   └──────────────────┘
                     file result
```

## Project Structure

```
openconverter/
├── frontend/           # Next.js app
│   ├── app/
│   ├── components/
│   └── ...
├── backend/            # FastAPI service
│   ├── main.py
│   ├── converters/
│   │   └── pdf_to_md.py
│   ├── requirements.txt
│   └── ...
└── README.md
```

## Getting Started (Local Development)

### Prerequisites

* Node.js 18+
* Python 3.9+
* `pip`

1. Clone the repo

```bash
git clone https://github.com/<your-username>/openconverter.git
cd openconverter
```

2. Set up the backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend will be running at `http://localhost:8000`.

3. Set up the frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend will be running at `http://localhost:3000`.

4. Configure environment variables

Create a `.env.local` in `frontend/`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Usage

1. Go to `http://localhost:3000`
2. Drag and drop a PDF (or click to browse), or select multiple files for batch conversion
3. Choose your output format (currently: Markdown)
4. Click Convert
5. Download the result — single file, or a `.zip` for batch jobs

## Privacy

* Uploaded files are processed in memory / temporary storage and deleted after conversion (or after a short retention window — update this once finalized).
* We don't read, share, or use your file content for anything beyond performing the requested conversion.
* No account required for basic use.

(Update this section to match your actual data retention policy before launch.)

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a PR.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/png-to-jpg`)
3. Commit your changes
4. Open a pull request

## License

(Choose and add a license — e.g. MIT, Apache 2.0 — before making the repo public.)

## Acknowledgments

* [pymupdf4llm](https://github.com/pymupdf/RAG) for high-quality PDF text/structure extraction
