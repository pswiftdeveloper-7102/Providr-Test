import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAuthLayout } from "@/components/app-auth-layout";
import { auth, googleEnabled } from "@/auth";

import { appGoogleSignInAction } from "../actions";
import { AppLoginForm } from "./app-login-form";

export default async function AppLoginPage() {
  // Already signed in? Skip the form.
  const session = await auth();
  if (session?.user) redirect("/app");

  return (
    <AppAuthLayout
      title="Incident Logging"
      subtitle="Sign in to your account to log and track incidents."
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/app/signup"
            className="font-semibold text-foreground hover:underline"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <AppLoginForm
        googleEnabled={googleEnabled}
        onGoogle={appGoogleSignInAction}
      />
    </AppAuthLayout>
  );
}