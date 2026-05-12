"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Notification } from "@/lib/notifications";

export function NotificationsDropdown({
  notifications,
}: {
  notifications: Notification[];
}) {
  const unreadCount = notifications.filter((n) => n.unread).length;
  const urgentCount = notifications.filter((n) => n.urgent).length;

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
              <span
                className={`absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${
                  urgentCount > 0
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold text-foreground">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {unreadCount} unread
              {urgentCount > 0 && ` · ${urgentCount} urgent`}
            </span>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
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
          <ul className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`border-b last:border-b-0 ${
                  n.urgent ? "bg-destructive/5" : ""
                }`}
              >
                <Link
                  href={n.href}
                  className="flex items-start gap-2 px-3 py-2 hover:bg-accent"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.urgent
                        ? "bg-destructive"
                        : n.unread
                          ? "bg-primary"
                          : "bg-transparent"
                    }`}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {n.body}
                    </div>
                    {n.time && (
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {n.time}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}