import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAuthLayout } from "@/components/app-auth-layout";
import { auth, googleEnabled } from "@/auth";

import { appGoogleSignInAction } from "../actions";
import { AppSignupForm } from "./app-signup-form";

export default async function AppSignupPage() {
  const session = await auth();
  if (session?.user) redirect("/app");

  return (
    <AppAuthLayout
      title="Create your account"
      subtitle="Set yourself up — finish your organisation later on desktop"
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/app/login"
            className="font-semibold text-foreground hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <AppSignupForm
        googleEnabled={googleEnabled}
        onGoogle={appGoogleSignInAction}
      />
    </AppAuthLayout>
  );
}