# OCR needs the Tesseract binary, which Render's native Python runtime cannot
# install — hence the switch to a container for this service.
FROM python:3.12-slim

# tesseract-ocr-eng is the English language data; add more `tesseract-ocr-<lang>`
# packages here to support other languages.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# PyMuPDF locates language files through TESSDATA_PREFIX. The path is
# version-dependent (Debian bookworm ships Tesseract 5), so resolve it at build
# time rather than hardcoding a guess that breaks on the next base image bump.
RUN TESSDATA="$(dirname "$(find /usr/share -name 'eng.traineddata' | head -1)")" \
    && test -n "$TESSDATA" \
    && echo "$TESSDATA" > /etc/tessdata_path \
    && echo "Resolved TESSDATA_PREFIX to $TESSDATA"

WORKDIR /app

# Dependencies first so edits to application code reuse the cached layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1

# Render injects PORT; default to 8000 for local runs.
CMD ["sh", "-c", "TESSDATA_PREFIX=$(cat /etc/tessdata_path) uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
