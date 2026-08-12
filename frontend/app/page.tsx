"use client";

import { useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const pdfs = Array.from(incoming).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    setFiles((prev) => [...prev, ...pdfs]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    setError(null);

    try {
      if (files.length === 1) {
        const formData = new FormData();
        formData.append("file", files[0]);

        const res = await fetch(`${API_URL}/api/convert/pdf-to-markdown`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail ?? `Conversion failed (${res.status})`);
        }
        const { filename, markdown } = await res.json();
        triggerDownload(new Blob([markdown], { type: "text/markdown" }), filename);
      } else {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        const res = await fetch(`${API_URL}/api/convert/pdf-to-markdown/batch`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail ?? `Conversion failed (${res.status})`);
        }
        const blob = await res.blob();
        triggerDownload(blob, "converted.zip");
      }
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold">OpenConverter</h1>
        <p className="text-sm text-gray-500">
          PDF to Markdown, free, no signup. Drop your files below.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full max-w-md cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-300 dark:border-gray-700"
        }`}
      >
        <p className="font-medium">Drag & drop PDF files here</p>
        <p className="text-sm text-gray-500">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="w-full max-w-md divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="truncate">{file.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="ml-2 text-gray-400 hover:text-red-500"
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleConvert}
        disabled={files.length === 0 || isConverting}
        className="rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background disabled:opacity-40"
      >
        {isConverting ? "Converting…" : `Convert${files.length > 1 ? ` ${files.length} files` : ""}`}
      </button>
    </main>
  );
}
