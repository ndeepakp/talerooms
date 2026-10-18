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
      <div className="mx-auto flex min-h-18 w-full max-w-[1328px] flex-wrap items-center gap-2 px-4 py-3 max-[360px]:gap-1 max-[360px]:px-2 sm:flex-nowrap sm:gap-4 sm:px-6 lg:gap-6">
        <Brand href="/feed" compact />
        <Link
          href={profileHref}
          aria-label="View profile"
          className="order-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ui p-0.5 transition-colors hover:border-ui-strong"
        >
          <Avatar src={user.image} name={user.name} size={38} />
        </Link>
        <div className="order-4 w-full min-w-0 sm:order-none sm:flex-1">
          <SearchBar />
        </div>
        <div className="app-nav-actions ml-auto flex shrink-0 items-center gap-2 max-[360px]:gap-1 sm:ml-0">
          <HeaderWriteAction />
          {notifications}
          <NavMenu />
        </div>
      </div>
    </header>
  );
}
