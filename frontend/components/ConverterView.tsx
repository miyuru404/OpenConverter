"use client";

import { useRef, useState } from "react";
import type { Feature } from "@/lib/features";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ConverterView({
  feature,
  onBack,
}: {
  feature: Feature;
  onBack: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAvailable = feature.status === "available";

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || !isAvailable) return;
    setFiles((prev) => [...prev, ...Array.from(incoming)]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (files.length === 0 || !isAvailable) return;
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
        triggerDownload(await res.blob(), "converted.zip");
      }
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 pb-24 pt-8">
      <button
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        All tools
      </button>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{feature.title}</h1>
          <span className="flex items-center gap-1.5 font-mono text-xs">
            <span className="rounded-md border border-border bg-surface px-2 py-1 font-semibold">
              {feature.from}
            </span>
            <span className="text-muted" aria-hidden="true">
              →
            </span>
            <span className="rounded-md border border-border bg-surface px-2 py-1 font-semibold">
              {feature.to}
            </span>
          </span>
        </div>
        <p className="leading-relaxed text-muted">{feature.description}</p>
      </header>

      {!isAvailable && (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-4">
          <p className="text-sm font-medium">This tool isn&apos;t built yet</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            You&apos;re looking at a preview of the interface. Uploading is disabled until
            the conversion is implemented.
          </p>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (isAvailable) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => isAvailable && inputRef.current?.click()}
        aria-disabled={!isAvailable}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          !isAvailable
            ? "cursor-not-allowed border-border opacity-50"
            : isDragging
              ? "cursor-pointer border-accent bg-accent/10"
              : "cursor-pointer border-border hover:bg-surface"
        }`}
      >
        <UploadIcon />
        <p className="mt-1 font-medium">Drag &amp; drop files here</p>
        <p className="text-sm text-muted">
          {isAvailable ? "or click to browse" : "unavailable in preview"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={feature.accept}
          multiple
          disabled={!isAvailable}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className="text-muted transition-colors hover:text-red-500"
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={handleConvert}
        disabled={files.length === 0 || isConverting || !isAvailable}
        className="mx-auto rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {isConverting
          ? "Converting…"
          : `Convert${files.length > 1 ? ` ${files.length} files` : ""}`}
      </button>
    </main>
  );
}

function UploadIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v13" />
    </svg>
  );
}
