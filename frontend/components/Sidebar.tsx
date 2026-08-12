"use client";

import Logo from "@/components/Logo";
import {
  categoryCounts,
  statusCounts,
  type Feature,
  type FeatureCategory,
} from "@/lib/features";

export type CategoryFilter = "All" | FeatureCategory;

export default function Sidebar({
  features,
  active,
  onSelect,
}: {
  features: Feature[];
  active: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
}) {
  const categories = categoryCounts(features);
  const { live, soon } = statusCounts(features);

  return (
    <aside className="flex flex-col gap-7 border-hairline bg-rail px-[18px] py-[22px] lg:min-h-screen lg:border-r">
      <div className="flex items-center gap-2.5 px-1.5">
        <Logo size={22} />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">
          OpenConverter
        </span>
      </div>

      <nav className="flex flex-col gap-[3px]">
        <span className="label px-1.5 pb-2">Categories</span>
        <CategoryRow
          label="All tools"
          count={features.length}
          isActive={active === "All"}
          onClick={() => onSelect("All")}
        />
        {categories.map(({ category, count }) => (
          <CategoryRow
            key={category}
            label={category}
            count={count}
            isActive={active === category}
            onClick={() => onSelect(category)}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-[3px]">
        <span className="label px-1.5 pb-2">Status</span>
        <div className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-secondary">
          <Dot className="bg-live" />
          Live · {live}
        </div>
        <div className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-secondary">
          <Dot className="bg-dot-inactive" />
          On the way · {soon}
        </div>
      </div>

      <p className="rounded border border-hairline px-3 py-3.5 text-[12.5px] leading-[1.5] text-muted lg:mt-auto">
        Everything runs in your browser. Files are deleted after conversion.
      </p>
    </aside>
  );
}

function CategoryRow({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
      className={`flex items-center justify-between rounded px-2.5 py-2.5 text-left text-sm ${
        isActive
          ? "bg-active text-text"
          : "text-secondary hover:bg-active/60 hover:text-text"
      }`}
    >
      <span>{label}</span>
      <span
        className={`font-mono text-[11px] ${isActive ? "text-muted" : "text-label"}`}
      >
        {count}
      </span>
    </button>
  );
}

function Dot({ className }: { className: string }) {
  return (
    <span
      className={`h-[7px] w-[7px] shrink-0 rounded-full ${className}`}
      aria-hidden="true"
    />
  );
}
