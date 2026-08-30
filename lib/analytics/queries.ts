import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { agentRuns, agents, errors, llmCalls, projects, runSteps, toolCalls } from "@/lib/db/schema";
import { retentionStart } from "@/lib/permissions";
import { parseNumber } from "@/lib/utils";
import type { AnalyticsFilters, Plan } from "@/types/domain";

function runScope(organizationId: string, plan: Plan, filters: AnalyticsFilters) {
  const retainedFrom = retentionStart(plan);
  const from = filters.from > retainedFrom ? filters.from : retainedFrom;
  const clauses = [
    eq(agentRuns.organizationId, organizationId),
    gte(agentRuns.startedAt, from),
    lte(agentRuns.startedAt, filters.to),
  ];
  if (filters.projectId) clauses.push(eq(agentRuns.projectId, filters.projectId));
  if (filters.environment) clauses.push(eq(agentRuns.environment, filters.environment));
  if (filters.agentId) clauses.push(eq(agentRuns.agentId, filters.agentId));
  if (filters.model) clauses.push(eq(agentRuns.model, filters.model));
  if (filters.provider) clauses.push(eq(agentRuns.provider, filters.provider));
  if (filters.status) clauses.push(eq(agentRuns.status, filters.status));
  return and(...clauses);
}

export async function getDashboardMetrics(organizationId: string, plan: Plan, filters: AnalyticsFilters) {
  const db = await getDb();
  const where = runScope(organizationId, plan, filters);
  const rows = await db
    .select({
      runs: sql<number>`count(*)`,
      successes: sql<number>`count(*) filter (where ${agentRuns.status} = 'success')`,
      failures: sql<number>`count(*) filter (where ${agentRuns.status} = 'error')`,
      cost: sql<number>`coalesce(sum(${agentRuns.estimatedCost}), 0)`,
      tokens: sql<number>`coalesce(sum(${agentRuns.totalTokens}), 0)`,
      latency: sql<number>`coalesce(avg(${agentRuns.durationMs}), 0)`,
    })
    .from(agentRuns)
    .where(where);

  const row = rows[0];
  const runs = Number(row?.runs ?? 0);
  const successes = Number(row?.successes ?? 0);
  return {
    runs,
    successes,
    failures: Number(row?.failures ?? 0),
    successRate: runs === 0 ? 0 : (successes / runs) * 100,
    cost: Number(row?.cost ?? 0),
    tokens: Number(row?.tokens ?? 0),
    latency: Number(row?.latency ?? 0),
  };
}

export async function getSeries(organizationId: string, plan: Plan, filters: AnalyticsFilters) {
  const db = await getDb();
  const where = runScope(organizationId, plan, filters);
  const rows = await db
    .select({
      bucket: sql<string>`to_char(date_trunc('day', ${agentRuns.startedAt}), 'YYYY-MM-DD')`,
      runs: sql<number>`count(*)`,
      failures: sql<number>`count(*) filter (where ${agentRuns.status} = 'error')`,
      successes: sql<number>`count(*) filter (where ${agentRuns.status} = 'success')`,
      cost: sql<number>`coalesce(sum(${agentRuns.estimatedCost}), 0)`,
      latency: sql<number>`coalesce(avg(${agentRuns.durationMs}), 0)`,
    })
    .from(agentRuns)
    .where(where)
    .groupBy(sql`date_trunc('day', ${agentRuns.startedAt})`)
    .orderBy(sql`date_trunc('day', ${agentRuns.startedAt})`);

  return rows.map((row) => ({
    date: row.bucket,
    runs: Number(row.runs),
    failures: Number(row.failures),
    successes: Number(row.successes),
    cost: Number(row.cost),
    latency: Number(row.latency),
  }));
}

export async function getBreakdowns(organizationId: string, plan: Plan, filters: AnalyticsFilters) {
  const db = await getDb();
  const where = runScope(organizationId, plan, filters);

  const byModel = await db
    .select({
      key: agentRuns.model,
      runs: sql<number>`count(*)`,
      cost: sql<number>`coalesce(sum(${agentRuns.estimatedCost}), 0)`,
      tokens: sql<number>`coalesce(sum(${agentRuns.totalTokens}), 0)`,
      latency: sql<number>`coalesce(avg(${agentRuns.durationMs}), 0)`,
      failures: sql<number>`count(*) filter (where ${agentRuns.status} = 'error')`,
    })
    .from(agentRuns)
    .where(where)
    .groupBy(agentRuns.model)
    .orderBy(sql`sum(${agentRuns.estimatedCost}) desc`);

  const byAgent = await db
    .select({
      id: agents.id,
      key: agents.name,
      runs: sql<number>`count(*)`,
      cost: sql<number>`coalesce(sum(${agentRuns.estimatedCost}), 0)`,
      tokens: sql<number>`coalesce(sum(${agentRuns.totalTokens}), 0)`,
      latency: sql<number>`coalesce(avg(${agentRuns.durationMs}), 0)`,
      successes: sql<number>`count(*) filter (where ${agentRuns.status} = 'success')`,
      failures: sql<number>`count(*) filter (where ${agentRuns.status} = 'error')`,
    })
    .from(agentRuns)
    .innerJoin(agents, eq(agents.id, agentRuns.agentId))
    .where(where)
    .groupBy(agents.id, agents.name)
    .orderBy(sql`count(*) desc`);

  return {
    byModel: byModel.map((row) => ({
      key: row.key ?? "unknown",
      runs: Number(row.runs),
      cost: Number(row.cost),
      tokens: Number(row.tokens),
      latency: Number(row.latency),
      failures: Number(row.failures),
    })),
    byAgent: byAgent.map((row) => ({
      id: row.id,
      key: row.key,
      runs: Number(row.runs),
      cost: Number(row.cost),
      tokens: Number(row.tokens),
      latency: Number(row.latency),
      successes: Number(row.successes),
      failures: Number(row.failures),
      successRate: Number(row.runs) === 0 ? 0 : (Number(row.successes) / Number(row.runs)) * 100,
    })),
  };
}

export async function listRuns(
  organizationId: string,
  plan: Plan,
  filters: AnalyticsFilters,
  page: number,
  pageSize = 25,
) {
  const db = await getDb();
  const where = runScope(organizationId, plan, filters);
  const search = filters.query?.trim();

  const rows = await db
    .select({
      id: agentRuns.id,
      traceId: agentRuns.traceId,
      status: agentRuns.status,
      startedAt: agentRuns.startedAt,
      durationMs: agentRuns.durationMs,
      model: agentRuns.model,
      provider: agentRuns.provider,
      totalTokens: agentRuns.totalTokens,
      estimatedCost: agentRuns.estimatedCost,
      environment: agentRuns.environment,
      agentName: agents.name,
      agentId: agents.id,
      projectName: projects.name,
    })
    .from(agentRuns)
    .innerJoin(agents, eq(agents.id, agentRuns.agentId))
    .innerJoin(projects, eq(projects.id, agentRuns.projectId))
    .where(
      search
        ? and(
            where,
            sql`(
              ${agentRuns.traceId} ilike ${`%${search}%`}
              or ${agents.name} ilike ${`%${search}%`}
            )`,
          )
        : where,
    )
    .orderBy(desc(agentRuns.startedAt))
    .limit(pageSize)
    .offset(page * pageSize);

  const totalRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(agentRuns)
    .innerJoin(agents, eq(agents.id, agentRuns.agentId))
    .where(
      search
        ? and(
            where,
            sql`(
              ${agentRuns.traceId} ilike ${`%${search}%`}
              or ${agents.name} ilike ${`%${search}%`}
            )`,
          )
        : where,
    );

  return {
    rows: rows.map((row) => ({
      ...row,
      estimatedCost: parseNumber(row.estimatedCost),
    })),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

export async function getRunDetail(organizationId: string, runId: string) {
  const db = await getDb();
  const runRows = await db
    .select({
      run: agentRuns,
      agentName: agents.name,
      projectName: projects.name,
    })
    .from(agentRuns)
    .innerJoin(agents, eq(agents.id, agentRuns.agentId))
    .innerJoin(projects, eq(projects.id, agentRuns.projectId))
    .where(and(eq(agentRuns.organizationId, organizationId), eq(agentRuns.id, runId)))
    .limit(1);

  const found = runRows[0];
  if (!found) return null;

  const steps = await db
    .select()
    .from(runSteps)
    .where(and(eq(runSteps.organizationId, organizationId), eq(runSteps.runId, runId)))
    .orderBy(runSteps.sequence);

  const llms = await db
    .select()
    .from(llmCalls)
    .where(and(eq(llmCalls.organizationId, organizationId), eq(llmCalls.runId, runId)));

  const tools = await db
    .select()
    .from(toolCalls)
    .where(and(eq(toolCalls.organizationId, organizationId), eq(toolCalls.runId, runId)));

  return { ...found, steps, llms, tools };
}

export async function listErrors(organizationId: string, plan: Plan) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(errors)
    .where(and(eq(errors.organizationId, organizationId), gte(errors.lastSeenAt, retentionStart(plan))))
    .orderBy(desc(errors.lastSeenAt));
  return rows;
}

export async function getErrorDetail(organizationId: string, errorId: string) {
  const db = await getDb();
  const group = await db
    .select()
    .from(errors)
    .where(and(eq(errors.organizationId, organizationId), eq(errors.id, errorId)))
    .limit(1);
  if (!group[0]) return null;

  const occurrences = await db
    .select({
      id: agentRuns.id,
      traceId: agentRuns.traceId,
      startedAt: agentRuns.startedAt,
      environment: agentRuns.environment,
      agentName: agents.name,
    })
    .from(agentRuns)
    .innerJoin(agents, eq(agents.id, agentRuns.agentId))
    .where(and(eq(agentRuns.organizationId, organizationId), eq(agentRuns.errorId, errorId)))
    .orderBy(desc(agentRuns.startedAt))
    .limit(50);

  return { group: group[0], occurrences };
}

export async function getFilterOptions(organizationId: string) {
  const db = await getDb();
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.organizationId, organizationId));
  const agentRows = await db
    .select({ id: agents.id, name: agents.name, projectId: agents.projectId })
    .from(agents)
    .where(eq(agents.organizationId, organizationId));
  const modelRows = await db
    .selectDistinct({ model: agentRuns.model, provider: agentRuns.provider })
    .from(agentRuns)
    .where(eq(agentRuns.organizationId, organizationId));
  return { projects: projectRows, agents: agentRows, models: modelRows };
}

export async function getCostSummary(organizationId: string, plan: Plan, filters: AnalyticsFilters) {
  const metrics = await getDashboardMetrics(organizationId, plan, filters);
  const breakdowns = await getBreakdowns(organizationId, plan, filters);
  const byProjectDb = await getDb();
  const where = runScope(organizationId, plan, filters);
  const byProject = await byProjectDb
    .select({
      key: projects.name,
      cost: sql<number>`coalesce(sum(${agentRuns.estimatedCost}), 0)`,
      runs: sql<number>`count(*)`,
      successes: sql<number>`count(*) filter (where ${agentRuns.status} = 'success')`,
    })
    .from(agentRuns)
    .innerJoin(projects, eq(projects.id, agentRuns.projectId))
    .where(where)
    .groupBy(projects.name);

  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.max(1, (filters.to.getTime() - filters.from.getTime()) / dayMs);
  const projected = (metrics.cost / days) * 30;

  return {
    ...metrics,
    projected,
    costPerSuccess: metrics.successes === 0 ? 0 : metrics.cost / metrics.successes,
    byProject: byProject.map((row) => ({
      key: row.key,
      cost: Number(row.cost),
      runs: Number(row.runs),
      successes: Number(row.successes),
    })),
    byAgent: breakdowns.byAgent,
    byModel: breakdowns.byModel,
  };
}
