"use client";

import type { Feature } from "@/lib/features";

export default function FeatureCard({
  feature,
  onSelect,
}: {
  feature: Feature;
  onSelect: (feature: Feature) => void;
}) {
  const isAvailable = feature.status === "available";

  return (
    <button
      onClick={() => onSelect(feature)}
      className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <FormatBadge from={feature.from} to={feature.to} />
        <StatusPill status={feature.status} />
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="font-semibold leading-snug">{feature.title}</h3>
        <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-xs uppercase tracking-wide text-muted">
          {feature.category}
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-muted transition-colors group-hover:text-foreground">
          {isAvailable ? "Convert" : "Preview"}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </button>
  );
}

function FormatBadge({ from, to }: { from: string; to: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs">
      <span className="rounded-md border border-border bg-background px-2 py-1 font-semibold">
        {from}
      </span>
      <span className="text-muted" aria-hidden="true">
        →
      </span>
      <span className="rounded-md border border-border bg-background px-2 py-1 font-semibold">
        {to}
      </span>
    </span>
  );
}

function StatusPill({ status }: { status: Feature["status"] }) {
  if (status === "available") {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Live
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
      Soon
    </span>
  );
}
