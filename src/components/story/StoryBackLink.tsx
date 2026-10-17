import Link from "next/link";

export function StoryBackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="story-back-link">
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
    {children}
  </Link>;
}
