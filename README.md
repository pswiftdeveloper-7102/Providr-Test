# Providr

NDIS provider operations and support coordination — built for the way the work actually happens.

## What this is

A SaaS platform for the Australian NDIS ecosystem, deliberately structured as **two portals** under one roof:

- **Provider portal** — for organisations delivering services (rostering, shifts, care plans, incidents, compliance).
- **Support Coordinator portal** — for SCs orchestrating a participant's care across providers.

Hybrid customers (who do both) buy both portals and switch between them via a toggle at the top of the screen. This is an explicit anti-pattern call against incumbent platforms that started as one and bolted on the other — diluting both. We keep them coherent.

The current build leads with the Provider portal. The SC portal is stubbed in place so the toggle has a destination, and will be scoped properly once the upcoming NDIS regulatory changes (SC funding cuts and the SC↔plan-management merger) are confirmed.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** for styling
- **Prisma** + **Postgres** for data
- **Auth.js v5** (NextAuth) — credentials provider + Prisma adapter

## Tenancy model

```
User ──N:N── Org ──1:N── OrgEntitlement (PROVIDER | SC)
                ↑
       ConflictOfInterestForm  (required for same-org hybrids)
```

A `User` can belong to multiple `Org`s. Each `Org` holds zero, one, or both portal entitlements. Same-org hybrids (one company doing both functions) require a signed Conflict of Interest form. Separate-org hybrids are modelled as the user holding memberships in two distinct orgs.

## Running locally

You'll need Node 20+ and a Postgres instance.

```bash
# 1. Copy env vars
cp .env.example .env
# Then edit .env — set DATABASE_URL and AUTH_SECRET (generate with `npx auth secret`)

# 2. Install deps
npm install

# 3. Push schema to your DB
npm run db:push

# 4. Seed a demo org + user
npm run db:seed

# 5. Run the dev server
npm run dev
```

Then sign in at <http://localhost:3030/login> with the seeded credentials:

- **owner@acme.test** / **password123**

## Project layout

```
src/
  app/
    (app)/             # authenticated routes
      provider/        # provider portal
      sc/              # support coordinator portal (stub)
    api/auth/          # NextAuth handlers
    login/             # credentials sign-in page
    no-org/            # fallback for users without an org
  components/          # shared UI: header, sidebar, portal toggle
  lib/
    db.ts              # Prisma client singleton
    portal.ts          # portal key/label/href helpers
    session.ts         # server-side auth + portal-context resolver
    utils.ts           # cn() etc.
  auth.config.ts       # edge-safe auth config (used by middleware)
  auth.ts              # full auth config (with adapter + credentials)
  middleware.ts        # route guarding
prisma/
  schema.prisma        # data model
  seed.ts              # demo data
```

## Status

Stage 2 (foundations) complete:

- [x] Tenancy data model (Org / User / OrgEntitlement / ConflictOfInterestForm)
- [x] Domain entities for the Provider thin slice (Participant, Worker, Shift, Incident)
- [x] Auth.js credentials sign-in
- [x] App shell with Provider ↔ SC toggle
- [x] Provider portal home rendering the 6-phase participant lifecycle
- [x] SC portal stub
- [x] Demo seed

Next (Stage 3 — thin Provider slice):

- [ ] Participants CRUD
- [ ] Roster view + shift creation
- [ ] Shift logging (clock in/out, progress notes)
- [ ] Incident reports with the 24-hour reportable-incident timer