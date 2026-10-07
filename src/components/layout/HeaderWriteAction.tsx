"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Keep the reading room actions in the shared navigation.
export function HeaderWriteAction() {
  const pathname = usePathname();
  const feed = pathname === "/feed";
  return (<>{feed && <Link href="/library" aria-label="Your library" className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-ui-strong text-sm font-medium lg:w-auto lg:px-4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="h-4 w-4"><path d="M4 4h5v16H4zM9 4h5v16H9zM16 4l4-1 4 16-4 1z"/></svg><span className="hidden lg:inline">Your library</span></Link>}<Link
            href="/write"
            aria-label={feed ? "Write a story" : "Write"}
            className="btn-primary flex h-11 w-11 items-center justify-center gap-2 rounded-full text-sm font-medium lg:w-auto lg:px-5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4 shrink-0"
            >
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
            </svg>
            <span className="hidden lg:inline">{feed ? "Write a story" : "Write"}</span>
          </Link></>);
}
