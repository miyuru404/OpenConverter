"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RecentEntry } from "@/lib/recent";
import {
  fromFormats,
  hasReverse,
  findFeature,
  formatForFile,
  statusCounts,
  toFormatsFor,
  type Feature,
} from "@/lib/features";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ConversionState = "idle" | "converting" | "done" | "error";

function filenameFromHeaders(res: Response, fallback: string): string {
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ConverterPanel({
  features,
  selected,
  onSelectPair,
  onConverted,
}: {
  features: Feature[];
  selected: Feature | null;
  onSelectPair: (feature: Feature) => void;
  onConverted: (entry: RecentEntry) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<ConversionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);
  // Options are stored alongside the tool they belong to, so switching tools
  // falls back to that tool's defaults during render — no reset effect needed.
  const [optionState, setOptionState] = useState<{
    toolId: string | null;
    values: Record<string, string>;
  }>({ toolId: null, values: {} });
  const inputRef = useRef<HTMLInputElement>(null);

  const { live, soon } = statusCounts(features);
  const sources = fromFormats(features);
  const targets = selected ? toFormatsFor(features, selected.from) : [];
  const canSwap = selected ? hasReverse(features, selected.from, selected.to) : false;
  const isAvailable = selected?.status === "available";

  const optionValues = useMemo(() => {
    const defaults = Object.fromEntries(
      (selected?.options ?? []).map((option) => [option.name, option.default])
    );
    return optionState.toolId === selected?.id
      ? { ...defaults, ...optionState.values }
      : defaults;
  }, [selected, optionState]);

  const setOption = (name: string, value: string) =>
    setOptionState((previous) => ({
      toolId: selected?.id ?? null,
      values:
        previous.toolId === selected?.id
          ? { ...previous.values, [name]: value }
          : { [name]: value },
    }));

  // Release the object URL when the result is replaced or the panel unmounts.
  const resultUrl = result?.url;
  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const visibleOptions = useMemo(
    () =>
      (selected?.options ?? []).filter(
        (option) =>
          !option.showWhen ||
          optionValues[option.showWhen.option] === option.showWhen.equals
      ),
    [selected, optionValues]
  );

  const reset = () => {
    setFiles([]);
    setState("idle");
    setError(null);
    setResult(null);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const list = Array.from(incoming);

    // A dropped file tells us the source format; follow it if it maps to a tool.
    const detected = formatForFile(features, list[0].name);
    if (detected && detected !== selected?.from) {
      const next =
        features.find((f) => f.from === detected && f.status === "available") ??
        features.find((f) => f.from === detected);
      if (next) onSelectPair(next);
    }

    setFiles((prev) => [...prev, ...list]);
    setState("idle");
    setError(null);
    setResult(null);
  };

  const changeFrom = (from: string) => {
    const next =
      features.find((f) => f.from === from && f.status === "available") ??
      features.find((f) => f.from === from);
    if (next) onSelectPair(next);
  };

  const changeTo = (to: string) => {
    if (!selected) return;
    const next = findFeature(features, selected.from, to);
    if (next) onSelectPair(next);
  };

  const swap = () => {
    if (!selected || !canSwap) return;
    const next = findFeature(features, selected.to, selected.from);
    if (next) onSelectPair(next);
  };

  const convert = async () => {
    if (!selected?.endpoint || files.length === 0) return;
    setState("converting");
    setError(null);

    try {
      const sent = Object.fromEntries(
        visibleOptions.map((option) => [option.name, optionValues[option.name]])
      );

      const formData = new FormData();
      const useBatch = files.length > 1 && selected.batchEndpoint;
      const field = useBatch || selected.uploadMode === "all" ? "files" : "file";
      const targetFiles = field === "file" ? files.slice(0, 1) : files;
      targetFiles.forEach((file) => formData.append(field, file));
      Object.entries(sent).forEach(([key, value]) => formData.append(key, value));

      const path = useBatch ? selected.batchEndpoint! : selected.endpoint;
      const res = await fetch(`${API_URL}${path}`, { method: "POST", body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = typeof body?.detail === "string" ? body.detail : null;
        throw new Error(detail ?? `Conversion failed (${res.status})`);
      }

      let blob: Blob;
      let name: string;
      if ((res.headers.get("content-type") ?? "").includes("application/json")) {
        const payload = await res.json();
        blob = new Blob([payload.markdown], { type: "text/markdown" });
        name = payload.filename;
      } else {
        blob = await res.blob();
        name = filenameFromHeaders(res, "converted");
      }

      setResult({ url: URL.createObjectURL(blob), name });
      setState("done");
      onConverted({
        name: files[0].name,
        from: selected.from,
        to: selected.to,
        at: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  };

  return (
    <section className="flex flex-col gap-[22px] rounded-md border border-border-card bg-surface px-7 py-[26px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[27px] font-semibold tracking-[-0.02em]">
          Convert anything, free
        </h1>
        <span className="font-mono text-xs text-muted">
          {live} live · {soon} on the way
        </span>
      </div>

      <div className="grid grid-cols-[1fr_44px_1fr] items-center gap-3">
        <FormatSelect
          label="From"
          value={selected?.from ?? ""}
          options={sources}
          onChange={changeFrom}
        />
        <button
          onClick={swap}
          disabled={!canSwap}
          aria-label="Swap source and target formats"
          title={canSwap ? "Swap formats" : "No reverse conversion available"}
          className="mx-auto flex flex-col items-center gap-1 disabled:opacity-40"
        >
          <Arrow direction="right" className="text-accent" />
          <Arrow direction="left" className="text-dot-inactive" />
        </button>
        <FormatSelect
          label="To"
          value={selected?.to ?? ""}
          options={targets}
          onChange={changeTo}
        />
      </div>

      {selected && (
        <p className="-mt-2 text-[13px] leading-[1.45] text-muted">
          {selected.description}
        </p>
      )}

      {isAvailable && visibleOptions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {visibleOptions.map((option) => (
            <label key={option.name} className="flex flex-col gap-1.5">
              <span className="label">{option.label}</span>
              <select
                value={optionValues[option.name] ?? option.default}
                onChange={(event) => setOption(option.name, event.target.value)}
                className="rounded border border-border-field bg-inset px-3 py-2 text-sm text-text outline-none focus:border-accent"
              >
                {option.choices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {!isAvailable && selected && (
        <p className="rounded border border-dashed border-border-dashed px-4 py-3 text-[13.5px] leading-[1.5] text-muted">
          This conversion isn&apos;t built yet — it&apos;s on the way.
        </p>
      )}

      {state === "done" && result ? (
        <div className="flex flex-col items-center gap-4 rounded border border-border-field bg-inset px-6 py-8 text-center">
          <p className="text-[15px] font-medium">Converted</p>
          <p className="font-mono text-[11.5px] text-muted">{result.name}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={result.url}
              download={result.name}
              className="rounded bg-accent px-[18px] py-2.5 text-[13.5px] font-medium text-on-accent hover:bg-accent-hover"
            >
              Download
            </a>
            <button
              onClick={reset}
              className="rounded border border-border-field px-[18px] py-2.5 text-[13.5px] font-medium text-secondary hover:text-text"
            >
              Convert another
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (isAvailable) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (isAvailable) addFiles(event.dataTransfer.files);
            }}
            onClick={() => isAvailable && inputRef.current?.click()}
            aria-disabled={!isAvailable}
            data-transition
            className={`flex items-center justify-center gap-3.5 rounded border border-dashed px-6 py-[30px] text-center ${
              !isAvailable
                ? "cursor-not-allowed border-border-dashed opacity-50"
                : isDragging
                  ? "cursor-pointer border-accent bg-accent/10"
                  : "cursor-pointer border-border-dashed hover:border-border-field"
            }`}
          >
            <span className="text-[14.5px] text-secondary">
              Drop your file here, or
            </span>
            <span className="rounded bg-accent px-[18px] py-2.5 text-[13.5px] font-medium text-on-accent">
              Browse files
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={selected?.accept}
              multiple={Boolean(selected?.batchEndpoint || selected?.uploadMode === "all")}
              disabled={!isAvailable}
              className="hidden"
              onChange={(event) => addFiles(event.target.files)}
            />
          </div>

          {files.length > 0 && (
            <ul className="divide-y divide-hairline rounded border border-border-field">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="truncate">{file.name}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-[11.5px] text-muted">
                      {formatBytes(file.size)}
                    </span>
                    <button
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, i) => i !== index))
                      }
                      aria-label={`Remove ${file.name}`}
                      className="text-muted hover:text-text"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {state === "error" && error && (
            <p className="rounded border border-[#e5484d]/40 bg-[#e5484d]/10 px-4 py-3 text-[13.5px] text-[#e5484d]">
              {error}
            </p>
          )}

          {files.length > 0 && (
            <button
              onClick={convert}
              disabled={state === "converting" || !isAvailable}
              className="self-center rounded bg-accent px-6 py-2.5 text-[13.5px] font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50"
            >
              {state === "converting"
                ? "Converting…"
                : `Convert${files.length > 1 ? ` ${files.length} files` : ""}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function FormatSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 rounded border border-border-field bg-inset px-4 py-3.5">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} format`}
        className="cursor-pointer bg-transparent text-base font-medium text-text outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Arrow({
  direction,
  className,
}: {
  direction: "left" | "right";
  className: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block h-2 w-[22px] ${className}`}
      style={{
        backgroundColor: "currentColor",
        clipPath:
          direction === "right"
            ? "polygon(0 25%, 62% 25%, 62% 0, 100% 50%, 62% 100%, 62% 75%, 0 75%)"
            : "polygon(100% 25%, 38% 25%, 38% 0, 0 50%, 38% 100%, 38% 75%, 100% 75%)",
      }}
    />
  );
}
