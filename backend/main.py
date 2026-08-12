import os

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from converters.pdf_to_images import DEFAULT_DPI, render_pdf_pages
from converters.pdf_to_md import convert_pdf_to_markdown
from utils import (
    attachment_headers,
    build_zip,
    check_batch_size,
    file_stem,
    read_upload,
)

app = FastAPI(title="OpenConverter API")

# Comma-separated list of allowed frontend origins; defaults to local dev.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    # Not a CORS-safelisted response header, so the browser can't read the
    # download filename without this.
    expose_headers=["Content-Disposition"],
)

PDF_ONLY = {".pdf"}


@app.get("/health")
def health():
    return {"status": "ok"}


# --- PDF to Markdown ----------------------------------------------------------


@app.post("/api/convert/pdf-to-markdown")
async def pdf_to_markdown(file: UploadFile = File(...)):
    data = await read_upload(file, PDF_ONLY)
    try:
        markdown = convert_pdf_to_markdown(data)
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Failed to convert {file.filename}: {exc}"
        ) from exc
    return {"filename": f"{file_stem(file.filename)}.md", "markdown": markdown}


@app.post("/api/convert/pdf-to-markdown/batch")
async def pdf_to_markdown_batch(files: list[UploadFile] = File(...)):
    check_batch_size(files)

    entries = []
    for file in files:
        data = await read_upload(file, PDF_ONLY)
        try:
            markdown = convert_pdf_to_markdown(data)
        except Exception as exc:
            raise HTTPException(
                status_code=422, detail=f"Failed to convert {file.filename}: {exc}"
            ) from exc
        entries.append((f"{file_stem(file.filename)}.md", markdown))

    return StreamingResponse(
        build_zip(entries),
        media_type="application/zip",
        headers=attachment_headers("markdown.zip"),
    )


# --- PDF to Images ------------------------------------------------------------


@app.post("/api/convert/pdf-to-images")
async def pdf_to_images(
    file: UploadFile = File(...),
    image_format: str = Form("png"),
    dpi: int = Form(DEFAULT_DPI),
):
    data = await read_upload(file, PDF_ONLY)
    stem = file_stem(file.filename)

    try:
        # Consumed lazily by build_zip, so only one rendered page is held at a time.
        entries = (
            (f"{stem}-page-{number:03d}.{image_format.lower()}", image_bytes)
            for number, image_bytes in render_pdf_pages(data, image_format, dpi)
        )
        archive = build_zip(entries)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail=f"Failed to convert {file.filename}: {exc}"
        ) from exc

    return StreamingResponse(
        archive,
        media_type="application/zip",
        headers=attachment_headers(f"{stem}-images.zip"),
    )
