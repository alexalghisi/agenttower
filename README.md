# AgentTower

Personal portfolio project / technical case study.

AgentTower is an observability, analytics, debugging, and cost-control workspace
for AI agents. Applications send execution traces with an API key. The product
then shows what ran, which model and tools were used, token burn, estimated
cost, latency, failures, and a step-level timeline.

It is **not** a hosted commercial product. It does not connect to banks or
model-vendor billing accounts. Seed data is fictional. Nothing here claims
customers, revenue, or production traffic.

**Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Drizzle · PGlite /
Postgres · Zod · Stripe adapter (optional) · Supabase SQL + RLS (optional)**

---

## Author

### Alessandro Alghisi

Senior Software Engineer · Cluj-Napoca, Romania

**Twice a Google Software Engineering Intern** — Chrome (Kitchener / Waterloo)
and Logs (Mountain View).

|          |                                                                    |
| -------- | ------------------------------------------------------------------ |
| GitHub   | [github.com/alexalghisi](https://github.com/alexalghisi)           |
| LinkedIn | [linkedin.com/in/alghisi](https://www.linkedin.com/in/alghisi)     |
| Email    | [alexalghisi@gmail.com](mailto:alexalghisi@gmail.com)              |
| Location | Cluj-Napoca, Romania · open to remote / EU / US-friendly timezones |

**Hiring?** Open an issue, message me on LinkedIn, or email
[alexalghisi@gmail.com](mailto:alexalghisi@gmail.com).

---

## Why this exists

Teams running agents need the same questions APM answered for request/response
apps: what failed, what it cost, which model, which tool, how long, and can I
open the exact trace.

AgentTower is a thin, honest slice of that job:

| Need                         | What this repo actually does                                      |
| ---------------------------- | ----------------------------------------------------------------- |
| Ingest without a vendor lock | `POST /api/v1/runs` + local SDK in `packages/sdk`                 |
| Tenant isolation             | Every query is scoped by `organization_id` from session or API key |
| Debug a failure              | Run list → trace waterfall → error group                          |
| Cost control                 | Token × list-rate estimate, monthly budget, alerts                |
| Ship without Stripe day one  | Local billing simulator; Stripe is an optional adapter            |

---

## Implemented

- Email/password auth, email verification, and password reset (local links; no SMTP)
- Organizations, roles (`owner` / `admin` / `developer` / `viewer`), invitations
- Onboarding: organization → project → stack → hashed API key → SDK snippet
- Ingestion API `POST /api/v1/runs` with Zod validation, idempotency on `traceId`, rate limiting
- Local TypeScript SDK (`packages/sdk`)
- Dashboard, run explorer, trace waterfall, error groups, agent/model analytics
- Cost budgets and in-app alerts (Slack/email/webhook channels are recorded, not dispatched)
- Plan limits (Free / Pro / Team)
- Stripe checkout adapter **or** local plan simulation on POST (GET never mutates billing)
- Seeded Harborline Labs demo: 3 projects, 8 agents, 540 traces
- Supabase SQL + RLS migrations for a hosted deploy
- Auth errors surfaced on `/login` and `/signup` (same destructive text as onboarding)

## Planned (not built)

- SMTP delivery for verify / reset / invite
- Real Slack / email / webhook dispatch
- Live Supabase Realtime subscriptions in the UI
- Publishing `@agenttower/sdk` to npm
- Vendor invoice import (cost is list-rate estimate only)

## Out of scope

- Bank or brokerage connections
- Offensive security tooling
- Multi-region replication
- Claiming this is a funded product or has paying customers

---

## Architecture

- **Next.js App Router** — UI, server actions, and route handlers in one process
- **Drizzle** against **PGlite** locally, or Postgres via `DATABASE_URL` (including Supabase)
- **Application-level tenancy** on every query (`organization_id` from the session or API key — never trusted from the client body)
- **RLS** in `supabase/migrations/0002_rls.sql` for defense in depth on hosted Supabase
- **Stripe** optional; without keys, Settings → Billing applies the plan on POST only

```
Browser          →  Next.js (dashboard, server actions)
Agent runtimes   →  POST /api/v1/runs   (Bearer API key)
                         ↓
                  Drizzle → PGlite (.data/) or Postgres
```

```
app/
├── (marketing)/          Landing
├── (auth)/               Login, signup, verify, reset
├── (app)/                Authenticated product
│   ├── dashboard/
│   ├── runs/             List + [id] waterfall
│   ├── agents/  models/  errors/  costs/  alerts/
│   └── settings/         Org, team, keys, billing, security, audit
├── onboarding/
└── api/
    ├── v1/runs/          Ingestion
    └── stripe/webhook/
lib/
├── db/                   Schema, SQL bootstrap, PGlite/Postgres client
├── auth/                 Cookie session, password, app context
├── ingestion/            Zod payload + persist + idempotency
├── billing/              Plan catalog + Stripe/local adapter
└── analytics/            Dashboard queries
packages/sdk/             Client used in onboarding snippets
```

---

## Local map (what to open)

Requires Node 22+. Dev server: [http://localhost:3000](http://localhost:3000)

| Surface              | URL                                              | What you should see                                      |
| -------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Landing              | `/`                                              | Product, pricing, FAQ                                    |
| Log in               | `/login`                                         | Demo credentials prefilled; failed login shows a red error |
| Sign up              | `/signup`                                        | Validation errors use the same destructive text          |
| Onboarding           | `/onboarding`                                    | Org → project → stack → one-time API key                 |
| Dashboard            | `/dashboard`                                     | Harborline Labs KPIs for the selected window             |
| Runs                 | `/runs`                                          | Filterable trace list                                    |
| Trace                | `/runs/[id]`                                     | Step waterfall, tokens, model                            |
| Errors               | `/errors`                                        | Grouped failures                                         |
| Costs                | `/costs`                                         | Budget vs spend                                          |
| Alerts               | `/alerts`                                        | Threshold rules (Pro/Team)                               |
| Settings → Billing   | `/settings/billing`                              | Plan change is POST-only; `?simulate=` is display-only   |
| Settings → API keys  | `/settings/keys`                                 | Hash at rest; plaintext once                             |

---

## Setup

```bash
git clone https://github.com/alexalghisi/agenttower.git
cd agenttower
cp .env.example .env.local
# Set SESSION_SECRET to a long random string for anything other than a throwaway local demo
npm install
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo account (fictional)

|            |                                              |
| ---------- | -------------------------------------------- |
| Email      | `demo@agenttower.dev`                        |
| Password   | `DemoPass123!`                               |
| API key    | `at_live_0f8c2e91a7b64d3c9e1a2b4c6d8e0f12`   |

Reseed by deleting `.data/pglite` and running `npm run seed` again.

`.env*` and `.data/` are gitignored. Do not commit secrets.

---

## Environment

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `SESSION_SECRET` | yes in production | Reserved for signed material. Sessions today are opaque DB tokens in an HttpOnly cookie. |
| `DATABASE_URL` | no | Postgres / Supabase. Unset → PGlite in `.data/` |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | no | Hosted Supabase Auth / Realtime |
| `STRIPE_*` / `STRIPE_PRICE_*` | no | Real checkout; otherwise local simulate on POST |
| `NEXT_PUBLIC_APP_URL` | no | Stripe redirects and invite links. Default `http://localhost:3000` |

---

## Ingestion

Idempotent on `traceId` for the API key’s organization. Repeat the same id → `200` and the existing run, not a duplicate.

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

SDK (not published to npm; import from `packages/sdk`):

```ts
import { AgentTower } from "@agenttower/sdk";

const agentTower = new AgentTower({
  apiKey: process.env.AGENTTOWER_API_KEY!,
  baseUrl: "http://localhost:3000",
});

const trace = agentTower.startRun({ agent: "customer-support-agent" });
await agentTower.finishRun(trace, {
  status: "success",
  inputTokens: 900,
  outputTokens: 220,
});
```

---

## Tenancy and security (what is real)

- API keys are stored as SHA-256 hashes. The plaintext is shown once at creation.
- `organization_id` on ingest comes from the key, not from the JSON body.
- Roles are enforced in server actions (`requireRole`), not only in the UI.
- Hosted path: apply `supabase/migrations/0001_init.sql` then `0002_rls.sql`.
- Local PGlite does not evaluate `auth.uid()`; the Next.js process still scopes queries.
- Billing plan changes happen in `simulatePlanAction` / checkout POST. Opening
  `/settings/billing?simulate=free` does **not** change the plan.

---

## Stripe

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`,
`STRIPE_PRICE_TEAM`, and point the webhook at `/api/stripe/webhook`. Without
those keys, **Settings → Billing** still changes the plan locally via POST.

---

## Scripts

```bash
npm run dev          # http://localhost:3000
npm run build
npm run lint
npm run typecheck
npm run seed
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, and production build on
Node 22.

---

## Limits of this MVP

- Email is not sent; verify / reset / invite tokens are shown in the UI
- Alert Slack / email / webhook deliveries are recorded, not dispatched
- Realtime subscriptions are not wired (Supabase client is ready when configured)
- The SDK is not published to npm
- Cost is an estimate from list rates, not a vendor invoice
- Docker Compose is not part of this repo. Local data is PGlite; hosted data is
  Postgres via `DATABASE_URL`

---

## License

MIT · © Alessandro Alghisi
