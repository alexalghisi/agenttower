import { and, eq, gte, sql } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/api/keys";
import { getDb } from "@/lib/db/client";
import {
  agentRuns,
  agents,
  alertEvents,
  alerts,
  errors,
  llmCalls,
  organizations,
  projects,
  runSteps,
  subscriptions,
  toolCalls,
  usageDaily,
} from "@/lib/db/schema";
import type { IngestRunInput } from "@/lib/ingestion/schema";
import { estimateCost, fingerprintError } from "@/lib/models/pricing";
import { PLAN_LIMITS } from "@/lib/permissions";
import { newId, parseNumber, slugify } from "@/lib/utils";
import type { Plan } from "@/types/domain";

export type IngestResult =
  | { ok: true; runId: string; created: boolean }
  | { ok: false; status: number; code: string; message: string };

function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function ingestRun(bearer: string | null, payload: IngestRunInput): Promise<IngestResult> {
  const key = await authenticateApiKey(bearer);
  if (!key) {
    return { ok: false, status: 401, code: "unauthorized", message: "Invalid API key" };
  }

  const db = await getDb();
  const organizationId = key.organizationId;

  const existing = await db
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(and(eq(agentRuns.organizationId, organizationId), eq(agentRuns.traceId, payload.traceId)))
    .limit(1);

  if (existing[0]) {
    return { ok: true, runId: existing[0].id, created: false };
  }

  const sub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);
  const plan = (sub[0]?.plan ?? "free") as Plan;
  const limits = PLAN_LIMITS[plan];

  const used = await db
    .select({ count: sql<number>`count(*)` })
    .from(agentRuns)
    .where(and(eq(agentRuns.organizationId, organizationId), gte(agentRuns.startedAt, monthStart())));

  if (Number(used[0]?.count ?? 0) >= limits.runsPerMonth) {
    return {
      ok: false,
      status: 402,
      code: "plan_limit",
      message: `Monthly run limit reached for the ${plan} plan`,
    };
  }

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId));

  let project = payload.project
    ? projectRows.find((row) => row.slug === slugify(payload.project ?? "") || row.name === payload.project)
    : key.projectId
      ? projectRows.find((row) => row.id === key.projectId)
      : projectRows[0];

  if (!project) {
    if (projectRows.length >= limits.projects) {
      return { ok: false, status: 402, code: "plan_limit", message: "Project limit reached for this plan" };
    }
    const id = newId();
    const name = payload.project ?? "Default";
    await db.insert(projects).values({
      id,
      organizationId,
      name,
      slug: slugify(name) || "default",
    });
    project = {
      id,
      organizationId,
      name,
      slug: slugify(name) || "default",
      environmentDefault: "production",
      createdAt: new Date(),
      archivedAt: null,
    };
  }

  const agentRows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.organizationId, organizationId), eq(agents.projectId, project.id)));

  let agent = agentRows.find((row) => row.slug === slugify(payload.agent) || row.name === payload.agent);
  if (!agent) {
    const id = newId();
    await db.insert(agents).values({
      id,
      organizationId,
      projectId: project.id,
      name: payload.agent,
      slug: slugify(payload.agent) || "agent",
      description: "Created from ingestion",
    });
    agent = {
      id,
      organizationId,
      projectId: project.id,
      name: payload.agent,
      slug: slugify(payload.agent) || "agent",
      description: "Created from ingestion",
      createdAt: new Date(),
    };
  }

  const startedAt = new Date(payload.startedAt);
  const completedAt = payload.completedAt ? new Date(payload.completedAt) : null;
  const durationMs =
    completedAt && !Number.isNaN(completedAt.getTime())
      ? Math.max(0, completedAt.getTime() - startedAt.getTime())
      : payload.steps.reduce((sum, step) => sum + (step.durationMs ?? 0), 0);

  const inputTokens = payload.inputTokens;
  const outputTokens = payload.outputTokens;
  const cost =
    payload.estimatedCost ?? estimateCost(payload.model, inputTokens, outputTokens);

  let errorId: string | null = null;
  if (payload.error || payload.status === "error") {
    const title = payload.error?.title ?? "Agent run failed";
    const message = payload.error?.message ?? "Unspecified failure";
    const fingerprint = fingerprintError(title, message);
    const existingError = await db
      .select()
      .from(errors)
      .where(and(eq(errors.organizationId, organizationId), eq(errors.fingerprint, fingerprint)))
      .limit(1);

    if (existingError[0]) {
      errorId = existingError[0].id;
      await db
        .update(errors)
        .set({
          occurrenceCount: existingError[0].occurrenceCount + 1,
          lastSeenAt: startedAt,
          status: existingError[0].status === "ignored" ? "ignored" : "open",
        })
        .where(eq(errors.id, errorId));
    } else {
      errorId = newId();
      await db.insert(errors).values({
        id: errorId,
        organizationId,
        fingerprint,
        title,
        message,
        status: "open",
        occurrenceCount: 1,
        lastSeenAt: startedAt,
        firstSeenAt: startedAt,
      });
    }
  }

  const runId = newId();
  await db.insert(agentRuns).values({
    id: runId,
    organizationId,
    projectId: project.id,
    agentId: agent.id,
    errorId,
    traceId: payload.traceId,
    environment: payload.environment,
    status: payload.status,
    startedAt,
    completedAt,
    durationMs,
    totalInputTokens: inputTokens,
    totalOutputTokens: outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: cost.toFixed(6),
    model: payload.model ?? null,
    provider: payload.provider ?? null,
    metadata: payload.metadata ?? {},
  });

  for (const [index, step] of payload.steps.entries()) {
    const stepId = step.id ?? newId();
    const stepStart = step.startedAt ? new Date(step.startedAt) : startedAt;
    const stepEnd = step.completedAt ? new Date(step.completedAt) : completedAt;
    await db.insert(runSteps).values({
      id: stepId,
      organizationId,
      runId,
      parentStepId: step.parentStepId ?? null,
      stepType: step.type,
      name: step.name,
      status: step.status,
      startedAt: stepStart,
      completedAt: stepEnd,
      durationMs: step.durationMs ?? null,
      input: step.input ?? null,
      output: step.output ?? null,
      metadata: step.metadata ?? {},
      sequence: index,
    });

    if (step.type === "llm") {
      const inTok = step.inputTokens ?? 0;
      const outTok = step.outputTokens ?? 0;
      await db.insert(llmCalls).values({
        id: newId(),
        organizationId,
        runId,
        stepId,
        provider: step.provider ?? payload.provider ?? "custom",
        model: step.model ?? payload.model ?? "unknown",
        inputTokens: inTok,
        outputTokens: outTok,
        cost: (step.cost ?? estimateCost(step.model ?? payload.model, inTok, outTok)).toFixed(6),
        temperature: step.temperature?.toString() ?? null,
        prompt: step.prompt ?? null,
        response: step.response ?? null,
        latencyMs: step.durationMs ?? null,
      });
    }

    if (step.type === "tool") {
      await db.insert(toolCalls).values({
        id: newId(),
        organizationId,
        runId,
        stepId,
        toolName: step.toolName ?? step.name,
        arguments: step.arguments ?? step.input ?? null,
        result: step.result ?? step.output ?? null,
        durationMs: step.durationMs ?? null,
        status: step.status,
      });
    }
  }

  const bucketDate = startedAt.toISOString().slice(0, 10);
  await db
    .insert(usageDaily)
    .values({
      organizationId,
      bucketDate,
      projectId: project.id,
      agentId: agent.id,
      model: payload.model ?? "unknown",
      provider: payload.provider ?? "custom",
      runs: 1,
      successes: payload.status === "success" ? 1 : 0,
      failures: payload.status === "error" ? 1 : 0,
      tokens: inputTokens + outputTokens,
      cost: cost.toFixed(6),
      latencySumMs: durationMs,
    })
    .onConflictDoUpdate({
      target: [
        usageDaily.organizationId,
        usageDaily.bucketDate,
        usageDaily.projectId,
        usageDaily.agentId,
        usageDaily.model,
        usageDaily.provider,
      ],
      set: {
        runs: sql`${usageDaily.runs} + 1`,
        successes: sql`${usageDaily.successes} + ${payload.status === "success" ? 1 : 0}`,
        failures: sql`${usageDaily.failures} + ${payload.status === "error" ? 1 : 0}`,
        tokens: sql`${usageDaily.tokens} + ${inputTokens + outputTokens}`,
        cost: sql`${usageDaily.cost} + ${cost}`,
        latencySumMs: sql`${usageDaily.latencySumMs} + ${durationMs}`,
      },
    });

  await evaluateAlerts(organizationId, plan);
  return { ok: true, runId, created: true };
}

async function evaluateAlerts(organizationId: string, plan: Plan) {
  if (!PLAN_LIMITS[plan].alerts) return;
  const db = await getDb();
  const rules = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.organizationId, organizationId), eq(alerts.enabled, true)));

  if (rules.length === 0) return;

  const org = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  const budget = parseNumber(org[0]?.monthlyBudget);

  for (const rule of rules) {
    const since = new Date(Date.now() - rule.windowMinutes * 60_000);
    const stats = await db
      .select({
        runs: sql<number>`count(*)`,
        failures: sql<number>`count(*) filter (where ${agentRuns.status} = 'error')`,
        cost: sql<number>`coalesce(sum(${agentRuns.estimatedCost}), 0)`,
        latency: sql<number>`coalesce(avg(${agentRuns.durationMs}), 0)`,
      })
      .from(agentRuns)
      .where(and(eq(agentRuns.organizationId, organizationId), gte(agentRuns.startedAt, since)));

    const row = stats[0];
    const runs = Number(row?.runs ?? 0);
    const failures = Number(row?.failures ?? 0);
    const cost = Number(row?.cost ?? 0);
    const latency = Number(row?.latency ?? 0);
    const errorRate = runs === 0 ? 0 : (failures / runs) * 100;
    const successRate = 100 - errorRate;
    const monthCost = await db
      .select({ cost: sql<number>`coalesce(sum(${agentRuns.estimatedCost}), 0)` })
      .from(agentRuns)
      .where(and(eq(agentRuns.organizationId, organizationId), gte(agentRuns.startedAt, monthStart())));
    const spent = Number(monthCost[0]?.cost ?? 0);
    const budgetUsage = budget > 0 ? (spent / budget) * 100 : 0;

    const threshold = parseNumber(rule.threshold);
    let triggered = false;
    let message = "";

    switch (rule.type) {
      case "error_rate":
        triggered = errorRate > threshold;
        message = `Error rate ${errorRate.toFixed(1)}% exceeded ${threshold}%`;
        break;
      case "cost":
        triggered = cost > threshold;
        message = `Window cost $${cost.toFixed(2)} exceeded $${threshold}`;
        break;
      case "latency":
        triggered = latency > threshold;
        message = `Average latency ${Math.round(latency)}ms exceeded ${threshold}ms`;
        break;
      case "success_rate":
        triggered = successRate < threshold;
        message = `Success rate ${successRate.toFixed(1)}% dropped below ${threshold}%`;
        break;
      case "budget_usage":
        triggered = budgetUsage > threshold;
        message = `Budget usage ${budgetUsage.toFixed(1)}% exceeded ${threshold}%`;
        break;
      case "failure_count":
        triggered = failures > threshold;
        message = `${failures} failures in ${rule.windowMinutes}m exceeded ${threshold}`;
        break;
      default:
        break;
    }

    if (!triggered) continue;

    const recent = await db
      .select({ id: alertEvents.id })
      .from(alertEvents)
      .where(and(eq(alertEvents.alertId, rule.id), gte(alertEvents.createdAt, new Date(Date.now() - 10 * 60_000))))
      .limit(1);
    if (recent[0]) continue;

    await db.insert(alertEvents).values({
      id: newId(),
      organizationId,
      alertId: rule.id,
      message,
      payload: { type: rule.type, threshold, simulated: rule.channel !== "in_app" },
      deliveredVia: rule.channel,
    });
  }
}
