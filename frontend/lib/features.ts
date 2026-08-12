export type FeatureStatus = "available" | "soon";

export type FeatureCategory = "Documents" | "Images" | "Data" | "Utilities";

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
    status: "soon",
    accept: "application/pdf,.pdf",
    keywords: ["word", "editable", "office", "docx"],
  },
  {
    id: "office-to-markdown",
    title: "Word / PowerPoint to Markdown",
    description:
      "Convert .docx and .pptx files into Markdown, so documents and slide decks become plain text you can version control.",
    from: "DOCX",
    to: "MD",
    category: "Documents",
    status: "soon",
    accept: ".docx,.pptx",
    keywords: ["word", "powerpoint", "slides", "deck", "office", "pptx"],
  },
  {
    id: "markdown-to-pdf",
    title: "Markdown to PDF",
    description:
      "Render Markdown into a styled, print-ready PDF with proper typography, code blocks, and page breaks.",
    from: "MD",
    to: "PDF",
    category: "Documents",
    status: "soon",
    accept: ".md,.markdown,text/markdown",
    keywords: ["render", "print", "export", "publish"],
  },
  {
    id: "image-convert",
    title: "Image Format Converter",
    description:
      "Convert between PNG, JPG, WebP, and other image formats, with control over quality and transparency.",
    from: "PNG",
    to: "JPG",
    category: "Images",
    status: "soon",
    accept: "image/*",
    keywords: ["png", "jpg", "jpeg", "webp", "photo", "picture", "resize"],
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
  },
  {
    id: "table-extraction",
    title: "Table Extraction",
    description:
      "Pull tables out of PDFs into CSV or Excel, keeping rows and columns intact instead of a flat wall of text.",
    from: "PDF",
    to: "CSV",
    category: "Data",
    status: "soon",
    accept: "application/pdf,.pdf",
    keywords: ["excel", "xlsx", "spreadsheet", "csv", "data", "rows"],
  },
  {
    id: "citation-extraction",
    title: "Citation Extraction",
    description:
      "Extract references from a paper into BibTeX, ready to drop straight into your reference manager.",
    from: "PDF",
    to: "BIB",
    category: "Data",
    status: "soon",
    accept: "application/pdf,.pdf",
    keywords: ["bibtex", "reference", "bibliography", "zotero", "latex"],
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
    status: "soon",
    accept: "application/pdf,.pdf",
    keywords: ["merge", "split", "compress", "rotate", "combine", "shrink"],
  },
];

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
