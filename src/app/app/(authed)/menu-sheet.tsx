"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  ShieldAlert,
  User,
} from "lucide-react";

import { appSignOutAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  user: { name: string | null; email: string | null };
  orgName: string;
};

const ITEMS = [
  { href: "/app", label: "Home", icon: Home, match: ["/app"] as string[] },
  {
    href: "/app/shifts",
    label: "Shifts",
    icon: CalendarDays,
    match: ["/app/shifts"],
  },
  {
    href: "/app/incidents",
    label: "Incidents",
    icon: ListChecks,
    match: ["/app/incidents"],
  },
  {
    href: "/app/incidents/new",
    label: "Report incident",
    icon: Plus,
    match: ["/app/incidents/new"],
  },
  {
    href: "/app/profile",
    label: "Profile",
    icon: User,
    match: ["/app/profile"],
  },
];

export function MenuSheet({ user, orgName }: Props) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="-ml-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle>Incident Logging</SheetTitle>
              <SheetDescription>{orgName}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-1">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/app"
                  ? pathname === item.href
                  : item.match.some((m) => pathname.startsWith(m));
              return (
                <li key={item.href}>
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </nav>

        <SheetFooter>
          <div className="mb-1">
            <p className="text-xs font-medium">{user.name ?? "Signed in"}</p>
            {user.email && (
              <p className="truncate text-[11px] text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
          <form action={appSignOutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut />
              Sign out
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}