import { COVER_PALETTES, defaultPalette, type CoverStyle } from "@/lib/cover-style";

// Renders a story's cover, in precedence order: an uploaded image, then a
// generated designed-template cover, then a generic placeholder. `className`
// sets the size/shape (e.g. "h-40 w-28 rounded-md"); BookCover adds the look.
export function BookCover({
  title,
  author,
  coverUrl,
  coverStyle,
  className = "",
}: {
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  coverStyle?: CoverStyle | null;
  className?: string;
}) {
  const paletteIndex = (coverStyle ?? { palette: defaultPalette(title) }).palette;
  const pal = COVER_PALETTES[paletteIndex % COVER_PALETTES.length];

  return (
    <div
      role="img"
      aria-label={`Cover of ${title}`}
      className={`book-cover relative select-none overflow-hidden rounded-r-lg rounded-l-sm border border-black/10 shadow-[0_4px_14px_rgba(0,0,0,0.12)] dark:border-white/10 ${className}`}
      style={coverUrl ? undefined : { background: pal.bg, color: pal.fg }}
    >
      {/* 3D Spine crease highlight and shadow on the left edge */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[6px] bg-gradient-to-r from-black/35 via-black/15 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-[6px] z-20 w-[1.5px] bg-white/20"
      />

      {/* Right page-turn edge highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[2px] bg-gradient-to-l from-black/20 to-transparent"
      />

      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={`Cover of ${title}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="relative z-10 flex h-full w-full flex-col justify-between p-[10%] text-left">
          {/* Subtle top ornament */}
          <div className="flex flex-col items-start gap-2">
            <span
              className="h-0.5 w-6 rounded-full"
              style={{ background: pal.accent }}
            />
            <span className="book-cover-kicker font-medium uppercase tracking-[0.16em] opacity-80">
              Talerooms
            </span>
          </div>

          {/* Title in editorial serif */}
          <div className="my-auto py-3">
            <span
              className="book-cover-title font-serif font-medium leading-[1.05] tracking-tight"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {title}
            </span>
          </div>

          {/* Author line at foot */}
          <div className="border-t border-white/15 pt-1.5">
            <span className="book-cover-author block w-full truncate font-medium uppercase tracking-wider opacity-85">
              {author || "Original"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
