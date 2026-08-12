from typing import Iterator

import pymupdf

# Rendering is the memory-hungry part: an A4 page at 300 DPI is ~26 MB of raw
# pixels. Capping DPI and page count keeps a single request well inside the
# free tier's 512 MB.
MIN_DPI = 72
MAX_DPI = 200
DEFAULT_DPI = 150
MAX_PAGES = 100

SUPPORTED_FORMATS = {"png", "jpg"}


def render_pdf_pages(
    file_bytes: bytes,
    image_format: str = "png",
    dpi: int = DEFAULT_DPI,
) -> Iterator[tuple[int, bytes]]:
    """
    Yield (page_number, image_bytes) one page at a time.

    Yielding rather than returning a list means only one page's pixels are held
    in memory at a time, so a long PDF costs no more than a short one.
    """
    image_format = image_format.lower()
    if image_format == "jpeg":
        image_format = "jpg"
    if image_format not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported image format '{image_format}' "
            f"(supported: {', '.join(sorted(SUPPORTED_FORMATS))})"
        )

    if not MIN_DPI <= dpi <= MAX_DPI:
        raise ValueError(f"DPI must be between {MIN_DPI} and {MAX_DPI}")

    document = pymupdf.open(stream=file_bytes, filetype="pdf")
    try:
        if document.page_count == 0:
            raise ValueError("This PDF has no pages")
        if document.page_count > MAX_PAGES:
            raise ValueError(
                f"This PDF has {document.page_count} pages — the limit is {MAX_PAGES}"
            )

        for index, page in enumerate(document, start=1):
            # JPEG has no alpha channel, so render opaque for both formats.
            pixmap = page.get_pixmap(dpi=dpi, alpha=False)
            try:
                yield index, pixmap.tobytes(image_format)
            finally:
                # Drop the pixel buffer before rendering the next page.
                del pixmap
    finally:
        document.close()
