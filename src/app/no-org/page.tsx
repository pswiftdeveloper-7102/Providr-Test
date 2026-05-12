import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(app)/actions";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";

import { OnboardingForm } from "./onboarding-form";

export default async function NoOrgPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // If they DO have an org now, bounce them into the portal. Guards
  // against a user landing here after creating an org in another tab.
  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    include: {
      org: {
        include: { entitlements: { where: { active: true } } },
      },
    },
  });
  if (membership) {
    const portals = membership.org.entitlements.map((e) => e.portal);
    redirect(portals.includes("PROVIDER") ? "/provider" : "/sc");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-16">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Set up your organisation</CardTitle>
            <CardDescription>
              You&apos;re signed in but not linked to an organisation yet.
              Create one now to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Waiting on an invite?
              </CardTitle>
              <CardDescription>
                If someone is meant to add you to an existing organisation,
                ask them to invite you with this email
                {session.user.email ? ` (${session.user.email})` : ""}.
                Then sign in again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" className="w-full">
                  Sign out
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}