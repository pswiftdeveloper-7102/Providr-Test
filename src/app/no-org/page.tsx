import { signOutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NoOrgPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-16">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle>You&apos;re not yet linked to an organisation</CardTitle>
          <CardDescription>
            Your account exists, but no organisation has added you as a member
            yet. Ask your administrator to invite you, then sign in again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOutAction}>
            <Button type="submit">Sign out</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}