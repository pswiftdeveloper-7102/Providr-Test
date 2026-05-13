import type { ReactNode } from "react";
import Link from "next/link";
import { Home, ListChecks, Plus, User } from "lucide-react";

import { ProvidrLogo } from "@/components/providr-logo";
import { cn } from "@/lib/utils";
import { resolvePortalContext } from "@/lib/session";

import { MenuSheet } from "./menu-sheet";

// Mobile-first PWA shell. Top bar with logo + org, bottom tab nav with
// 4 evenly-spaced tabs (Home / Incidents / Report / Profile). No
// sidebar, no portal switcher — incident-only by design.
export default async function AppAuthedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await resolvePortalContext("provider");

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-3 py-3">
          <div className="flex items-center gap-2">
            <MenuSheet
              user={{
                name: context.user.name ?? null,
                email: context.user.email ?? null,
              }}
              orgName={
                context.activeOrg.tradingName ?? context.activeOrg.legalName
              }
            />
            <Link href="/app" className="flex items-center gap-2">
              <ProvidrLogo height={24} />
            </Link>
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {context.activeOrg.tradingName ?? context.activeOrg.legalName}
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-md px-4 py-5 pb-28">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-md grid-cols-4 items-stretch px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          <NavTab href="/app" icon={Home} label="Home" />
          <NavTab href="/app/incidents" icon={ListChecks} label="Incidents" />
          <NavTab
            href="/app/incidents/new"
            icon={Plus}
            label="Report"
            variant="primary"
          />
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
  variant,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  variant?: "primary";
}) {
  const isPrimary = variant === "primary";
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-colors",
        isPrimary
          ? "text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-label={label}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full",
          isPrimary && "bg-primary text-primary-foreground shadow-md"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className={cn(isPrimary && "font-medium text-foreground")}>
        {label}
      </span>
    </Link>
  );
}