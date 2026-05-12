import Link from "next/link";

import { AuthLayout } from "@/components/auth-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>
            Reset links are valid for one hour and can be used once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResetPasswordForm token={token} />
          <Link
            href="/login"
            className="block text-sm font-semibold text-foreground hover:underline"
          >
            ← Back to sign in
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}