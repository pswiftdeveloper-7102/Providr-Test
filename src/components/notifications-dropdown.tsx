"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notification = {
  id: string;
  title: string;
  body: string;
  unread?: boolean;
  time: string;
};

// Placeholder notifications — wire to real data once the events model exists.
const STUB_NOTIFICATIONS: Notification[] = [];

export function NotificationsDropdown() {
  const unreadCount = STUB_NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            className="relative"
            nativeButton
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold text-foreground">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        <DropdownMenuSeparator />

        {STUB_NOTIFICATIONS.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <Bell className="mx-auto h-6 w-6 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              Incident, roster, and budget alerts will land here.
            </p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {STUB_NOTIFICATIONS.map((n) => (
              <li
                key={n.id}
                className="border-b px-3 py-2 last:border-b-0 hover:bg-accent"
              >
                <div className="flex items-start gap-2">
                  {n.unread && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {n.body}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {n.time}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}