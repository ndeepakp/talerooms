import type { ReactNode } from "react";
import Link from "next/link";
import { NavMenu } from "@/components/layout/NavMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SearchBar } from "@/components/layout/SearchBar";
import { Avatar } from "@/components/layout/Avatar";
import { Brand } from "@/components/layout/Brand";

export function AppNavigation({ profileHref, user, notifications = <NotificationBell /> }: {
  profileHref: string;
  user: { name?: string | null; image?: string | null };
  notifications?: ReactNode;
}) {
  return (
    <header className="app-header sticky top-0 z-40">
      <div className="mx-auto flex min-h-18 w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-5 sm:px-6">
        <Brand href="/feed" compact />
        <Link
          href={profileHref}
          aria-label="View profile"
          className="order-3 shrink-0 rounded-full ring-ui-strong transition-shadow hover:ring-2"
        >
          <Avatar src={user.image} name={user.name} size={34} />
        </Link>
        <div className="order-4 w-full min-w-0 sm:order-none sm:flex sm:flex-1 sm:justify-center">
          <div className="w-full max-w-md">
            <SearchBar />
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
          <Link
            href="/write"
            aria-label="Write"
            className="btn-primary flex h-11 w-11 items-center justify-center gap-2 rounded-full text-sm font-medium sm:w-auto sm:px-5"
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
            <span className="hidden sm:inline">Write</span>
          </Link>
          {notifications}
          <NavMenu />
        </div>
      </div>
    </header>
  );
}
