import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { PortalToggle } from "@/components/portal-toggle";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ProvidrLogo } from "@/components/providr-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { getNotifications } from "@/lib/notifications";
import type { ResolvedPortalContext } from "@/lib/session";

type Props = {
  context: ResolvedPortalContext;
};

export async function AppHeader({ context }: Props) {
  const { activeOrg, activePortal, availablePortals, user } = context;
  const notifications = await getNotifications(context);

  return (
    <header className="border-b bg-background">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProvidrLogo height={28} />
          <Separator orientation="vertical" className="hidden sm:block h-6" />
          <span className="hidden sm:inline truncate text-sm text-muted-foreground">
            {activeOrg.tradingName ?? activeOrg.legalName}
          </span>
        </div>

        <div className="flex justify-center">
          <PortalToggle active={activePortal} available={availablePortals} />
        </div>

        <div className="flex items-center justify-end gap-1">
          <NotificationsDropdown notifications={notifications} />
          <ThemeToggle />
          <ProfileDropdown
            user={{ name: user.name, email: user.email }}
            orgName={activeOrg.tradingName ?? activeOrg.legalName}
          />
        </div>
      </div>
    </header>
  );
}