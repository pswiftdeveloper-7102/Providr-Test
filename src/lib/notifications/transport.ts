// Q4 (2026-05-12): outbound transports for the notification dispatcher.
// Both adapters are env-var-gated so the app runs without external
// credentials — they log the would-have-been-sent payload to stdout
// instead. Mirror the `googleEnabled` pattern in src/auth.ts.
//
// When ANTHROPIC chose to keep this dependency-free: both transports use
// fetch() to the provider's REST API rather than vendor SDKs. Swap to a
// vendor SDK later if you hit feature limits.

export type EmailMessage = {
  to: string;
  subject: string;
  body: string; // plain-text; HTML can come later
};

export type SmsMessage = {
  to: string; // E.164
  body: string;
};

export type TransportResult = {
  ok: boolean;
  channel: "email" | "sms";
  // When the transport is disabled (no env vars) we still return ok=true
  // so the caller can treat the notification as "dispatched as best
  // effort". `simulated` makes it visible up the stack and to telemetry.
  simulated: boolean;
  error?: string;
};

// ────────── Email ──────────

const emailEnabled = !!(
  process.env.RESEND_API_KEY ||
  (process.env.SMTP_HOST && process.env.SMTP_USER)
);
const emailFrom =
  process.env.NOTIFICATION_FROM_EMAIL ?? "notifications@providr.local";

export async function sendEmail(msg: EmailMessage): Promise<TransportResult> {
  if (!emailEnabled) {
    console.info("[notifications/email simulated]", {
      to: msg.to,
      subject: msg.subject,
    });
    return { ok: true, channel: "email", simulated: true };
  }
  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: msg.to,
          subject: msg.subject,
          text: msg.body,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return {
          ok: false,
          channel: "email",
          simulated: false,
          error: `Resend ${res.status}: ${errText.slice(0, 200)}`,
        };
      }
      return { ok: true, channel: "email", simulated: false };
    }
    // SMTP path intentionally left as a TODO — keeping the dispatcher
    // dependency-free until a transport is chosen.
    return {
      ok: false,
      channel: "email",
      simulated: false,
      error: "SMTP transport not yet wired — set RESEND_API_KEY instead.",
    };
  } catch (err) {
    return {
      ok: false,
      channel: "email",
      simulated: false,
      error: err instanceof Error ? err.message : "Email send failed.",
    };
  }
}

// ────────── SMS ──────────

const smsEnabled = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_FROM_NUMBER
);

export async function sendSms(msg: SmsMessage): Promise<TransportResult> {
  if (!smsEnabled) {
    console.info("[notifications/sms simulated]", {
      to: msg.to,
      preview: msg.body.slice(0, 80),
    });
    return { ok: true, channel: "sms", simulated: true };
  }
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_FROM_NUMBER!;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const params = new URLSearchParams({
      To: msg.to,
      From: from,
      Body: msg.body,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        channel: "sms",
        simulated: false,
        error: `Twilio ${res.status}: ${errText.slice(0, 200)}`,
      };
    }
    return { ok: true, channel: "sms", simulated: false };
  } catch (err) {
    return {
      ok: false,
      channel: "sms",
      simulated: false,
      error: err instanceof Error ? err.message : "SMS send failed.",
    };
  }
}

export const transportStatus = {
  emailEnabled,
  smsEnabled,
};