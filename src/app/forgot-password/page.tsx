import Link from "next/link";

import { AuthLayout } from "@/components/auth-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>
            Password reset by email is coming soon. For now, please contact
            your organisation administrator to have your password reset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className="text-sm font-semibold text-foreground hover:underline"
          >
            ← Back to sign in
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}