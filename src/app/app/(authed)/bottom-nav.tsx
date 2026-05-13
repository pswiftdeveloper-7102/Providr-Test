"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, User, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Item = {
  href: string;
  icon: LucideIcon;
  label: string;
  // URL prefixes that count as "you are here". Empty array means the
  // tab is active only on exact match.
  match: string[];
};

const ITEMS: Item[] = [
  { href: "/app", icon: Home, label: "Home", match: [] },
  {
    href: "/app/incidents",
    icon: ListChecks,
    label: "Incidents",
    match: ["/app/incidents"],
  },
  {
    href: "/app/profile",
    icon: User,
    label: "Profile",
    match: ["/app/profile"],
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-md grid-cols-3 items-stretch px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.match.length === 0
              ? pathname === item.href
              : item.match.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  active && "bg-primary/10"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className={cn(active && "font-medium")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}