"use client";

import Logo from "@/components/Logo";
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
          <Logo size={22} />
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
