import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[var(--page)] px-5 py-20 text-ink sm:px-8 sm:py-28">
      <section className="w-full max-w-xl text-center" aria-labelledby="missing-page-title">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-surface-soft text-accent">
          <svg aria-hidden="true" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M24 13C18 9 10 9 5 11v27c6-2 13-2 19 2 6-4 13-4 19-2V11c-5-2-13-2-19 2Zm0 0v27" />
            <path d="M11 18c3-1 6 0 8 1m-8 6c3-1 6 0 8 1m10-7c2-1 5-2 8-1m-8 8c2-1 5-2 8-1" />
          </svg>
        </div>
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted">A little plot twist</p>
        <h1 id="missing-page-title" className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Shall we find you another story?</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted">We couldn’t find this page. The link may have changed, but there’s plenty more to discover.</p>
        <Link href="/" className="btn-primary mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 text-sm font-semibold">Show me more stories</Link>
      </section>
    </main>
  );
}
