import { Menu } from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";
import { Breadcrumbs } from "./breadcrumbs";
import { GlobalSearch } from "./global-search";
import { NotificationsMenu } from "./notifications";
import { ProfileMenu } from "./profile-menu";

/** Sticky top navbar: menu button (mobile), breadcrumbs, global search, notifications and profile dropdown. */
export function Topbar() {
  const { setMobileOpen } = useSidebar();
  return (
    <header className="sticky top-0 z-20 border-b border-navy-700 bg-navy/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu"
          className="grid size-10 shrink-0 place-items-center rounded-md bg-navy-800 text-white ring-1 ring-navy-600 hover:bg-navy-700 lg:hidden">
          <Menu className="size-5" />
        </button>
        <div className="hidden min-w-0 flex-1 md:block lg:flex-none lg:basis-1/3"><Breadcrumbs /></div>
        <div className="flex min-w-0 flex-1 justify-center md:justify-end lg:justify-center"><GlobalSearch /></div>
        <div className="flex shrink-0 items-center gap-1 lg:basis-1/3 lg:justify-end">
          <NotificationsMenu />
          <ProfileMenu />
        </div>
      </div>
      <div className="mx-auto flex h-9 items-center border-t border-navy-700/60 px-4 md:hidden"><Breadcrumbs /></div>
    </header>
  );
}
