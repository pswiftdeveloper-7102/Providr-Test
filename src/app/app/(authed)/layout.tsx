import type { ReactNode } from "react";
import Link from "next/link";
import { Home, ListChecks, Plus, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProvidrLogo } from "@/components/providr-logo";
import { cn } from "@/lib/utils";
import { resolvePortalContext } from "@/lib/session";

import { MenuSheet } from "./menu-sheet";

// Mobile-first PWA shell. Top bar with hamburger (left), centred logo,
// and a floating "+" Report button bottom-right above the bottom nav.
// Bottom nav has 3 tabs (Home / Incidents / Profile) with Incidents
// centred.
export default async function AppAuthedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await resolvePortalContext("provider");
  const orgName = context.activeOrg.tradingName ?? context.activeOrg.legalName;

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="relative mx-auto flex w-full max-w-md items-center justify-center px-3 py-3">
          <div className="absolute left-3">
            <MenuSheet
              user={{
                name: context.user.name ?? null,
                email: context.user.email ?? null,
              }}
              orgName={orgName}
            />
          </div>
          <Link
            href="/app"
            className="flex flex-col items-center gap-0.5"
            aria-label="Home"
          >
            <ProvidrLogo height={22} />
            <span className="max-w-[180px] truncate text-[10px] uppercase tracking-wider text-muted-foreground">
              {orgName}
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-md px-4 py-5 pb-28">
          {children}
        </div>
      </main>

      {/* Floating Report FAB — sits bottom-right above the nav. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md">
        <div className="pointer-events-none flex justify-end px-4 pb-[calc(env(safe-area-inset-bottom,0px)+72px)]">
          <Button
            size="lg"
            className="pointer-events-auto h-14 w-14 rounded-full shadow-lg shadow-primary/30"
            render={
              <Link
                href="/app/incidents/new"
                aria-label="Report incident"
              />
            }
          >
            <Plus className="!h-6 !w-6" />
          </Button>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 items-stretch px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          <NavTab href="/app" icon={Home} label="Home" />
          <NavTab href="/app/incidents" icon={ListChecks} label="Incidents" />
          <NavTab href="/app/profile" icon={User} label="Profile" />
        </div>
      </nav>
    </div>
  );
}

function NavTab({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Home;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-label={label}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full">
        <Icon className="h-5 w-5" />
      </span>
      <span>{label}</span>
    </Link>
  );
}