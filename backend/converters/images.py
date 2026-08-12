import io

# Output formats we offer, mapped to Pillow's format names and file extensions.
OUTPUT_FORMATS = {
    "png": ("PNG", "png"),
    "jpg": ("JPEG", "jpg"),
    "webp": ("WEBP", "webp"),
    "bmp": ("BMP", "bmp"),
    "tiff": ("TIFF", "tiff"),
}

INPUT_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif", ".gif"}

# Pillow refuses to open absurdly large images by default; keep that protection
# but set our own ceiling so a decompression bomb can't exhaust the instance.
MAX_PIXELS = 50_000_000

DEFAULT_QUALITY = 85


def convert_image(file_bytes: bytes, output_format: str, quality: int = DEFAULT_QUALITY) -> bytes:
    from PIL import Image  # lazy import: only paid for when this tool is used

    output_format = output_format.lower()
    if output_format == "jpeg":
        output_format = "jpg"
    if output_format not in OUTPUT_FORMATS:
        raise ValueError(
            f"Unsupported output format '{output_format}' "
            f"(supported: {', '.join(sorted(OUTPUT_FORMATS))})"
        )
    if not 1 <= quality <= 100:
        raise ValueError("Quality must be between 1 and 100")

    pillow_format, _ = OUTPUT_FORMATS[output_format]

    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.load()
    except Exception as exc:
        raise ValueError(f"Couldn't read this image: {exc}") from exc

    with image:
        if image.width * image.height > MAX_PIXELS:
            raise ValueError(
                f"Image is {image.width}x{image.height}, which exceeds the "
                f"{MAX_PIXELS // 1_000_000} megapixel limit"
            )

        # JPEG and BMP have no alpha channel: flatten onto white rather than
        # letting Pillow raise, which is what a user would expect to happen.
        if pillow_format in {"JPEG", "BMP"} and image.mode in {"RGBA", "LA", "P"}:
            from PIL import Image as PILImage

            rgba = image.convert("RGBA")
            background = PILImage.new("RGB", rgba.size, (255, 255, 255))
            background.paste(rgba, mask=rgba.split()[-1])
            image = background
        elif image.mode == "P":
            image = image.convert("RGB")

        buffer = io.BytesIO()
        save_options: dict[str, object] = {}
        if pillow_format in {"JPEG", "WEBP"}:
            save_options["quality"] = quality
        if pillow_format == "JPEG":
            save_options["optimize"] = True

        image.save(buffer, format=pillow_format, **save_options)
        return buffer.getvalue()


def output_extension(output_format: str) -> str:
    key = "jpg" if output_format.lower() == "jpeg" else output_format.lower()
    return OUTPUT_FORMATS[key][1]
