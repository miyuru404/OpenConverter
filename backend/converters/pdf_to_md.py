import pymupdf
import pymupdf4llm


def convert_pdf_to_markdown(file_bytes: bytes) -> str:
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    try:
        # A malformed PDF can open with zero pages, and pymupdf4llm then fails
        # with a bare IndexError. Check first so the caller gets a usable message.
        if doc.page_count == 0:
            raise ValueError("This PDF has no pages, or is damaged")
        return pymupdf4llm.to_markdown(doc)
    finally:
        doc.close()
