import csv
import io

import pymupdf

MAX_TABLES = 200


def _clean_rows(rows: list[list]) -> list[list[str]]:
    """Normalise cells to strings and drop rows that are entirely empty.

    The text-based detection strategy interleaves blank rows between real ones,
    so this keeps output usable regardless of which strategy found the table.
    """
    cleaned = []
    for row in rows:
        cells = [("" if cell is None else str(cell)).strip() for cell in row]
        if any(cells):
            cleaned.append(cells)
    return cleaned


def find_tables(file_bytes: bytes) -> list[tuple[int, list[list[str]]]]:
    """Return (page_number, rows) for every table found in the PDF."""
    document = pymupdf.open(stream=file_bytes, filetype="pdf")
    try:
        found: list[tuple[int, list[list[str]]]] = []

        for number, page in enumerate(document, start=1):
            # Ruled tables detect cleanly from their lines; borderless ones
            # only show up under the text strategy, which is noisier.
            tables = page.find_tables(strategy="lines").tables
            if not tables:
                tables = page.find_tables(strategy="text").tables

            for table in tables:
                rows = _clean_rows(table.extract())
                # A single row is usually a false positive, not a table.
                if len(rows) >= 2:
                    found.append((number, rows))
                if len(found) >= MAX_TABLES:
                    return found

        return found
    finally:
        document.close()


def tables_to_csv(rows: list[list[str]]) -> str:
    buffer = io.StringIO()
    csv.writer(buffer, lineterminator="\n").writerows(rows)
    return buffer.getvalue()


def tables_to_xlsx(tables: list[tuple[int, list[list[str]]]]) -> bytes:
    """One worksheet per table, named by the page it came from."""
    from openpyxl import Workbook  # imported lazily to keep idle memory down

    workbook = Workbook()
    workbook.remove(workbook.active)

    for index, (page_number, rows) in enumerate(tables, start=1):
        sheet = workbook.create_sheet(title=f"p{page_number}-table{index}"[:31])
        for row in rows:
            sheet.append(row)

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
