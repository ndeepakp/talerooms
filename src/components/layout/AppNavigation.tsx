import type { ReactNode } from "react";
import Link from "next/link";
import { NavMenu } from "@/components/layout/NavMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SearchBar } from "@/components/layout/SearchBar";
import { Avatar } from "@/components/layout/Avatar";
import { HeaderWriteAction } from "./HeaderWriteAction";
import { Brand } from "@/components/layout/Brand";

export function AppNavigation({ profileHref, user, notifications = <NotificationBell /> }: {
  profileHref: string;
  user: { name?: string | null; image?: string | null };
  notifications?: ReactNode;
}) {
  return (
    <header className="app-header sticky top-0 z-40">
      <div className="mx-auto flex min-h-18 w-full max-w-[1328px] flex-wrap items-center gap-2 px-4 py-3 sm:flex-nowrap sm:gap-5 sm:px-6">
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
          <HeaderWriteAction />
          {notifications}
          <NavMenu profileHref={profileHref} />
        </div>
      </div>
    </header>
  );
}
