import { z } from "zod";

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue)]),
);

const stepSchema = z.object({
  id: z.string().optional(),
  parentStepId: z.string().optional(),
  type: z.enum(["llm", "tool", "retriever", "chain", "custom"]).default("custom"),
  name: z.string().min(1).max(200),
  status: z.enum(["success", "error", "running", "cancelled"]).default("success"),
  startedAt: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  input: jsonValue.optional(),
  output: jsonValue.optional(),
  metadata: z.record(z.string(), jsonValue).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  temperature: z.number().optional(),
  prompt: z.string().optional(),
  response: z.string().optional(),
  toolName: z.string().optional(),
  arguments: jsonValue.optional(),
  result: jsonValue.optional(),
});

export const ingestRunSchema = z.object({
  traceId: z.string().min(8).max(128),
  agent: z.string().min(1).max(120),
  project: z.string().max(120).optional(),
  environment: z.enum(["production", "staging", "development"]).default("production"),
  status: z.enum(["success", "error", "running", "cancelled"]).default("success"),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().optional(),
  model: z.string().optional(),
  provider: z.enum(["openai", "anthropic", "google", "custom"]).optional(),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  estimatedCost: z.number().nonnegative().optional(),
  error: z
    .object({
      title: z.string().min(1),
      message: z.string().min(1),
    })
    .optional(),
  metadata: z.record(z.string(), jsonValue).optional(),
  steps: z.array(stepSchema).default([]),
});

export type IngestRunInput = z.infer<typeof ingestRunSchema>;
