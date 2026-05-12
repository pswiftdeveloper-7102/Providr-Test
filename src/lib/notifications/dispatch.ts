// Q4 (2026-05-12): event-type → channel routing per the client's triage
// rules. The in-app pipeline already derives from existing data (see
// notifications.ts); this module fans out to email + SMS for the few
// event types where push beyond the in-app inbox is justified.
//
// **Don't widen the SMS channel without explicit client sign-off.** The
// memory is clear: SMS is for genuine emergencies only. Costs add up and
// the channel loses impact if overused.

import { db } from "@/lib/db";

import { sendEmail, sendSms, type TransportResult } from "./transport";

export type NotificationChannel = "in-app" | "email" | "sms";

export type NotificationEvent =
  | {
      type: "incident.reportable";
      orgId: string;
      participantId: string;
      incidentId: string;
      summary: string;
    }
  | {
      type: "provider.drop";
      orgId: string;
      participantId: string;
      engagementId: string;
      providerName: string;
      reason: string | null;
    }
  | {
      type: "generic";
      orgId: string;
      subject: string;
      body: string;
      channels?: NotificationChannel[];
      recipientEmails?: string[];
      recipientPhones?: string[];
    };

const CHANNEL_MAP: Record<NotificationEvent["type"], NotificationChannel[]> = {
  "incident.reportable": ["in-app", "email", "sms"],
  "provider.drop": ["in-app", "email"],
  // Default for everything else mirrors the memory.
  generic: ["in-app", "email"],
};

type DispatchSummary = {
  channels: NotificationChannel[];
  results: TransportResult[];
  recipientCounts: { email: number; sms: number };
  reason?: string;
};

// Pulls org admins + the compliance contact for routing reportable
// incidents. Returns deduped email/phone arrays.
async function getOrgRecipients(
  orgId: string
): Promise<{ emails: string[]; phones: string[] }> {
  const [memberships, compliance] = await Promise.all([
    db.orgMembership.findMany({
      where: {
        orgId,
        roles: {
          hasSome: [
            "OWNER",
            "ROSTERING_MANAGER",
            "CARE_MANAGER",
            "COMPLIANCE_MANAGER",
            "OFFICE_ADMIN",
          ],
        },
      },
      include: { user: { select: { email: true, phone: true } } },
    }),
    db.orgComplianceContact.findUnique({ where: { orgId } }),
  ]);

  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const m of memberships) {
    if (m.user.email) emails.add(m.user.email);
    if (m.user.phone) phones.add(m.user.phone);
  }
  if (compliance?.email) emails.add(compliance.email);
  if (compliance?.phone) phones.add(compliance.phone);

  return { emails: [...emails], phones: [...phones] };
}

// For provider-drop dispatch: notify the coordinators on the participant's
// org. When the SC has logged a provider drop they themselves did the
// data entry, but the rest of the SC team + admins still benefit from
// the email so they're not caught off-guard at the next handover.
async function getParticipantOrgCoordinators(
  participantId: string
): Promise<{ emails: string[]; phones: string[] }> {
  const participant = await db.participant.findUnique({
    where: { id: participantId },
    select: { orgId: true },
  });
  if (!participant) return { emails: [], phones: [] };
  const memberships = await db.orgMembership.findMany({
    where: {
      orgId: participant.orgId,
      roles: {
        hasSome: [
          "OWNER",
          "ROSTERING_MANAGER",
          "CARE_MANAGER",
          "COMPLIANCE_MANAGER",
          "OFFICE_ADMIN",
          "SUPPORT_COORDINATOR",
        ],
      },
    },
    include: { user: { select: { email: true, phone: true } } },
  });
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const m of memberships) {
    if (m.user.email) emails.add(m.user.email);
    if (m.user.phone) phones.add(m.user.phone);
  }
  return { emails: [...emails], phones: [...phones] };
}

export async function dispatchNotification(
  event: NotificationEvent
): Promise<DispatchSummary> {
  const channels = CHANNEL_MAP[event.type] ?? ["in-app", "email"];
  const results: TransportResult[] = [];
  let emails: string[] = [];
  let phones: string[] = [];
  let subject = "";
  let body = "";

  if (event.type === "incident.reportable") {
    const recipients = await getOrgRecipients(event.orgId);
    emails = recipients.emails;
    phones = recipients.phones;
    subject = "Reportable incident — NDIS 24h clock started";
    body =
      `A reportable incident has been logged for one of your participants.\n\n` +
      `${event.summary}\n\n` +
      `Open the incident: /provider/incidents/${event.incidentId}\n\n` +
      `The NDIS Commission must be notified within 24 hours of the org becoming aware.`;
  } else if (event.type === "provider.drop") {
    // Notify the coordinating SC org's coordinators — they're the
    // primary stakeholder when a delivering provider drops a participant.
    const recipients = await getParticipantOrgCoordinators(event.participantId);
    emails = recipients.emails;
    phones = recipients.phones;
    subject = `${event.providerName} has ended their engagement`;
    body =
      `${event.providerName} has ended their engagement with one of your participants.\n\n` +
      (event.reason ? `Reason given: ${event.reason}\n\n` : "") +
      `Open the engagement to plan cover: /sc/participants/${event.participantId}\n\n` +
      `Standard notice period is 14 days.`;
  } else {
    if (event.channels) {
      // Generic events let the caller widen/narrow channels explicitly.
      // We still gate-keep SMS — fall through to the map default if the
      // caller didn't justify the upgrade.
    }
    emails = event.recipientEmails ?? [];
    phones = event.recipientPhones ?? [];
    subject = event.subject;
    body = event.body;
  }

  // In-app notifications: the inbox derives from data, not a queue —
  // so the "in-app" channel is a no-op here. Listed for completeness so
  // analytics can show all three channels per event.
  if (channels.includes("email")) {
    for (const to of emails) {
      results.push(await sendEmail({ to, subject, body }));
    }
  }
  if (channels.includes("sms")) {
    // SMS uses a shorter body — full subject + first line of body.
    const smsBody = `${subject}. ${body.split("\n")[0]}`.slice(0, 480);
    for (const to of phones) {
      results.push(await sendSms({ to, body: smsBody }));
    }
  }

  return {
    channels,
    results,
    recipientCounts: { email: emails.length, sms: phones.length },
  };
}