"""
OCR for scanned PDFs and images.

PyMuPDF drives Tesseract rather than us shelling out to it, but the binary and
its language data still have to be present — which is why this service runs
from a container (see ../Dockerfile). When Tesseract is missing the failure is
reported as a clear message rather than an opaque library error.
"""

import glob
import os

import pymupdf

# OCR is the most memory-hungry thing here: the page is rasterised, then
# Tesseract holds its own working copy. Keep both the page count and DPI modest.
MIN_DPI = 150
MAX_DPI = 300
DEFAULT_DPI = 200
MAX_PAGES = 25

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}

# Language codes must match installed `tesseract-ocr-<lang>` packages.
SUPPORTED_LANGUAGES = {"eng"}

OUTPUT_FORMATS = {"pdf", "txt"}


def _tessdata_dir() -> str:
    """Locate Tesseract's language data, or explain that it isn't installed."""
    configured = os.getenv("TESSDATA_PREFIX")
    if configured and os.path.isdir(configured):
        return configured

    # Path varies by Tesseract major version and distribution.
    for pattern in (
        "/usr/share/tesseract-ocr/*/tessdata",
        "/usr/share/tessdata",
        "/usr/local/share/tessdata",
        "/opt/homebrew/share/tessdata",
    ):
        matches = sorted(glob.glob(pattern))
        if matches:
            return matches[-1]

    raise ValueError(
        "OCR is unavailable: Tesseract language data was not found on this "
        "server. This endpoint requires the container image, which installs it."
    )


def _validate(language: str, dpi: int, output_format: str) -> None:
    if language not in SUPPORTED_LANGUAGES:
        raise ValueError(
            f"Unsupported language '{language}' "
            f"(installed: {', '.join(sorted(SUPPORTED_LANGUAGES))})"
        )
    if not MIN_DPI <= dpi <= MAX_DPI:
        raise ValueError(f"DPI must be between {MIN_DPI} and {MAX_DPI}")
    if output_format not in OUTPUT_FORMATS:
        raise ValueError(
            f"Unsupported output '{output_format}' "
            f"(supported: {', '.join(sorted(OUTPUT_FORMATS))})"
        )


def _open(file_bytes: bytes, extension: str) -> pymupdf.Document:
    """Open a PDF, or wrap a single image as a one-page document."""
    extension = extension.lower()
    if extension == ".pdf":
        document = pymupdf.open(stream=file_bytes, filetype="pdf")
        if document.page_count == 0:
            document.close()
            raise ValueError("This PDF has no pages")
        if document.page_count > MAX_PAGES:
            pages = document.page_count
            document.close()
            raise ValueError(
                f"This PDF has {pages} pages — OCR is limited to {MAX_PAGES}"
            )
        return document

    if extension in IMAGE_EXTENSIONS:
        try:
            image = pymupdf.open(stream=file_bytes, filetype=extension.lstrip("."))
            pdf_bytes = image.convert_to_pdf()
            image.close()
            return pymupdf.open(stream=pdf_bytes, filetype="pdf")
        except Exception as exc:
            raise ValueError(f"Couldn't read this image: {exc}") from exc

    raise ValueError(f"Unsupported file type '{extension}'")


def ocr_document(
    file_bytes: bytes,
    extension: str,
    output_format: str = "pdf",
    language: str = "eng",
    dpi: int = DEFAULT_DPI,
) -> bytes | str:
    """
    Run OCR and return either a searchable PDF or the recognised text.

    The PDF path rebuilds each page as an image with an invisible text layer, so
    the result looks identical but can be searched and selected.
    """
    _validate(language, dpi, output_format)

    # Validate the input before checking the environment, so a bad file type
    # reports itself rather than being masked by a missing-Tesseract message.
    document = _open(file_bytes, extension)
    try:
        tessdata = _tessdata_dir()
        if output_format == "txt":
            chunks = []
            for page in document:
                textpage = page.get_textpage_ocr(
                    language=language, dpi=dpi, full=True, tessdata=tessdata
                )
                chunks.append(page.get_text(textpage=textpage))
            text = "\n\n".join(chunk.strip() for chunk in chunks if chunk.strip())
            if not text:
                raise ValueError("No text could be recognised in this document")
            return text + "\n"

        output = pymupdf.open()
        try:
            for page in document:
                # One page at a time: the pixmap is the memory peak, so it must
                # not accumulate across a long document.
                pixmap = page.get_pixmap(dpi=dpi, alpha=False)
                try:
                    page_pdf = pixmap.pdfocr_tobytes(
                        language=language, tessdata=tessdata
                    )
                finally:
                    del pixmap

                with pymupdf.open(stream=page_pdf, filetype="pdf") as single:
                    output.insert_pdf(single)

            return output.tobytes(garbage=4, deflate=True)
        finally:
            output.close()
    except RuntimeError as exc:
        # PyMuPDF surfaces a missing or broken Tesseract as a RuntimeError.
        raise ValueError(f"OCR failed: {exc}") from exc
    finally:
        document.close()
