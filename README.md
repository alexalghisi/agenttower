# AgentTower

Personal portfolio project / technical case study.

AgentTower is an observability, analytics, debugging, and cost-control workspace for AI agents. Applications send execution traces with an API key. The product then shows what ran, which model and tools were used, token burn, estimated cost, latency, failures, and a step-level timeline.

It is not a hosted commercial product, does not connect to banks or model vendor accounts, and does not claim customers or revenue.

## What is implemented

- Email/password auth, verification and password reset (local links; no SMTP)
- Organizations, roles (`owner` / `admin` / `developer` / `viewer`), invitations
- Onboarding: org → project → stack → hashed API key → SDK snippet
- Ingestion API `POST /api/v1/runs` with Zod validation, idempotency on `traceId`, rate limiting
- Local SDK in `packages/sdk`
- Dashboard, run explorer, trace waterfall, error groups, agent/model analytics, cost budgets, alerts
- Plan limits (Free / Pro / Team) and a Stripe adapter that falls back to a local simulator
- Seeded Harborline Labs demo: 3 projects, 8 agents, 540 traces
- Supabase SQL + RLS migrations for a hosted deploy

## Architecture

- **Next.js App Router** for UI, server actions, and route handlers
- **Drizzle** against **PGlite** locally, or Postgres via `DATABASE_URL` (including Supabase)
- **Application-level tenancy** on every query (`organization_id` from the session or API key — never trusted from the client)
- **RLS** in `supabase/migrations/0002_rls.sql` for defense in depth on hosted Supabase
- **Stripe** optional; without keys, billing simulates plan changes

```
Browser  →  Next.js (dashboard)
Clients  →  POST /api/v1/runs  (Bearer API key)
                ↓
         Drizzle / Postgres
```

## Tech stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, Radix/shadcn-style UI, Recharts, Zod, React Hook Form (available), Drizzle, PGlite, Stripe SDK, Supabase JS client.

## Setup

Requires Node 22+.

```bash
cp .env.example .env.local
# SESSION_SECRET is already set in the committed local example workflow via .env.local
npm install
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo account (fictional)

| | |
|---|---|
| Email | `demo@agenttower.dev` |
| Password | `DemoPass123!` |
| API key | `at_live_0f8c2e91a7b64d3c9e1a2b4c6d8e0f12` |

Reseed by deleting `.data/pglite` and running `npm run seed` again.

## Environment

See `.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | yes in production | Signs nothing today; reserved. Sessions are opaque DB tokens in an HttpOnly cookie. |
| `DATABASE_URL` | no | Postgres / Supabase. Unset → PGlite in `.data/` |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | no | Hosted Supabase Auth/Realtime |
| `STRIPE_*` | no | Real checkout; otherwise local simulate |

## Supabase

1. Create a project.
2. Apply `supabase/migrations/0001_init.sql` then `0002_rls.sql`.
3. Set `DATABASE_URL` to the Postgres URI and the public Supabase keys.
4. The Next.js app still authorizes in process. RLS blocks direct client reads of other orgs.

## Stripe

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`, and point the webhook to `/api/stripe/webhook`. Without these, **Settings → Billing** changes the plan locally.

## Ingestion

```bash
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Authorization: Bearer at_live_0f8c2e91a7b64d3c9e1a2b4c6d8e0f12" \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "tr_manual_001",
    "agent": "Customer Support Agent",
    "environment": "production",
    "status": "success",
    "startedAt": "2026-08-29T12:00:00.000Z",
    "completedAt": "2026-08-29T12:00:02.000Z",
    "model": "gpt-4o-mini",
    "provider": "openai",
    "inputTokens": 900,
    "outputTokens": 220,
    "steps": []
  }'
```

Repeating the same `traceId` returns the existing run (200) instead of inserting a duplicate.

SDK:

```ts
import { AgentTower } from "@agenttower/sdk";

const agentTower = new AgentTower({
  apiKey: process.env.AGENTTOWER_API_KEY!,
  baseUrl: "http://localhost:3000",
});

const trace = agentTower.startRun({ agent: "customer-support-agent" });
await agentTower.finishRun(trace, { status: "success", inputTokens: 900, outputTokens: 220 });
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run seed
```

## Limits of this MVP

- Email is not sent; verify/reset/invite tokens are shown in the UI
- Alert Slack/email/webhook deliveries are recorded, not dispatched
- Realtime subscriptions are not wired (Supabase client is ready when configured)
- The SDK is not published to npm
- Cost is an estimate from list rates, not a vendor invoice
