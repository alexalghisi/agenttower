import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth/password";
import { getDb } from "../lib/db/client";
import {
  agentRuns,
  agents,
  alertEvents,
  alerts,
  apiKeys,
  errors,
  llmCalls,
  organizationMembers,
  organizations,
  profiles,
  projects,
  runSteps,
  subscriptions,
  toolCalls,
  users,
} from "../lib/db/schema";
import { estimateCost, fingerprintError } from "../lib/models/pricing";
import { sha256Hex } from "../lib/crypto";
import { newId, slugify } from "../lib/utils";

const DEMO_EMAIL = "demo@agenttower.dev";
const DEMO_PASSWORD = "DemoPass123!";
const DEMO_KEY = "at_live_0f8c2e91a7b64d3c9e1a2b4c6d8e0f12";

const AGENT_DEFS = [
  { name: "Customer Support Agent", project: 0, tools: ["searchKnowledgeBase", "createTicket", "sendEmail"] },
  { name: "Lead Qualification Agent", project: 1, tools: ["lookupCrm", "scoreLead"] },
  { name: "Research Agent", project: 2, tools: ["webSearch", "summarizeSource"] },
  { name: "Invoice Processing Agent", project: 0, tools: ["extractFields", "matchVendor"] },
  { name: "Coding Agent", project: 2, tools: ["readRepo", "runTests"] },
  { name: "Sales Agent", project: 1, tools: ["draftOutreach", "lookupCrm"] },
  { name: "Email Agent", project: 0, tools: ["sendEmail", "classifyIntent"] },
  { name: "Data Extraction Agent", project: 2, tools: ["extractFields", "writeSheet"] },
] as const;

const PROJECTS = ["Production API", "Go-to-market", "Internal tools"] as const;

const MODELS = [
  { provider: "openai" as const, model: "gpt-4.1" },
  { provider: "openai" as const, model: "gpt-4o-mini" },
  { provider: "anthropic" as const, model: "claude-sonnet-4" },
  { provider: "anthropic" as const, model: "claude-haiku-3.5" },
  { provider: "google" as const, model: "gemini-2.5-pro" },
  { provider: "google" as const, model: "gemini-2.5-flash" },
];

const ERRORS = [
  { title: "OpenAI rate limit exceeded", message: "429 Too Many Requests: tokens per min" },
  { title: "Tool timeout: searchKnowledgeBase", message: "Deadline exceeded after 8000ms" },
  { title: "Invalid tool arguments", message: "createTicket missing field 'priority'" },
  { title: "Context window overflow", message: "Prompt exceeded 128k tokens" },
  { title: "Provider outage", message: "anthropic 503 unavailable" },
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)] as T;
}

async function main() {
  const db = await getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing[0]) {
    console.log("Demo data already present. Delete .data/pglite to reseed.");
    console.log(`  email    ${DEMO_EMAIL}`);
    console.log(`  password ${DEMO_PASSWORD}`);
    console.log(`  api key  ${DEMO_KEY}`);
    return;
  }

  const rand = mulberry32(42);
  const userId = newId();
  const organizationId = newId();

  await db.insert(users).values({
    id: userId,
    email: DEMO_EMAIL,
    passwordHash: await hashPassword(DEMO_PASSWORD),
    emailVerifiedAt: new Date(),
  });
  await db.insert(profiles).values({ userId, displayName: "Avery Chen" });
  await db.insert(organizations).values({
    id: organizationId,
    name: "Harborline Labs",
    slug: "harborline-labs",
    stack: "vercel-ai-sdk",
    monthlyBudget: "500",
    onboardedAt: new Date(),
  });
  await db.insert(organizationMembers).values({
    id: newId(),
    organizationId,
    userId,
    role: "owner",
  });
  await db.insert(subscriptions).values({
    id: newId(),
    organizationId,
    plan: "team",
    status: "active",
  });

  const projectIds = PROJECTS.map(() => newId());
  await db.insert(projects).values(
    PROJECTS.map((name, index) => ({
      id: projectIds[index],
      organizationId,
      name,
      slug: slugify(name),
    })),
  );

  const agentIds = AGENT_DEFS.map(() => newId());
  await db.insert(agents).values(
    AGENT_DEFS.map((agent, index) => ({
      id: agentIds[index],
      organizationId,
      projectId: projectIds[agent.project],
      name: agent.name,
      slug: slugify(agent.name),
      description: `Demo ${agent.name.toLowerCase()} used for local evaluation.`,
    })),
  );

  await db.insert(apiKeys).values({
    id: newId(),
    organizationId,
    projectId: projectIds[0],
    name: "Local demo key",
    prefix: DEMO_KEY.slice(0, 16),
    keyHash: sha256Hex(DEMO_KEY),
    createdByUserId: userId,
    lastUsedAt: new Date(),
  });

  const errorIds = ERRORS.map(() => newId());
  await db.insert(errors).values(
    ERRORS.map((item, index) => ({
      id: errorIds[index],
      organizationId,
      fingerprint: fingerprintError(item.title, item.message),
      title: item.title,
      message: item.message,
      status: index === 4 ? "resolved" : "open",
      occurrenceCount: 1,
      firstSeenAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      lastSeenAt: new Date(),
    })),
  );
  const errorCounts = ERRORS.map(() => 1);

  const now = Date.now();
  const runBatch: (typeof agentRuns.$inferInsert)[] = [];
  const stepBatch: (typeof runSteps.$inferInsert)[] = [];
  const llmBatch: (typeof llmCalls.$inferInsert)[] = [];
  const toolBatch: (typeof toolCalls.$inferInsert)[] = [];

  const RUN_COUNT = 540;

  for (let i = 0; i < RUN_COUNT; i += 1) {
    const agentIndex = Math.floor(rand() * AGENT_DEFS.length);
    const agent = AGENT_DEFS[agentIndex];
    const modelInfo = pick(rand, MODELS);
    const startedAt = new Date(now - Math.floor(rand() * 30 * 24 * 60 * 60 * 1000));
    const roll = rand();
    const status = roll > 0.93 ? "error" : roll > 0.97 ? "running" : "success";
    const env = rand() > 0.75 ? (rand() > 0.5 ? "staging" : "development") : "production";
    const inputTokens = 800 + Math.floor(rand() * 4000);
    const outputTokens = 200 + Math.floor(rand() * 1200);
    const durationMs = 400 + Math.floor(rand() * 4200);
    const cost = estimateCost(modelInfo.model, inputTokens, outputTokens);
    const runId = newId();
    const completedAt = status === "running" ? null : new Date(startedAt.getTime() + durationMs);
    let errorId: string | null = null;

    if (status === "error") {
      const errorIndex = Math.floor(rand() * ERRORS.length);
      errorId = errorIds[errorIndex];
      errorCounts[errorIndex] += 1;
    }

    runBatch.push({
      id: runId,
      organizationId,
      projectId: projectIds[agent.project],
      agentId: agentIds[agentIndex],
      errorId,
      traceId: `tr_${startedAt.getTime().toString(36)}_${i.toString(36)}`,
      environment: env,
      status,
      startedAt,
      completedAt,
      durationMs,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: cost.toFixed(6),
      model: modelInfo.model,
      provider: modelInfo.provider,
      metadata: { seed: true, region: pick(rand, ["us-east-1", "eu-west-1", "us-west-2"]) },
    });

    const firstLlm = newId();
    const toolStep = newId();
    const secondLlm = newId();
    const cursor = startedAt.getTime();

    stepBatch.push({
      id: firstLlm,
      organizationId,
      runId,
      parentStepId: null,
      stepType: "llm",
      name: "Plan next action",
      status: "success",
      startedAt,
      completedAt: new Date(cursor + Math.floor(durationMs * 0.4)),
      durationMs: Math.floor(durationMs * 0.4),
      input: { messages: [{ role: "user", content: `Handle turn ${i} for ${agent.name}` }] },
      output: { content: "Call the first required tool, then reply." },
      metadata: {},
      sequence: 0,
    });
    llmBatch.push({
      id: newId(),
      organizationId,
      runId,
      stepId: firstLlm,
      provider: modelInfo.provider,
      model: modelInfo.model,
      inputTokens: Math.floor(inputTokens * 0.6),
      outputTokens: Math.floor(outputTokens * 0.4),
      cost: estimateCost(modelInfo.model, Math.floor(inputTokens * 0.6), Math.floor(outputTokens * 0.4)).toFixed(6),
      temperature: "0.20",
      prompt: `You are ${agent.name}. Decide the next tool.`,
      response: `Using ${agent.tools[0]}`,
      latencyMs: Math.floor(durationMs * 0.4),
    });

    const toolName = pick(rand, agent.tools);
    const toolFailed = status === "error" && rand() > 0.4;
    stepBatch.push({
      id: toolStep,
      organizationId,
      runId,
      parentStepId: firstLlm,
      stepType: "tool",
      name: toolName,
      status: toolFailed ? "error" : "success",
      startedAt: new Date(cursor + Math.floor(durationMs * 0.4)),
      completedAt: new Date(cursor + Math.floor(durationMs * 0.65)),
      durationMs: Math.floor(durationMs * 0.25),
      input: { query: `demo payload ${i}` },
      output: toolFailed ? { error: "timeout" } : { ok: true, rows: Math.floor(rand() * 8) },
      metadata: {},
      sequence: 1,
    });
    toolBatch.push({
      id: newId(),
      organizationId,
      runId,
      stepId: toolStep,
      toolName,
      arguments: { query: `demo payload ${i}` },
      result: toolFailed ? { error: "timeout" } : { ok: true },
      durationMs: Math.floor(durationMs * 0.25),
      status: toolFailed ? "error" : "success",
    });

    stepBatch.push({
      id: secondLlm,
      organizationId,
      runId,
      parentStepId: null,
      stepType: "llm",
      name: "Compose response",
      status: status === "error" && !toolFailed ? "error" : status === "running" ? "running" : "success",
      startedAt: new Date(cursor + Math.floor(durationMs * 0.65)),
      completedAt: completedAt,
      durationMs: Math.floor(durationMs * 0.35),
      input: { toolResult: toolName },
      output: { content: status === "error" ? "Failed to complete the turn." : "Done." },
      metadata: {},
      sequence: 2,
    });
    llmBatch.push({
      id: newId(),
      organizationId,
      runId,
      stepId: secondLlm,
      provider: modelInfo.provider,
      model: modelInfo.model,
      inputTokens: Math.floor(inputTokens * 0.4),
      outputTokens: Math.floor(outputTokens * 0.6),
      cost: estimateCost(modelInfo.model, Math.floor(inputTokens * 0.4), Math.floor(outputTokens * 0.6)).toFixed(6),
      temperature: "0.40",
      prompt: "Turn the tool result into a user-facing reply.",
      response: status === "error" ? "I could not finish that request." : "Here is the result.",
      latencyMs: Math.floor(durationMs * 0.35),
    });
  }

  const chunk = 80;
  for (let i = 0; i < runBatch.length; i += chunk) {
    await db.insert(agentRuns).values(runBatch.slice(i, i + chunk));
  }
  for (let i = 0; i < stepBatch.length; i += chunk) {
    await db.insert(runSteps).values(stepBatch.slice(i, i + chunk));
  }
  for (let i = 0; i < llmBatch.length; i += chunk) {
    await db.insert(llmCalls).values(llmBatch.slice(i, i + chunk));
  }
  for (let i = 0; i < toolBatch.length; i += chunk) {
    await db.insert(toolCalls).values(toolBatch.slice(i, i + chunk));
  }

  for (const [index, count] of errorCounts.entries()) {
    await db.update(errors).set({ occurrenceCount: count, lastSeenAt: new Date() }).where(eq(errors.id, errorIds[index]));
  }

  const alertId = newId();
  await db.insert(alerts).values([
    {
      id: alertId,
      organizationId,
      name: "Error rate above 8%",
      type: "error_rate",
      threshold: "8",
      windowMinutes: 1440,
      channel: "in_app",
      enabled: true,
    },
    {
      id: newId(),
      organizationId,
      name: "Monthly budget 75%",
      type: "budget_usage",
      threshold: "75",
      windowMinutes: 43200,
      channel: "slack",
      enabled: true,
    },
  ]);

  await db.insert(alertEvents).values({
    id: newId(),
    organizationId,
    alertId,
    message: "Error rate 9.4% exceeded 8% in the last 24h (simulated notification)",
    payload: { simulated: true, channel: "in_app" },
    deliveredVia: "in_app",
  });

  console.log("Seeded Harborline Labs demo workspace");
  console.log(`  email    ${DEMO_EMAIL}`);
  console.log(`  password ${DEMO_PASSWORD}`);
  console.log(`  api key  ${DEMO_KEY}`);
  console.log(`  runs     ${RUN_COUNT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
