/**
 * The OpenConverter mark.
 *
 * The source SVG strokes the back page in #171b1f, which all but disappears
 * against the dark theme's near-black background. Here that stroke is
 * `currentColor` so it tracks the text colour in either theme, while the teal
 * document keeps the brand colour (it reads well on both).
 */
export const BRAND_TEAL = "#0091ad";

export default function Logo({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 92 92"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Back page — follows the theme's foreground colour. */}
      <rect
        x="1.5"
        y="1.5"
        width="57"
        height="73"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      {/* Front document with its folded corner. */}
      <path
        d="M35 16H75.2L92 34.24V89a3 3 0 0 1-3 3H35a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3Z"
        fill={BRAND_TEAL}
      />
      {/* Conversion arrows, white on teal in both themes. */}
      <path d="M43 44.16h25.84V40L81 46.5l-12.16 6.5v-4.16H43Z" fill="#ffffff" />
      <path d="M81 61.9H55.16V58L43 64.5l12.16 6.5v-3.9H81Z" fill="#ffffff" />
    </svg>
  );
}
