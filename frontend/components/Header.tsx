"use client";

import ThemeToggle from "@/components/ThemeToggle";

export default function Header({
  onHome,
  showHomeButton,
}: {
  onHome: () => void;
  showHomeButton: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
        <button
          onClick={onHome}
          aria-label="OpenConverter home"
          className="flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          <LogoMark />
          OpenConverter
        </button>

        <div className="flex items-center gap-2">
          {showHomeButton && (
            <button
              onClick={onHome}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-surface"
            >
              Home
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h11l-3-3M20 16H9l3 3" />
    </svg>
  );
}
