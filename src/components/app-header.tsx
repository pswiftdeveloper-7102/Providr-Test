import { MobileNav } from "@/components/nav-sidebar";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { PortalToggle } from "@/components/portal-toggle";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ProvidrLogo } from "@/components/providr-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { isManager } from "@/lib/rbac";
import { getNotifications } from "@/lib/notifications";
import type { ResolvedPortalContext } from "@/lib/session";

type Props = {
  context: ResolvedPortalContext;
};

export async function AppHeader({ context }: Props) {
  const { activeOrg, activePortal, availablePortals, user } = context;
  const notifications = await getNotifications(context);
  const managerView = isManager(context);

  return (
    <header className="border-b bg-background">
      <div className="flex items-center gap-2 px-3 py-3 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
        <div className="flex items-center gap-2 min-w-0 lg:gap-3">
          <MobileNav portal={activePortal} isManager={managerView} />
          <ProvidrLogo height={28} />
          <Separator orientation="vertical" className="hidden sm:block h-6" />
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            {activeOrg.tradingName ?? activeOrg.legalName}
          </span>
        </div>

        <div className="hidden lg:flex lg:justify-center">
          <PortalToggle active={activePortal} available={availablePortals} />
        </div>

        <div className="ml-auto flex items-center justify-end gap-1 lg:ml-0">
          <NotificationsDropdown notifications={notifications} />
          <ThemeToggle />
          <ProfileDropdown
            user={{ name: user.name, email: user.email }}
            orgName={activeOrg.tradingName ?? activeOrg.legalName}
          />
        </div>
      </div>

      {/* Portal toggle moves to a second row on mobile so it's still
          reachable but doesn't crowd the icon cluster. */}
      <div className="flex justify-center border-t px-3 py-2 lg:hidden">
        <PortalToggle active={activePortal} available={availablePortals} />
      </div>
    </header>
  );
}