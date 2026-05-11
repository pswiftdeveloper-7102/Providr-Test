import Link from "next/link";

import { AuthLayout } from "@/components/auth-layout";
import { googleEnabled } from "@/auth";

import { SignupForm } from "./signup-form";
import { googleSignUpAction } from "./actions";

export default function SignupPage() {
  return (
    <AuthLayout>
      <p className="mb-6 text-sm text-muted-foreground">
        Create your organisation account
      </p>

      <SignupForm
        googleEnabled={googleEnabled}
        onGoogle={googleSignUpAction}
      />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-foreground hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}