"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import ConverterPanel from "@/components/ConverterPanel";
import RecentCard from "@/components/RecentCard";
import Sidebar, { type CategoryFilter } from "@/components/Sidebar";
import ToolIndex from "@/components/ToolIndex";
import TopBar from "@/components/TopBar";
import { FEATURES, searchFeatures, type Feature } from "@/lib/features";
import {
  addRecent,
  getRecent,
  getServerRecent,
  subscribeRecent,
} from "@/lib/recent";

export default function Page() {
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Feature | null>(
    () => FEATURES.find((feature) => feature.status === "available") ?? null
  );
  const recent = useSyncExternalStore(
    subscribeRecent,
    getRecent,
    getServerRecent
  );

  const visibleTools = useMemo(() => {
    const byCategory =
      category === "All"
        ? FEATURES
        : FEATURES.filter((feature) => feature.category === category);
    const matched = searchFeatures(byCategory, query);

    // Live tools first, but only when no query — search results are already
    // ordered by relevance and reordering them would fight the ranking.
    if (query.trim()) return matched;
    return [...matched].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === "available" ? -1 : 1;
    });
  }, [category, query]);

  return (
    <div className="lg:grid lg:grid-cols-[232px_1fr]">
      <Sidebar features={FEATURES} active={category} onSelect={setCategory} />

      <main className="flex min-w-0 flex-col">
        <TopBar query={query} onQueryChange={setQuery} />

        <div className="grid gap-6 border-b border-hairline p-7 xl:grid-cols-[1fr_300px]">
          <ConverterPanel
            features={FEATURES}
            selected={selected}
            onSelectPair={setSelected}
            onConverted={addRecent}
          />
          <RecentCard entries={recent} />
        </div>

        <ToolIndex
          features={visibleTools}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </main>
    </div>
  );
}
