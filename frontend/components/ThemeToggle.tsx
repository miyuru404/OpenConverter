"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const THEME_EVENT = "openconverter:themechange";

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  // Follow the system only while the user hasn't made an explicit choice.
  const onSystemChange = () => {
    if (localStorage.getItem("theme")) return;
    document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    onChange();
  };

  window.addEventListener(THEME_EVENT, onChange);
  media.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    media.removeEventListener("change", onSystemChange);
  };
}

// The inline script in layout.tsx resolves and applies the theme before paint,
// so the DOM attribute is the source of truth on the client.
const getSnapshot = (): Theme =>
  (document.documentElement.dataset.theme as Theme) ?? "light";

// No theme is known during SSR; returning null renders a placeholder instead,
// keeping server and client markup identical through hydration.
const getServerSnapshot = (): Theme | null => null;

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    // Read the live DOM rather than the rendered `theme`, so clicks that land
    // before React re-renders still flip from the current state.
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage unavailable (private mode) — the toggle still works this session.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-field text-secondary hover:border-accent hover:text-text"
    >
      {theme === null ? null : theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
