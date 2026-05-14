"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { revokePendingInviteAction } from "./actions";

export function RevokeInviteButton({ workerId }: { workerId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => start(() => revokePendingInviteAction(workerId).then(() => undefined))}
      disabled={pending}
    >
      {pending ? "Revoking…" : "Revoke"}
    </Button>
  );
}