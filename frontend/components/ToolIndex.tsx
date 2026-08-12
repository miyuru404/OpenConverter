"use client";

import type { Feature } from "@/lib/features";

export default function ToolIndex({
  features,
  selectedId,
  onSelect,
}: {
  features: Feature[];
  selectedId: string | null;
  onSelect: (feature: Feature) => void;
}) {
  return (
    <section className="p-7">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <span className="label !text-[11px] text-muted">All tools</span>
        <span className="text-[13px] text-faint">Sorted by status</span>
      </div>

      {features.length === 0 ? (
        <p className="rounded border border-dashed border-border-dashed px-6 py-12 text-center text-sm text-muted">
          No tools match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {features.map((feature) => (
            <ToolCard
              key={feature.id}
              feature={feature}
              isSelected={feature.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ToolCard({
  feature,
  isSelected,
  onSelect,
}: {
  feature: Feature;
  isSelected: boolean;
  onSelect: (feature: Feature) => void;
}) {
  const isAvailable = feature.status === "available";

  return (
    <button
      onClick={() => isAvailable && onSelect(feature)}
      disabled={!isAvailable}
      aria-current={isSelected ? "true" : undefined}
      data-transition
      className={`flex flex-col gap-2.5 rounded-[5px] border bg-surface px-[18px] py-4 text-left ${
        isSelected ? "border-accent" : "border-border-card"
      } ${
        isAvailable
          ? "cursor-pointer hover:border-border-field"
          : "cursor-default opacity-70"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-[7px] font-mono text-[11.5px]">
          <span className="rounded-[3px] border border-border-field bg-inset px-1.5 py-0.5">
            {feature.from}
          </span>
          <span className="text-label" aria-hidden="true">
            →
          </span>
          <span className="rounded-[3px] border border-border-field bg-inset px-1.5 py-0.5">
            {feature.to}
          </span>
        </span>
        <span
          className={`font-mono text-[11px] ${
            isAvailable ? "text-live" : "text-soon"
          }`}
        >
          {isAvailable ? "Live" : "Soon"}
        </span>
      </div>

      <span className="text-[15px] font-semibold tracking-[-0.01em]">
        {feature.title}
      </span>
      <span className="text-[13px] leading-[1.45] text-muted">
        {feature.description}
      </span>
    </button>
  );
}
