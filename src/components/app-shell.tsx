import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { CoIBanner } from "@/components/coi-banner";
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

  // App-shell pattern: outer fills the viewport (svh accounts for mobile
  // address bars). Header + CoIBanner sit at the top as flex children and
  // never scroll. The middle row owns the rest of the height; sidebar
  // and main both scroll independently inside it.
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader context={context} />
      <CoIBanner
        orgId={context.activeOrg.id}
        availablePortals={context.availablePortals}
      />
      <div className="flex flex-1 overflow-hidden">
        <NavSidebar portal={portal} isManager={managerView} />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}