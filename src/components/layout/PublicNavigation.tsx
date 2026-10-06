import Link from "next/link";
import { Brand } from "@/components/layout/Brand";

export function PublicNavigation() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
      <Brand />
      <Link href="/about" className="rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-ink">
        Our story
      </Link>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-ui px-5 py-6 text-xs text-muted sm:px-8">
      <p>© {new Date().getFullYear()} Talerooms</p>
      <nav aria-label="Footer" className="flex gap-6">
        <Link href="/about" className="py-2 hover:text-ink">About Talerooms</Link>
        <Link href="/login" className="py-2 hover:text-ink">Log in</Link>
      </nav>
    </footer>
  );
}
