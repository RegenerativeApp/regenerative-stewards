"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  comingSoon?: boolean;
  mentor?: boolean;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  items,
  collapsed,
}: {
  items: NavItem[];
  collapsed: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2" : "",
              item.comingSoon ? "opacity-50" : "",
              active && item.mentor
                ? "bg-green-100 text-green-900 ring-1 ring-green-200/80"
                : active
                  ? "bg-stone-200/90 text-stone-900"
                  : "text-stone-700 hover:bg-stone-200/60",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <span className="shrink-0 text-lg leading-none" aria-hidden>
              {item.icon}
            </span>
            <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
            {item.comingSoon && !collapsed ? (
              <span className="ml-auto text-[10px] font-normal uppercase tracking-wide text-stone-400">
                soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex h-14 items-stretch justify-around border-t border-stone-200 bg-amber-50/95 px-1 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium",
              active && item.mentor
                ? "text-green-800"
                : active
                  ? "text-stone-900"
                  : "text-stone-500",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <span className="text-xl leading-none" aria-hidden>
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
