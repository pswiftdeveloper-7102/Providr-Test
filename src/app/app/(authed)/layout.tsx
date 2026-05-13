import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProvidrLogo } from "@/components/providr-logo";
import { resolvePortalContext } from "@/lib/session";

import { BottomNav } from "./bottom-nav";
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

      <BottomNav />
    </div>
  );
}