import io

import pymupdf

PAGE_SIZES = {"a4": "a4", "letter": "letter"}

# Styling for the rendered document. PyMuPDF's Story supports a practical
# subset of CSS, so this stays deliberately simple.
STYLESHEET = """
body { font-family: sans-serif; font-size: 11pt; line-height: 1.5; }
h1 { font-size: 20pt; margin-bottom: 8pt; }
h2 { font-size: 15pt; margin-top: 14pt; margin-bottom: 6pt; }
h3 { font-size: 12.5pt; margin-top: 12pt; margin-bottom: 4pt; }
p { margin-bottom: 8pt; }
code { font-family: monospace; font-size: 10pt; }
pre { font-family: monospace; font-size: 9.5pt; background-color: #f4f4f5;
      padding: 6pt; margin-bottom: 8pt; }
blockquote { margin-left: 12pt; color: #52525b; }
th, td { padding: 3pt; border: 1px solid #d4d4d8; }
th { background-color: #f4f4f5; text-align: left; }
li { margin-bottom: 3pt; }
"""

MAX_PAGES = 200


def markdown_to_pdf(markdown_text: str, page_size: str = "a4") -> bytes:
    """Render Markdown to a paginated PDF via HTML."""
    import markdown as markdown_lib  # lazy: small, but keeps startup lean

    page_size = page_size.lower()
    if page_size not in PAGE_SIZES:
        raise ValueError(
            f"Unsupported page size '{page_size}' "
            f"(supported: {', '.join(sorted(PAGE_SIZES))})"
        )

    if not markdown_text.strip():
        raise ValueError("This file is empty")

    html = markdown_lib.markdown(
        markdown_text,
        extensions=["tables", "fenced_code", "sane_lists"],
    )

    story = pymupdf.Story(html=html, user_css=STYLESHEET)
    buffer = io.BytesIO()
    writer = pymupdf.DocumentWriter(buffer)

    paper = pymupdf.paper_rect(PAGE_SIZES[page_size])
    # Keep a ~50pt margin on every side.
    content_area = pymupdf.Rect(50, 50, paper.width - 50, paper.height - 50)

    pages = 0
    more = True
    while more:
        pages += 1
        if pages > MAX_PAGES:
            writer.close()
            raise ValueError(f"Document exceeds the {MAX_PAGES} page limit")

        device = writer.begin_page(paper)
        more, _ = story.place(content_area)
        story.draw(device)
        writer.end_page()

    writer.close()
    return buffer.getvalue()
