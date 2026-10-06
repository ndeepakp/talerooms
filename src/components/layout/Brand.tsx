import Link from "next/link";

/** One brand lockup for the public landing page and signed-in navigation. */
export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} aria-label="Talerooms — home" className="group inline-flex shrink-0 items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-surface-raised">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-5 w-5">
          <path d="M12 5.5C9.5 3.7 6.8 3.8 3 4.5v14c3.8-.7 6.5-.8 9 1 2.5-1.8 5.2-1.7 9-1v-14c-3.8-.7-6.5-.8-9 1Z" />
          <path d="M12 5.5v14M6.5 8l2 .3M15.5 8.3l2-.3" />
        </svg>
      </span>
      <span className={`${compact ? "hidden sm:inline " : ""}font-serif text-2xl font-semibold tracking-tight text-ink`}>
        talerooms<span className="text-accent">.</span>
      </span>
    </Link>
  );
}
