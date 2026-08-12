"use client";

import type { RecentEntry } from "@/lib/recent";

function timeAgo(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export default function RecentCard({ entries }: { entries: RecentEntry[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border-card bg-surface p-[22px]">
      <span className="label">Recent</span>

      {entries.length > 0 && (
        <ul className="flex flex-col gap-3.5">
          {entries.map((entry) => (
            <li key={`${entry.name}-${entry.at}`} className="flex flex-col gap-1">
              <span className="truncate text-sm">{entry.name}</span>
              <span className="font-mono text-[11.5px] text-muted">
                → {entry.to.toLowerCase()} · {timeAgo(entry.at)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-auto text-[12.5px] leading-[1.5] text-faint">
        Nothing is uploaded. History lives in this browser only.
      </p>
    </section>
  );
}
