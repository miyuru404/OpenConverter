"use client";

import { useMemo, useState } from "react";
import FeatureCard from "@/components/FeatureCard";
import { FEATURES, searchFeatures, type Feature } from "@/lib/features";

export default function HomeView({
  onSelectFeature,
}: {
  onSelectFeature: (feature: Feature) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchFeatures(FEATURES, query), [query]);
  const liveCount = FEATURES.filter((f) => f.status === "available").length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-24 pt-12">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Convert anything, free
        </h1>
        <p className="max-w-xl text-balance leading-relaxed text-muted">
          Documents, images, and data — converted in your browser with no signup and
          no installs. Files are deleted after conversion.
        </p>
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{liveCount}</span> tool live ·{" "}
          <span className="font-medium text-foreground">{FEATURES.length - liveCount}</span>{" "}
          on the way
        </p>
      </section>

      <SearchBar value={query} onChange={setQuery} />

      {results.length > 0 ? (
        <section>
          <p className="mb-4 text-sm text-muted" role="status" aria-live="polite">
            {query
              ? `${results.length} ${results.length === 1 ? "tool" : "tools"} matching “${query}”`
              : "All tools"}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onSelect={onSelectFeature}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState query={query} onClear={() => setQuery("")} />
      )}
    </main>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden="true"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>

      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tools — try “pdf”, “image”, or “table”"
        aria-label="Search tools"
        className="w-full rounded-full border border-border bg-surface py-3 pl-11 pr-11 text-sm outline-none transition-colors placeholder:text-muted focus:border-foreground/30 focus:ring-2 focus:ring-accent/30"
      />

      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <p className="font-medium">No tools match “{query}”</p>
      <p className="max-w-sm text-sm text-muted">
        Try a format name like <span className="font-mono">pdf</span>,{" "}
        <span className="font-mono">docx</span>, or <span className="font-mono">csv</span>.
      </p>
      <button
        onClick={onClear}
        className="mt-1 rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-surface"
      >
        Clear search
      </button>
    </div>
  );
}
