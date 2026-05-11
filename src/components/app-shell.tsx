import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { NavSidebar } from "@/components/nav-sidebar";
import { resolvePortalContext } from "@/lib/session";
import { isManager } from "@/lib/rbac";
import type { PortalKey } from "@/lib/portal";

type Props = {
  portal: PortalKey;
  children: ReactNode;
};

export async function AppShell({ portal, children }: Props) {
  const context = await resolvePortalContext(portal);
  const managerView = isManager(context);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader context={context} />
      <div className="flex flex-1">
        <NavSidebar portal={portal} isManager={managerView} />
        <main className="flex-1 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}