import { redirect } from "next/navigation";

// The worker-invite flow now lives under /app/worker-invite so the link
// reads as part of the Worker App. This redirect keeps any links that
// were already copied/sent working — preserve the token.
export default async function LegacyWorkerInviteRedirect({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/app/worker-invite/${token}`);
}