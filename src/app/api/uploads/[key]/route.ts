import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { contentTypeFromKey, readUpload } from "@/lib/uploads";

// Streams an uploaded file by storage key. Access control:
//   1. User must be authenticated.
//   2. The file must be referenced from a record (ServiceAgreement or
//      Plan) whose org the user is a member of.
//
// Anyone outside that chain gets a 404 (deliberately — we don't leak
// "exists but you can't see it" vs "doesn't exist").

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Look the file up against any of the upload-bearing models. Each
  // result includes the org membership filtered to this user — empty
  // arrays mean "no, you can't read this".
  const [agreement, plan] = await Promise.all([
    db.serviceAgreement.findFirst({
      where: { uploadedFileKey: key },
      select: {
        uploadedFileName: true,
        participant: {
          select: {
            org: {
              select: {
                memberships: {
                  where: { userId: session.user.id },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    }),
    db.plan.findFirst({
      where: { planFileKey: key },
      select: {
        planFileName: true,
        participant: {
          select: {
            org: {
              select: {
                memberships: {
                  where: { userId: session.user.id },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const agreementOk =
    agreement && agreement.participant.org.memberships.length > 0;
  const planOk = plan && plan.participant.org.memberships.length > 0;

  if (!agreementOk && !planOk) {
    return new NextResponse("Not found", { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readUpload(key);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const displayName = agreementOk
    ? agreement.uploadedFileName ?? key
    : plan?.planFileName ?? key;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypeFromKey(key),
      "Content-Disposition": `inline; filename="${displayName.replace(/"/g, '')}"`,
      "Cache-Control": "private, no-store",
    },
  });
}