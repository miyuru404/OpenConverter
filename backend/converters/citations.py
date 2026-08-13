"""
Best-effort BibTeX extraction from a paper's reference list.

There is no reliable structure to parse — reference lists are prose formatted by
convention, and conventions differ per venue. This module locates the reference
section, splits it into entries, and pulls out the fields it can identify with
reasonable confidence (DOI, year, title, authors). Fields it cannot determine
are omitted rather than guessed, so the output is incomplete but not wrong.
"""

import re
from typing import Iterator

import pymupdf

# Headings that mark the start of the reference list.
REFERENCE_HEADING = re.compile(
    r"^\s*(?:\d+\.?\s*)?(references|bibliography|works\s+cited|literature\s+cited)\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

# Sections that can follow the references, marking where to stop.
TRAILING_SECTION = re.compile(
    r"^\s*(?:\d+\.?\s*)?(appendix|appendices|acknowledgements?|about\s+the\s+authors?|"
    r"author\s+biograph\w+|supplementary)\b",
    re.IGNORECASE | re.MULTILINE,
)

DOI_PATTERN = re.compile(r"\b10\.\d{4,9}/[-._;()/:A-Za-z0-9]+", re.IGNORECASE)
URL_PATTERN = re.compile(r"https?://[^\s,;]+")
YEAR_PATTERN = re.compile(r"\b(1[89]\d{2}|20\d{2})\b")
QUOTED_TITLE = re.compile(r"[\"“]([^\"”]{8,300})[\"”]")

# "[1] ..." or "1. ..." at the start of a line.
BRACKET_NUMBERED = re.compile(r"^\s*\[\s*\d{1,3}\s*\]\s*", re.MULTILINE)
DOT_NUMBERED = re.compile(r"^\s*\d{1,3}[.)]\s+(?=[A-Z\"“])", re.MULTILINE)

# A line only begins a new reference if it opens with something author-shaped.
# "Starts with a capital" is far too loose — continuation lines like
# "Document Analysis, 100-110." would split an entry in half.
ENTRY_START = re.compile(
    r"^(?:"
    r"[A-Z][A-Za-z'’\-]+,\s*(?:[A-Z]\.\s*)+"  # Smith, J. A.
    r"|(?:[A-Z]\.\s*)+[A-Z][A-Za-z'’\-]+"  # A. Smith
    r"|[A-Z][A-Za-z'’\-]+\s+(?:and|&)\s+[A-Z]"  # Smith and Jones
    r")"
)

MAX_ENTRIES = 300


def _extract_reference_section(text: str) -> str:
    matches = list(REFERENCE_HEADING.finditer(text))
    if not matches:
        raise ValueError(
            "Couldn't find a reference section — looked for a 'References' or "
            "'Bibliography' heading"
        )

    # Use the last heading: papers often cite the word "references" earlier on.
    section = text[matches[-1].end() :]

    trailing = TRAILING_SECTION.search(section)
    if trailing:
        section = section[: trailing.start()]

    return section.strip()


def _split_entries(section: str) -> list[str]:
    """Split a reference section into individual references."""
    for pattern in (BRACKET_NUMBERED, DOT_NUMBERED):
        if len(pattern.findall(section)) >= 2:
            parts = pattern.split(section)
            return [p for p in (part.strip() for part in parts) if len(p) > 20]

    # Unnumbered list: blank lines usually separate entries.
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", section) if len(p.strip()) > 20]
    if len(paragraphs) >= 2:
        return paragraphs

    # Last resort: treat a line starting with a capital as a new entry and
    # fold continuation lines into it.
    entries: list[str] = []
    for line in section.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        starts_entry = bool(ENTRY_START.match(stripped))
        if starts_entry and entries and len(entries[-1]) > 40:
            entries.append(stripped)
        elif entries:
            entries[-1] = f"{entries[-1]} {stripped}"
        else:
            entries.append(stripped)
    return [e for e in entries if len(e) > 20]


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" .,;:")


def _escape_bibtex(value: str) -> str:
    for char in ("\\", "{", "}", "$", "&", "%", "#", "_"):
        value = value.replace(char, f"\\{char}")
    return value


def _guess_title(entry: str, authors: str) -> str:
    quoted = QUOTED_TITLE.search(entry)
    if quoted:
        return _clean(quoted.group(1))

    # Otherwise take the sentence after the author block, which is usually the title.
    remainder = entry[len(authors) :] if authors and entry.startswith(authors) else entry
    remainder = re.sub(r"^\s*[.,]?\s*\(?\d{4}\)?[.,]?\s*", "", remainder)
    sentences = [s for s in re.split(r"(?<=[a-z0-9])\.\s+", remainder) if len(s.strip()) > 10]
    return _clean(sentences[0]) if sentences else ""


# A sentence break, ignoring the period after an initial such as "Quoc V. Le".
SENTENCE_BREAK = re.compile(r"(?<![A-Z])\.\s+")


def _guess_authors(entry: str) -> str:
    """
    Authors always come first, so the earliest strong boundary wins.

    Which boundary appears first depends on the style: APA puts the year early,
    IEEE puts a quoted title early, and NeurIPS-style entries have neither —
    the year sits at the very end, so only the sentence break after the last
    author separates them from the title.
    """
    boundaries = []
    for pattern in (
        r"[\"“]",
        r"\(?\b(?:1[89]\d{2}|20\d{2})\b\)?",
        SENTENCE_BREAK,
    ):
        match = re.search(pattern, entry)
        if match and match.start() > 3:
            boundaries.append(match.start())

    if boundaries:
        return _clean(entry[: min(boundaries)])
    return _clean(entry)


def _cite_key(authors: str, year: str, title: str, index: int) -> str:
    surname = ""
    if authors:
        first = re.split(r",| and |;|&", authors)[0]
        words = [w for w in re.findall(r"[A-Za-z]{2,}", first)]
        if words:
            surname = words[-1].lower()

    title_word = ""
    for word in re.findall(r"[A-Za-z]{4,}", title):
        if word.lower() not in {"the", "and", "for", "with", "from", "into", "using"}:
            title_word = word.lower()
            break

    key = "".join(part for part in (surname, year, title_word) if part)
    return re.sub(r"[^a-z0-9]", "", key) or f"ref{index}"


def _entry_type(entry: str) -> str:
    lowered = entry.lower()
    if re.search(r"\bproc(?:eedings|\.)|conference|symposium|workshop\b", lowered):
        return "inproceedings"
    if re.search(r"\bjournal|trans(?:actions|\.)|vol\.?\s*\d|\bpp\.?\s*\d", lowered):
        return "article"
    if re.search(r"\bpress\b|\bed(?:ition|s?\.)\b|\bpublish", lowered):
        return "book"
    return "misc"


def parse_reference(entry: str, index: int) -> dict[str, str]:
    entry = _clean(entry)
    year_match = YEAR_PATTERN.search(entry)
    year = year_match.group(0) if year_match else ""

    authors = _guess_authors(entry)
    title = _guess_title(entry, authors)

    doi_match = DOI_PATTERN.search(entry)
    url_match = URL_PATTERN.search(entry)

    fields = {
        "author": authors,
        "title": title,
        "year": year,
        "doi": doi_match.group(0).rstrip(".") if doi_match else "",
        "url": url_match.group(0).rstrip(".") if url_match and not doi_match else "",
        # Keep the source text so nothing is silently lost to a bad guess.
        "note": entry if not title else "",
    }

    return {
        "type": _entry_type(entry),
        "key": _cite_key(authors, year, title, index),
        "fields": {name: value for name, value in fields.items() if value},
    }


def _format_entry(record: dict[str, str]) -> str:
    lines = [f"@{record['type']}{{{record['key']},"]
    for name, value in record["fields"].items():
        lines.append(f"  {name} = {{{_escape_bibtex(value)}}},")
    lines.append("}")
    return "\n".join(lines)


def _iter_entries(section: str) -> Iterator[dict[str, str]]:
    seen_keys: dict[str, int] = {}
    for index, raw in enumerate(_split_entries(section)[:MAX_ENTRIES], start=1):
        record = parse_reference(raw, index)

        # BibTeX keys must be unique; disambiguate collisions with a suffix.
        key = record["key"]
        if key in seen_keys:
            seen_keys[key] += 1
            record["key"] = f"{key}{chr(ord('a') + seen_keys[key] - 1)}"
        else:
            seen_keys[key] = 1

        yield record


def extract_bibtex(file_bytes: bytes) -> tuple[str, int]:
    """Return (bibtex_text, entry_count) for a PDF's reference list."""
    document = pymupdf.open(stream=file_bytes, filetype="pdf")
    try:
        text = "\n".join(page.get_text() for page in document)
    finally:
        document.close()

    if not text.strip():
        raise ValueError(
            "No text found — this PDF may be scanned images, which needs OCR"
        )

    section = _extract_reference_section(text)
    records = list(_iter_entries(section))
    if not records:
        raise ValueError("Found a reference section but couldn't parse any entries")

    # ASCII only: .bib files are frequently read by tools that assume latin-1.
    header = (
        "% Extracted by OpenConverter - reference parsing is heuristic,\n"
        "% so please check fields before using these entries.\n\n"
    )
    return header + "\n\n".join(_format_entry(r) for r in records) + "\n", len(records)
