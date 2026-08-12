import io
import os
import zipfile
from typing import Iterable

from fastapi import HTTPException, UploadFile

# Guard rails. The free Render instance has 512 MB of RAM, and uploads are held
# in memory during conversion, so unbounded input is a real out-of-memory risk.
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
MAX_BATCH_FILES = int(os.getenv("MAX_BATCH_FILES", "20"))


def file_stem(filename: str) -> str:
    """Filename without its extension, falling back to a safe default."""
    base = os.path.basename(filename or "").strip()
    stem = base.rsplit(".", 1)[0] if "." in base else base
    return stem or "converted"


async def read_upload(file: UploadFile, allowed_extensions: set[str]) -> bytes:
    """Read an upload, rejecting the wrong type or anything oversized."""
    name = file.filename or "file"
    extension = os.path.splitext(name)[1].lower()

    if extension not in allowed_extensions:
        expected = ", ".join(sorted(allowed_extensions))
        raise HTTPException(
            status_code=400,
            detail=f"{name} is not a supported file (expected: {expected})",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail=f"{name} is empty")

    if len(data) > MAX_UPLOAD_BYTES:
        actual = len(data) / 1024 / 1024
        raise HTTPException(
            status_code=413,
            detail=f"{name} is {actual:.1f} MB — the limit is {MAX_UPLOAD_MB} MB",
        )

    return data


def check_batch_size(files: list[UploadFile]) -> None:
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded")
    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(
            status_code=413,
            detail=f"{len(files)} files exceeds the batch limit of {MAX_BATCH_FILES}",
        )


def build_zip(entries: Iterable[tuple[str, bytes | str]]) -> io.BytesIO:
    """Zip an iterable of (filename, content) pairs into an in-memory buffer."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries:
            archive.writestr(name, content)
    buffer.seek(0)
    return buffer


def attachment_headers(filename: str) -> dict[str, str]:
    return {"Content-Disposition": f'attachment; filename="{filename}"'}
