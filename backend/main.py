import io
import os
import zipfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from converters.pdf_to_md import convert_pdf_to_markdown

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
)


@app.get("/health")
def health():
    return {"status": "ok"}


def _markdown_filename(original: str) -> str:
    stem = original.rsplit(".", 1)[0] if "." in original else original
    return f"{stem}.md"


async def _read_pdf(file: UploadFile) -> bytes:
    if file.content_type != "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"{file.filename} is not a PDF")
    return await file.read()


@app.post("/api/convert/pdf-to-markdown")
async def convert_single(file: UploadFile = File(...)):
    data = await _read_pdf(file)
    try:
        markdown = convert_pdf_to_markdown(data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to convert {file.filename}: {exc}") from exc
    return {"filename": _markdown_filename(file.filename), "markdown": markdown}


@app.post("/api/convert/pdf-to-markdown/batch")
async def convert_batch(files: list[UploadFile] = File(...)):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file in files:
            data = await _read_pdf(file)
            try:
                markdown = convert_pdf_to_markdown(data)
            except Exception as exc:
                raise HTTPException(status_code=422, detail=f"Failed to convert {file.filename}: {exc}") from exc
            zip_file.writestr(_markdown_filename(file.filename), markdown)

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=converted.zip"},
    )
