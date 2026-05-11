import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // One hybrid org with both portal entitlements + a signed COI form.
  const org = await db.org.upsert({
    where: { abn: "12345678901" },
    update: {},
    create: {
      legalName: "Acme Disability Support Pty Ltd",
      tradingName: "Acme Care",
      abn: "12345678901",
      ndisRegistrationNumber: "4-XYZ-NDIS",
      entitlements: {
        create: [{ portal: "PROVIDER" }, { portal: "SC" }],
      },
      conflictOfInterestForm: {
        create: {
          signedAt: new Date(),
          notes: "Seeded — both Provider and SC operate under one ABN.",
        },
      },
    },
  });

  const owner = await db.user.upsert({
    where: { email: "owner@acme.test" },
    update: {},
    create: {
      email: "owner@acme.test",
      name: "Jamie Carter",
      passwordHash,
      memberships: {
        create: {
          orgId: org.id,
          roles: ["OWNER", "CARE_MANAGER"],
        },
      },
    },
  });

  // A handful of participants and workers for the dashboard to render.
  const sarah = await db.participant.upsert({
    where: { id: "seed-participant-sarah" },
    update: {},
    create: {
      id: "seed-participant-sarah",
      orgId: org.id,
      firstName: "Sarah",
      lastName: "Nguyen",
      ndisNumber: "430123456",
      pronouns: "she/her",
    },
  });

  // Sarah's NDIS plan — $80,000 across the three buckets, matching the
  // canonical example from Scene 1 / Scene 2.
  const planStart = new Date();
  planStart.setMonth(planStart.getMonth() - 3); // started 3 months ago
  const planEnd = new Date(planStart);
  planEnd.setFullYear(planEnd.getFullYear() + 1);

  const plan = await db.plan.upsert({
    where: { id: "seed-plan-sarah" },
    update: {},
    create: {
      id: "seed-plan-sarah",
      participantId: sarah.id,
      ndisPlanNumber: "PLAN-SARAH-2026",
      startDate: planStart,
      endDate: planEnd,
      totalCents: 80_000_00,
      status: "ACTIVE",
      budgets: {
        create: [
          { category: "CORE", totalCents: 50_000_00, spentCents: 12_500_00 },
          { category: "CAPACITY", totalCents: 20_000_00, spentCents: 4_200_00 },
          { category: "CAPITAL", totalCents: 10_000_00, spentCents: 0 },
        ],
      },
    },
  });
  void plan;

  const day = 1000 * 60 * 60 * 24;
  const now = Date.now();

  // Three workers in different certificate states so the workers list
  // demonstrates "active" / "expiring soon" / "expired" badges out of the
  // box without manual data entry.
  const dave = await db.worker.upsert({
    where: { id: "seed-worker-dave" },
    update: {},
    create: {
      id: "seed-worker-dave",
      orgId: org.id,
      firstName: "Dave",
      lastName: "Lopez",
      email: "dave@acme.test",
      phone: "+61412 345 678",
      ndisWorkerCheckExpiry: new Date(now + day * 365),
      firstAidExpiry: new Date(now + day * 180),
    },
  });

  await db.worker.upsert({
    where: { id: "seed-worker-priya" },
    update: {},
    create: {
      id: "seed-worker-priya",
      orgId: org.id,
      firstName: "Priya",
      lastName: "Singh",
      email: "priya@acme.test",
      phone: "+61498 111 222",
      type: "ALLIED_HEALTH",
      // NDIS Worker Check expires in 20 days — should surface "Expiring soon".
      ndisWorkerCheckExpiry: new Date(now + day * 20),
      firstAidExpiry: new Date(now + day * 400),
    },
  });

  await db.worker.upsert({
    where: { id: "seed-worker-mark" },
    update: {},
    create: {
      id: "seed-worker-mark",
      orgId: org.id,
      firstName: "Mark",
      lastName: "O'Brien",
      email: "mark@acme.test",
      type: "BEHAVIOUR_SUPPORT",
      // First Aid expired 10 days ago — should surface "Expired" and would
      // block rostering once shifts go live.
      ndisWorkerCheckExpiry: new Date(now + day * 200),
      firstAidExpiry: new Date(now - day * 10),
    },
  });

  // SUPPORT_WORKER user — for RBAC demo. Logging in as this user should
  // hide the Workers/Overview/Care plans nav links and redirect /provider
  // to /provider/shifts.
  const workerUser = await db.user.upsert({
    where: { email: "dave@acme.test" },
    update: {},
    create: {
      email: "dave@acme.test",
      name: "Dave Lopez",
      firstName: "Dave",
      lastName: "Lopez",
      passwordHash,
      memberships: {
        create: {
          orgId: org.id,
          roles: ["SUPPORT_WORKER"],
        },
      },
    },
  });
  // Link the support worker user to Dave's worker record so future
  // "my shifts" filtering can use Worker.userId.
  await db.worker.update({
    where: { id: dave.id },
    data: { userId: workerUser.id },
  });

  // A handful of shifts spread across the current week so the roster page
  // has something to display out of the box.
  const at = (offsetDays: number, hour: number, minute = 0): Date => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const shiftSeeds: Array<{
    id: string;
    participantId: string;
    workerId: string;
    scheduledStart: Date;
    scheduledEnd: Date;
  }> = [
    {
      id: "seed-shift-1",
      participantId: sarah.id,
      workerId: dave.id,
      scheduledStart: at(0, 9),
      scheduledEnd: at(0, 17),
    },
    {
      id: "seed-shift-2",
      participantId: sarah.id,
      workerId: "seed-worker-priya",
      scheduledStart: at(1, 7),
      scheduledEnd: at(1, 12),
    },
    {
      id: "seed-shift-3",
      participantId: sarah.id,
      workerId: dave.id,
      scheduledStart: at(2, 14),
      scheduledEnd: at(2, 20),
    },
    {
      id: "seed-shift-4",
      participantId: sarah.id,
      workerId: "seed-worker-priya",
      scheduledStart: at(4, 9),
      scheduledEnd: at(4, 17),
    },
  ];

  for (const s of shiftSeeds) {
    await db.shift.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, orgId: org.id, status: "SCHEDULED" },
    });
  }

  // Demo notes + MAR entries on today's shift so the detail page isn't empty.
  await db.progressNote.deleteMany({ where: { shiftId: "seed-shift-1" } });
  await db.medicationRecord.deleteMany({
    where: { shiftId: "seed-shift-1" },
  });
  await db.progressNote.create({
    data: {
      shiftId: "seed-shift-1",
      authorId: owner.id,
      body: "Morning routine completed. Sarah in good spirits — chose her own outfit today.",
    },
  });
  await db.progressNote.create({
    data: {
      shiftId: "seed-shift-1",
      authorId: owner.id,
      body: "Eggs for breakfast. Took morning meds without prompting. Heading to physio next.",
    },
  });
  await db.medicationRecord.create({
    data: {
      shiftId: "seed-shift-1",
      medication: "Paracetamol",
      dose: "500 mg",
      givenAt: at(0, 8, 30),
      givenById: owner.id,
      notes: "With breakfast.",
    },
  });

  // Demo incidents: one moderate (closed history) and one reportable still
  // inside the 24-hour NDIS window so the timer renders on the list and
  // detail page out of the box.
  await db.incident.deleteMany({
    where: {
      id: { in: ["seed-incident-moderate", "seed-incident-reportable"] },
    },
  });

  await db.incident.create({
    data: {
      id: "seed-incident-moderate",
      orgId: org.id,
      participantId: sarah.id,
      occurredAt: new Date(now - day * 5),
      reportedAt: new Date(now - day * 5 + 1000 * 60 * 30),
      severity: "MODERATE",
      status: "CLOSED",
      description:
        "Sarah slipped getting out of the shower. No injury — caught herself on the rail. Worker present throughout.",
      immediateActions:
        "Settled Sarah in the lounge with a warm drink. Care manager notified. Family contacted as a courtesy.",
      createdById: owner.id,
    },
  });

  // Reportable incident from 18 hours ago — about 6 hours remaining on the
  // NDIS 24-hour clock. Not yet submitted.
  await db.incident.create({
    data: {
      id: "seed-incident-reportable",
      orgId: org.id,
      participantId: sarah.id,
      shiftId: "seed-shift-1",
      occurredAt: new Date(now - 1000 * 60 * 60 * 18),
      reportedAt: new Date(now - 1000 * 60 * 60 * 18),
      severity: "REPORTABLE",
      status: "REPORTED",
      description:
        "Sarah had a brief fall on the way to physio. Treated by GP — no fracture but a sprained wrist and bruising. Reportable under serious injury criteria.",
      immediateActions:
        "Driven straight to GP. Compliance Manager and SC notified. Family informed. Worker took witness statement.",
      createdById: owner.id,
    },
  });

  // Service agreement + care plan + goals so the new sections on the
  // participant detail page render with content out of the box.
  await db.serviceAgreement.deleteMany({
    where: { id: "seed-agreement-sarah" },
  });
  await db.serviceAgreement.create({
    data: {
      id: "seed-agreement-sarah",
      participantId: sarah.id,
      startDate: planStart,
      endDate: planEnd,
      signedAt: planStart,
      status: "ACTIVE",
      documentUrl: "https://example.test/agreements/sarah-2026.pdf",
      notes:
        "Standard NDIS service agreement covering daily support, transport, and community access. Reviewed annually with plan.",
    },
  });

  await db.carePlan.deleteMany({ where: { id: "seed-careplan-sarah" } });
  const careplan = await db.carePlan.create({
    data: {
      id: "seed-careplan-sarah",
      orgId: org.id,
      participantId: sarah.id,
      status: "ACTIVE",
      effectiveFrom: planStart,
      effectiveTo: planEnd,
      summary:
        "Three focus areas this plan year: independent showering, regular walks to the local park (social goal), and using the AAC device with new family contacts.",
    },
  });
  await db.goal.createMany({
    data: [
      {
        carePlanId: careplan.id,
        title: "Walk to the park independently",
        description:
          "Reduce prompting needed during the 2 PM outing. Mid-year target: confident with one verbal prompt only.",
        category: "SOCIAL",
        status: "IN_PROGRESS",
        targetDate: new Date(planStart.getTime() + day * 180),
      },
      {
        carePlanId: careplan.id,
        title: "Shower with minimal assistance",
        description:
          "Build morning routine confidence — Sarah dries herself; worker stays in earshot for safety only.",
        category: "INDEPENDENT_LIVING",
        status: "IN_PROGRESS",
      },
      {
        carePlanId: careplan.id,
        title: "Use AAC device with extended family",
        description:
          "Practice initiating greetings using the device when visiting cousins.",
        category: "COMMUNICATION",
        status: "PAUSED",
      },
    ],
  });

  console.log("Seeded:");
  console.log(`  Manager:        owner@acme.test  /  password123`);
  console.log(`  Support worker: dave@acme.test   /  password123`);
  console.log(`  Org:    ${org.legalName} (${org.id})`);
  console.log(`  Login:  ${owner.email}  /  password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });