import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ProvidrLogo } from "@/components/providr-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import type { ResolvedPortalContext } from "@/lib/session";

type Props = {
  context: ResolvedPortalContext;
};

export function AppHeader({ context }: Props) {
  const { activeOrg, user } = context;

  return (
    <header className="border-b bg-background">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProvidrLogo height={28} />
          <Separator orientation="vertical" className="hidden sm:block h-6" />
          <span className="hidden sm:inline truncate text-sm text-muted-foreground">
            {activeOrg.tradingName ?? activeOrg.legalName}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <NotificationsDropdown />
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