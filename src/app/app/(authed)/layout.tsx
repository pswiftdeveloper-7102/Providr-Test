import type { ReactNode } from "react";
import Link from "next/link";
import { Home, ListChecks, Plus, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProvidrLogo } from "@/components/providr-logo";
import { resolvePortalContext } from "@/lib/session";

// Mobile-first PWA shell. Top bar with logo + org, bottom tab nav, and a
// floating "Report" CTA. Distinct from the desktop AppShell — no
// sidebar, no portal switcher, and no menus beyond what's strictly
// incident-related.
export default async function AppAuthedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await resolvePortalContext("provider");

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <Link href="/app" className="flex items-center gap-2">
            <ProvidrLogo height={24} />
            <span className="text-xs text-muted-foreground">
              {context.activeOrg.tradingName ?? context.activeOrg.legalName}
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-md px-4 py-5 pb-32">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-around px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <NavTab href="/app" icon={Home} label="Home" />
          <NavTab href="/app/incidents" icon={ListChecks} label="Incidents" />
          <Button
            size="lg"
            className="-mt-6 h-14 w-14 rounded-full shadow-lg"
            render={
              <Link
                href="/app/incidents/new"
                aria-label="Report incident"
              />
            }
          >
            <Plus className="!h-5 !w-5" />
          </Button>
          <div className="w-12" /> {/* spacer to balance the FAB */}
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
      className="flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}