"use client";

import { useState, type ReactNode } from "react";
import {
  NavLinks,
  MobileTabBar,
  type NavItem,
} from "@/components/nav-links";

const SIDEBAR_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "🏡" },
  { href: "/mentor", label: "Mentor", icon: "🧠", mentor: true },
  { href: "/oracle", label: "Plant Oracle", icon: "🌿" },
  { href: "/journal", label: "Journal", icon: "📓" },
  { href: "/places", label: "Places", icon: "🗺️" },
  { href: "/profile", label: "Profile", icon: "🌱" },
];

const MOBILE_TAB_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "🏡" },
  { href: "/mentor", label: "Mentor", icon: "🧠", mentor: true },
  { href: "/journal", label: "Journal", icon: "📓" },
  { href: "/profile", label: "Profile", icon: "🌱" },
];

export function AppShell({
  children,
  displayName,
  signOutAction,
}: {
  children: ReactNode;
  displayName: string;
  signOutAction: () => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? "md:w-16" : "md:w-60";

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 text-stone-900 md:flex-row">
      <aside
        className={`hidden shrink-0 flex-col border-stone-200 bg-amber-50/90 md:flex ${sidebarWidth} border-r transition-[width] duration-200 ease-out`}
      >
        <div className="flex w-full items-center justify-between gap-2 border-b border-stone-200/80 px-3 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl leading-none" aria-hidden>
              🌿
            </span>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Regenerative Stewards
                </p>
                <p className="truncate text-sm text-stone-800">Hi, {displayName}</p>
              </div>
            ) : (
              <span className="sr-only">Regenerative Stewards — Hi, {displayName}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="shrink-0 rounded-md p-1.5 text-stone-500 hover:bg-stone-200/80 hover:text-stone-800"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          <NavLinks items={SIDEBAR_ITEMS} collapsed={collapsed} />
        </div>

        <div className="border-t border-stone-200/80 p-3">
          <form action={signOutAction}>
            <button
              type="submit"
              className={`w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100 ${collapsed ? "px-2" : ""}`}
            >
              {collapsed ? <span aria-hidden>👋</span> : "Sign out"}
              {collapsed ? <span className="sr-only">Sign out</span> : null}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-200 bg-amber-50/80 px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl" aria-hidden>
              🌿
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Regenerative Stewards
              </p>
              <p className="truncate text-sm text-stone-800">Hi, {displayName}</p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
          <MobileTabBar items={MOBILE_TAB_ITEMS} />
        </div>
      </div>
    </div>
  );
}
