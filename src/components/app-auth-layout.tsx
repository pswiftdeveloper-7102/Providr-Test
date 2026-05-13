import type { ReactNode } from "react";

import { ProvidrLogo } from "@/components/providr-logo";

// Mobile-first auth shell for the PWA. Full-screen on phones; centred
// card on larger viewports. Distinct from AuthLayout (which is a
// desktop two-column split with a branding panel).
export function AppAuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-center px-6 pt-10 pb-6">
        <ProvidrLogo height={32} />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex-1">{children}</div>
        {footer && <div className="pt-6 text-center">{footer}</div>}
      </main>
    </div>
  );
}