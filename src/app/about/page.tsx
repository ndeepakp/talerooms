import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter, PublicNavigation } from "@/components/layout/PublicNavigation";

export const metadata: Metadata = {
  title: "Our story · Talerooms",
  description: "A home for original fiction, creator ownership, and the connection between writers and readers.",
};

export default function AboutPage() {
  return (
    <div className="landing-page flex min-h-screen w-full flex-col text-ink">
      <PublicNavigation />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8 sm:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Our story</p>
        <h1 className="mt-5 font-serif text-5xl leading-tight tracking-tight sm:text-6xl">Good stories bring people together.</h1>
        <p className="mt-7 text-lg leading-relaxed text-ink-soft">Talerooms began with a simple belief: original stories deserve a home where writers keep ownership of their work and readers can connect with the people behind it.</p>
        <div className="mt-12 space-y-9 border-t border-ui pt-10">
          <section>
            <h2 className="font-serif text-2xl">Original voices, room to grow.</h2>
            <p className="mt-3 leading-relaxed text-muted">Publish fiction chapter by chapter. Give your ideas a place to unfold, and let readers follow along as your story grows.</p>
          </section>
          <section>
            <h2 className="font-serif text-2xl">Your stories stay yours.</h2>
            <p className="mt-3 leading-relaxed text-muted">Writers retain their rights and choose how to share their work. Your relationship with your readers starts with your voice.</p>
          </section>
          <section>
            <h2 className="font-serif text-2xl">A connection beyond the last page.</h2>
            <p className="mt-3 leading-relaxed text-muted">Discover stories, follow authors, and return when the next chapter arrives. Save your place, bookmark a line, and make the reading room comfortable with your own fonts and page colors.</p>
          </section>
        </div>
        <Link href="/#stories" className="btn-primary mt-12 inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold">Find a story <span aria-hidden="true" className="ml-3">→</span></Link>
      </main>
      <PublicFooter />
    </div>
  );
}
