import { redirect } from "next/navigation";

export default async function NewEscalationForParticipant({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Defer to the central escalation-new page, pre-selecting the participant.
  redirect(`/sc/escalations/new?participantId=${id}`);
}