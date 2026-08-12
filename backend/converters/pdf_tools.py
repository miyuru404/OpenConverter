from typing import Iterator

import pymupdf

# A merged document is held in memory before being written out, so cap the
# combined size to stay inside the free tier's budget.
MAX_TOTAL_PAGES = 500
VALID_ROTATIONS = {90, 180, 270}

# garbage=4 dedupes and drops unreferenced objects, deflate compresses streams,
# clean rewrites the content streams. Together this is the "compress" pass.
SAVE_OPTIONS = {"garbage": 4, "deflate": True, "clean": True}


def _open(file_bytes: bytes) -> pymupdf.Document:
    document = pymupdf.open(stream=file_bytes, filetype="pdf")
    if document.page_count == 0:
        document.close()
        raise ValueError("This PDF has no pages")
    return document


def merge_pdfs(documents: list[bytes]) -> bytes:
    """Concatenate several PDFs into one, in the order given."""
    if len(documents) < 2:
        raise ValueError("Merging needs at least 2 PDF files")

    merged = pymupdf.open()
    try:
        total = 0
        for data in documents:
            source = _open(data)
            try:
                total += source.page_count
                if total > MAX_TOTAL_PAGES:
                    raise ValueError(
                        f"Merged document would exceed {MAX_TOTAL_PAGES} pages"
                    )
                merged.insert_pdf(source)
            finally:
                source.close()
        return merged.tobytes(**SAVE_OPTIONS)
    finally:
        merged.close()


def split_pdf(file_bytes: bytes, stem: str) -> Iterator[tuple[str, bytes]]:
    """Yield each page as its own single-page PDF."""
    document = _open(file_bytes)
    try:
        if document.page_count > MAX_TOTAL_PAGES:
            raise ValueError(
                f"This PDF has {document.page_count} pages — the limit is {MAX_TOTAL_PAGES}"
            )

        for number in range(document.page_count):
            single = pymupdf.open()
            try:
                single.insert_pdf(document, from_page=number, to_page=number)
                yield f"{stem}-page-{number + 1:03d}.pdf", single.tobytes(**SAVE_OPTIONS)
            finally:
                single.close()
    finally:
        document.close()


def rotate_pdf(file_bytes: bytes, angle: int) -> bytes:
    """Rotate every page by `angle` degrees clockwise."""
    if angle not in VALID_ROTATIONS:
        raise ValueError(
            f"Rotation must be one of {sorted(VALID_ROTATIONS)} degrees"
        )

    document = _open(file_bytes)
    try:
        for page in document:
            # Relative to whatever rotation the page already carries.
            page.set_rotation((page.rotation + angle) % 360)
        return document.tobytes(**SAVE_OPTIONS)
    finally:
        document.close()


def compress_pdf(file_bytes: bytes) -> bytes:
    """Rewrite the PDF with deduplication and stream compression."""
    document = _open(file_bytes)
    try:
        return document.tobytes(**SAVE_OPTIONS)
    finally:
        document.close()
