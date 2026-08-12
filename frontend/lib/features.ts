export type FeatureStatus = "available" | "soon";

export type FeatureCategory = "Documents" | "Images" | "Data" | "Utilities";

/** A dropdown rendered on the tool screen and sent as a form field. */
export interface FeatureOption {
  name: string;
  label: string;
  default: string;
  choices: { value: string; label: string }[];
  /** Only show this option while another option holds a given value. */
  showWhen?: { option: string; equals: string };
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  /** Short format badge shown on the card, e.g. "PDF → MD". */
  from: string;
  to: string;
  category: FeatureCategory;
  status: FeatureStatus;
  /** Value for the file input's accept attribute on the tool screen. */
  accept: string;
  /** Extra terms matched by the search box but not shown in the UI. */
  keywords: string[];
  /** API path for converting a single file. Present once the tool is built. */
  endpoint?: string;
  /** API path that converts many files into one zip, where supported. */
  batchEndpoint?: string;
  /**
   * "each" posts one file per request; "all" sends every file in a single
   * request (needed by operations like merge that act across files).
   */
  uploadMode?: "each" | "all";
  options?: FeatureOption[];
}

export const FEATURES: Feature[] = [
  {
    id: "pdf-to-markdown",
    title: "PDF to Markdown",
    description:
      "Convert PDFs into clean Markdown with headings, tables, and reading order preserved. Built for research papers and multi-column layouts.",
    from: "PDF",
    to: "MD",
    category: "Documents",
    status: "available",
    accept: "application/pdf,.pdf",
    keywords: ["paper", "research", "text", "extract", "llm", "markdown"],
    endpoint: "/api/convert/pdf-to-markdown",
    batchEndpoint: "/api/convert/pdf-to-markdown/batch",
  },
  {
    id: "pdf-to-docx",
    title: "PDF to Word",
    description:
      "Turn a PDF into an editable Word document, keeping layout and formatting as close to the original as possible.",
    from: "PDF",
    to: "DOCX",
    category: "Documents",
    status: "available",
    accept: "application/pdf,.pdf",
    keywords: ["word", "editable", "office", "docx"],
    endpoint: "/api/convert/pdf-to-docx",
  },
  {
    id: "office-to-markdown",
    title: "Word / PowerPoint to Markdown",
    description:
      "Convert .docx and .pptx files into Markdown, so documents and slide decks become plain text you can version control.",
    from: "DOCX",
    to: "MD",
    category: "Documents",
    status: "available",
    accept: ".docx,.pptx",
    keywords: ["word", "powerpoint", "slides", "deck", "office", "pptx"],
    endpoint: "/api/convert/office-to-markdown",
  },
  {
    id: "markdown-to-pdf",
    title: "Markdown to PDF",
    description:
      "Render Markdown into a styled, print-ready PDF with proper typography, code blocks, and page breaks.",
    from: "MD",
    to: "PDF",
    category: "Documents",
    status: "available",
    accept: ".md,.markdown,.txt,text/markdown",
    keywords: ["render", "print", "export", "publish"],
    endpoint: "/api/convert/markdown-to-pdf",
    options: [
      {
        name: "page_size",
        label: "Page size",
        default: "a4",
        choices: [
          { value: "a4", label: "A4" },
          { value: "letter", label: "US Letter" },
        ],
      },
    ],
  },
  {
    id: "image-convert",
    title: "Image Format Converter",
    description:
      "Convert between PNG, JPG, WebP, and other image formats, with control over quality and transparency.",
    from: "PNG",
    to: "JPG",
    category: "Images",
    status: "available",
    accept: ".png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif,.gif",
    keywords: ["png", "jpg", "jpeg", "webp", "photo", "picture", "bmp", "tiff"],
    endpoint: "/api/convert/image",
    options: [
      {
        name: "output_format",
        label: "Convert to",
        default: "png",
        choices: [
          { value: "png", label: "PNG" },
          { value: "jpg", label: "JPG" },
          { value: "webp", label: "WebP" },
          { value: "bmp", label: "BMP" },
          { value: "tiff", label: "TIFF" },
        ],
      },
      {
        name: "quality",
        label: "Quality",
        default: "85",
        choices: [
          { value: "95", label: "High (95)" },
          { value: "85", label: "Balanced (85)" },
          { value: "70", label: "Smaller file (70)" },
        ],
      },
    ],
  },
  {
    id: "pdf-to-images",
    title: "PDF to Images",
    description:
      "Export each page of a PDF as a separate PNG or JPG file, at the resolution you choose.",
    from: "PDF",
    to: "PNG",
    category: "Images",
    status: "available",
    accept: "application/pdf,.pdf",
    keywords: ["page", "render", "screenshot", "thumbnail", "export"],
    endpoint: "/api/convert/pdf-to-images",
    options: [
      {
        name: "image_format",
        label: "Format",
        default: "png",
        choices: [
          { value: "png", label: "PNG" },
          { value: "jpg", label: "JPG" },
        ],
      },
      {
        name: "dpi",
        label: "Resolution",
        default: "150",
        choices: [
          { value: "200", label: "High (200 DPI)" },
          { value: "150", label: "Standard (150 DPI)" },
          { value: "96", label: "Screen (96 DPI)" },
        ],
      },
    ],
  },
  {
    id: "table-extraction",
    title: "Table Extraction",
    description:
      "Pull tables out of PDFs into CSV or Excel, keeping rows and columns intact instead of a flat wall of text.",
    from: "PDF",
    to: "CSV",
    category: "Data",
    status: "available",
    accept: "application/pdf,.pdf",
    keywords: ["excel", "xlsx", "spreadsheet", "csv", "data", "rows"],
    endpoint: "/api/extract/tables",
    options: [
      {
        name: "output_format",
        label: "Output",
        default: "xlsx",
        choices: [
          { value: "xlsx", label: "Excel (.xlsx)" },
          { value: "csv", label: "CSV (zipped)" },
        ],
      },
    ],
  },
  {
    id: "citation-extraction",
    title: "Citation Extraction",
    description:
      "Extract references from a paper into BibTeX, ready to drop straight into your reference manager.",
    from: "PDF",
    to: "BIB",
    category: "Data",
    status: "available",
    accept: "application/pdf,.pdf",
    keywords: ["bibtex", "reference", "bibliography", "zotero", "latex"],
    endpoint: "/api/extract/citations",
  },
  {
    id: "ocr",
    title: "OCR for Scanned PDFs",
    description:
      "Run optical character recognition over scanned documents and images to make them searchable and selectable.",
    from: "SCAN",
    to: "TEXT",
    category: "Utilities",
    status: "soon",
    accept: "application/pdf,.pdf,image/*",
    keywords: ["scan", "recognise", "recognize", "searchable", "tesseract"],
  },
  {
    id: "pdf-tools",
    title: "PDF Utilities",
    description:
      "Merge, split, compress, and rotate PDFs — the everyday housekeeping tasks, without uploading to a sketchy site.",
    from: "PDF",
    to: "PDF",
    category: "Utilities",
    status: "available",
    accept: "application/pdf,.pdf",
    keywords: ["merge", "split", "compress", "rotate", "combine", "shrink"],
    endpoint: "/api/tools/pdf",
    uploadMode: "all",
    options: [
      {
        name: "operation",
        label: "Operation",
        default: "merge",
        choices: [
          { value: "merge", label: "Merge into one PDF" },
          { value: "split", label: "Split into single pages" },
          { value: "rotate", label: "Rotate pages" },
          { value: "compress", label: "Compress" },
        ],
      },
      {
        name: "angle",
        label: "Rotation",
        default: "90",
        showWhen: { option: "operation", equals: "rotate" },
        choices: [
          { value: "90", label: "90° clockwise" },
          { value: "180", label: "180°" },
          { value: "270", label: "270° clockwise" },
        ],
      },
    ],
  },
];

/** Category rows for the sidebar rail, with counts taken from the data. */
export function categoryCounts(
  features: Feature[]
): { category: FeatureCategory; count: number }[] {
  const order: FeatureCategory[] = ["Documents", "Images", "Data", "Utilities"];
  return order
    .map((category) => ({
      category,
      count: features.filter((f) => f.category === category).length,
    }))
    .filter((row) => row.count > 0);
}

export function statusCounts(features: Feature[]) {
  const live = features.filter((f) => f.status === "available").length;
  return { live, soon: features.length - live };
}

/** Distinct source formats, for the "From" dropdown. */
export function fromFormats(features: Feature[]): string[] {
  return [...new Set(features.map((f) => f.from))].sort();
}

/** Targets reachable from a given source format, for the "To" dropdown. */
export function toFormatsFor(features: Feature[], from: string): string[] {
  return [...new Set(features.filter((f) => f.from === from).map((f) => f.to))].sort();
}

export function findFeature(
  features: Feature[],
  from: string,
  to: string
): Feature | undefined {
  return features.find((f) => f.from === from && f.to === to);
}

/** Used by the swap control: only swap when the reverse conversion exists. */
export function hasReverse(features: Feature[], from: string, to: string): boolean {
  return features.some((f) => f.from === to && f.to === from);
}

/** Maps a dropped file's extension onto a source format, to preset "From". */
export function formatForFile(features: Feature[], filename: string): string | null {
  const extension = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  if (!extension) return null;

  const match = features.find((feature) =>
    feature.accept
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .includes(extension)
  );
  return match ? match.from : null;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Ranks features by where the query matches: title beats formats and keywords,
 * which beat the description. Description and keyword matches are anchored to a
 * word boundary so "table" doesn't match "editable" or "selectable".
 */
export function searchFeatures(features: Feature[], query: string): Feature[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return features;

  return features
    .map((feature) => {
      const title = feature.title.toLowerCase();
      const formats = `${feature.from} ${feature.to}`.toLowerCase();
      const keywords = feature.keywords.join(" ").toLowerCase();
      const category = feature.category.toLowerCase();
      const description = feature.description.toLowerCase();

      let score = 0;
      for (const term of terms) {
        const atWordStart = new RegExp(`\\b${escapeRegExp(term)}`);

        let termScore = 0;
        if (title.includes(term)) termScore = 10;
        else if (atWordStart.test(formats) || atWordStart.test(keywords)) termScore = 6;
        else if (atWordStart.test(category)) termScore = 4;
        else if (atWordStart.test(description)) termScore = 2;

        // Every term must match somewhere, so multi-word queries narrow results.
        if (termScore === 0) return { feature, score: 0 };
        score += termScore;
      }

      return { feature, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.feature);
}
