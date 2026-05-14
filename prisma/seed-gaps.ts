// Test-data seed for the three "paperwork-friction" gaps (commit 1942ac0):
//   - Gap 1: previous shift's handover note surfaced on the next shift
//   - Gap 2: PRN outcome reminder while shift is in progress
//   - Gap 3: enriched care plan fields visible to support workers
//
// Idempotent — re-running cleans previous test rows by stable seed-* ids.
// Builds on top of the main `prisma/seed.ts` data (Acme Care org + Dave the
// worker user). Run after `npm run db:seed` (or whenever you want fresh
// test data) via:
//
//   npx tsx prisma/seed-gaps.ts
//
// Then sign in at /login as `owner@acme.test / password123` for the web
// flow, or accept Dave's invite to use the worker portal.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SEED_PARTICIPANT_ID = "seed-gap-participant";
const SEED_CARE_PLAN_ID = "seed-gap-careplan";
const SEED_SHIFT_A_ID = "seed-gap-shift-a";
const SEED_SHIFT_B_ID = "seed-gap-shift-b";
const SEED_HANDOVER_NOTE_ID = "seed-gap-handover-note";
const SEED_MAR_ID = "seed-gap-prn-mar";

async function main() {
  // 1. Find the Acme org from the main seed.
  const org = await db.org.findUnique({ where: { abn: "12345678901" } });
  if (!org) {
    throw new Error(
      "Acme org not found — run `npm run db:seed` first to set up base data."
    );
  }

  // 2. Find Dave the worker user (linked Worker record).
  const dave = await db.worker.findUnique({
    where: { id: "seed-worker-dave" },
  });
  if (!dave) {
    throw new Error("Dave worker not found — main seed didn't run.");
  }

  // 3. Idempotent reset of just our gap test rows.
  await db.medicationRecord.deleteMany({ where: { id: SEED_MAR_ID } });
  await db.progressNote.deleteMany({ where: { id: SEED_HANDOVER_NOTE_ID } });
  await db.shift.deleteMany({
    where: { id: { in: [SEED_SHIFT_A_ID, SEED_SHIFT_B_ID] } },
  });
  await db.carePlan.deleteMany({ where: { id: SEED_CARE_PLAN_ID } });
  // Participant kept across reruns to preserve any unrelated relations.

  // 4. Test participant (idempotent).
  const participant = await db.participant.upsert({
    where: { id: SEED_PARTICIPANT_ID },
    update: {},
    create: {
      id: SEED_PARTICIPANT_ID,
      orgId: org.id,
      firstName: "Charlie",
      lastName: "Hudson",
      ndisNumber: "430000999",
      address: "12 Banksia Street, Surry Hills NSW 2010",
      phone: "+61 491 555 222",
      pronouns: "he/him",
    },
  });

  // 5. Active care plan with ALL six enrichment fields populated — this is
  // what Gap 3 surfaces in the worker portal's Need-to-knows card.
  await db.carePlan.create({
    data: {
      id: SEED_CARE_PLAN_ID,
      orgId: org.id,
      participantId: participant.id,
      status: "ACTIVE",
      effectiveFrom: new Date(),
      summary:
        "Charlie needs steady routine and clear language. Loves morning walks. Withdraws if rushed.",
      communicationPreferences:
        "Short, calm sentences. Avoid yes/no questions when distressed — offer two clear options instead. Allow extra time for response.",
      medicalConditions:
        "Type 1 diabetes (BGL checks before meals). Mild asthma — uses Ventolin puffer as needed.",
      allergies:
        "Severe peanut allergy — EpiPen in kitchen drawer + day-bag. Penicillin (rash).",
      risks:
        "Risk of hypoglycaemia if meal is delayed >30 min. History of fall in shower — non-slip mat in use.",
      emergencyContacts:
        "Mum: Sarah Hudson, +61 412 999 888. GP: Dr Patel, Surry Hills Family Practice, 02 9281 0000. After-hours: Healthdirect 1800 022 222.",
      culturalConsiderations:
        "Family observes Friday night Shabbat — no shifts scheduled 5pm Fri–dusk Sat. Prefers male support workers for personal care where possible.",
    },
  });

  // 6. Shift A — completed earlier today, ends 2h ago. Has a handover note.
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  await db.shift.create({
    data: {
      id: SEED_SHIFT_A_ID,
      orgId: org.id,
      workerId: dave.id,
      participantId: participant.id,
      scheduledStart: sixHoursAgo,
      scheduledEnd: twoHoursAgo,
      actualStart: sixHoursAgo,
      actualEnd: twoHoursAgo,
      status: "COMPLETED",
      progressNotes: {
        create: {
          id: SEED_HANDOVER_NOTE_ID,
          authorId: dave.userId,
          isHandover: true,
          inputMethod: "KEYBOARD",
          body:
            "Solid morning. Charlie ate breakfast at 8:30 (full porridge + tea). BGL 6.1 before, 7.4 after. Walk along Crown St for 25 min — good mood, chatted about footy. Did NOT want to do the laundry — left for tomorrow.\n\nFOR NEXT SHIFT: Mum is dropping in around 4pm. Charlie was a bit anxious about it — gentle prep helps. Lunch is in the fridge, second insulin shot at 12:30 not yet done.",
        },
      },
    },
  });

  // 7. Shift B — in progress now (started 30 min ago, ends in 3h). Has a
  // PRN MAR with no outcome — Gap 2 alert should fire.
  const halfHourAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  await db.shift.create({
    data: {
      id: SEED_SHIFT_B_ID,
      orgId: org.id,
      workerId: dave.id,
      participantId: participant.id,
      scheduledStart: halfHourAgo,
      scheduledEnd: threeHoursLater,
      actualStart: halfHourAgo,
      status: "IN_PROGRESS",
      medicationRecords: {
        create: {
          id: SEED_MAR_ID,
          givenAt: new Date(now.getTime() - 10 * 60 * 1000),
          medication: "Ventolin (salbutamol)",
          dose: "2 puffs",
          status: "GIVEN",
          isPrn: true,
          prnReason: "Wheezing after walking up the stairs — slightly short of breath.",
          prnOutcome: null,
          givenById: dave.userId,
        },
      },
    },
  });

  console.log("\n✓ Gap test data ready.\n");
  console.log("  Participant:    Charlie Hudson");
  console.log(`  Care plan:      /provider/participants/${participant.id}`);
  console.log("  Shift A (done): the one with the handover note");
  console.log(`                  /provider/shifts/${SEED_SHIFT_A_ID}`);
  console.log("  Shift B (now):  open → expect amber 'Previous handover'");
  console.log("                  + 'PRN dose without outcome' alerts.");
  console.log(`                  /provider/shifts/${SEED_SHIFT_B_ID}`);
  console.log("");
  console.log("  Worker App equivalent of Shift B:");
  console.log(`                  /app/shifts/${SEED_SHIFT_B_ID}`);
  console.log("  (Sign in as dave@acme.test / password123.)\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });