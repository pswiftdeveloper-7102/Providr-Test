import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, LogOut, User } from "lucide-react";

import { signOutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { resolveWorkerContext } from "@/lib/session";

export default async function WorkerLayout({ children }: { children: ReactNode }) {
  const context = await resolveWorkerContext();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <Link href="/worker" className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {context.org.tradingName ?? context.org.legalName}
            </span>
            <span className="text-base font-semibold tracking-tight">
              Hi, {context.worker.firstName}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              render={<Link href="/worker/profile" aria-label="Profile" />}
            >
              <User />
            </Button>
            <form action={signOutAction}>
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                aria-label="Sign out"
              >
                <LogOut />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-md px-4 py-5 pb-24">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-around px-4 py-2">
          <Link
            href="/worker"
            className="flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Calendar className="h-5 w-5" />
            <span>Shifts</span>
          </Link>
          <Link
            href="/worker/profile"
            className="flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <User className="h-5 w-5" />
            <span>Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}