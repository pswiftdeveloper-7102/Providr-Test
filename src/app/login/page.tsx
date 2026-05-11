import Link from "next/link";

import { AuthLayout } from "@/components/auth-layout";
import { googleEnabled } from "@/auth";

import { LoginForm } from "./login-form";
import { googleSignInAction } from "./actions";

export default function LoginPage() {
  return (
    <AuthLayout>
      <p className="mb-6 text-sm text-muted-foreground">
        Sign in to your provider account
      </p>

      <LoginForm googleEnabled={googleEnabled} onGoogle={googleSignInAction} />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-foreground hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}