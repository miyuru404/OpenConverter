"use client";

import ThemeToggle from "@/components/ThemeToggle";

export default function TopBar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-hairline px-7 py-4">
      <div className="relative w-full max-w-[460px]">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label="Search tools"
          placeholder={'Search tools — try "pdf", "image", or "table"'}
          className="w-full rounded border border-border-field bg-active py-2.5 pl-9 pr-3 text-[13.5px] text-text outline-none placeholder:text-faint focus:border-accent"
        />
      </div>

      <div className="flex items-center gap-4 text-[13.5px] text-secondary">
        <a
          href="https://github.com/miyuru404/OpenConverter#readme"
          target="_blank"
          rel="noreferrer noopener"
          className="hidden hover:text-text sm:inline"
        >
          Docs
        </a>
        <a
          href="https://github.com/miyuru404/OpenConverter"
          target="_blank"
          rel="noreferrer noopener"
          className="hidden hover:text-text sm:inline"
        >
          GitHub
        </a>
        <ThemeToggle />
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
