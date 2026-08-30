export type AgentTowerOptions = {
  apiKey: string;
  baseUrl?: string;
};

export type StartRunInput = {
  agent: string;
  project?: string;
  environment?: "production" | "staging" | "development";
  model?: string;
  provider?: "openai" | "anthropic" | "google" | "custom";
  metadata?: Record<string, unknown>;
};

export type FinishRunInput = {
  status?: "success" | "error" | "cancelled";
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  error?: { title: string; message: string };
  steps?: Array<{
    type?: "llm" | "tool" | "retriever" | "chain" | "custom";
    name: string;
    status?: "success" | "error" | "running" | "cancelled";
    durationMs?: number;
    input?: unknown;
    output?: unknown;
    model?: string;
    provider?: string;
    inputTokens?: number;
    outputTokens?: number;
    prompt?: string;
    response?: string;
    toolName?: string;
    arguments?: unknown;
    result?: unknown;
  }>;
};

export type ActiveTrace = StartRunInput & {
  traceId: string;
  startedAt: string;
};

export class AgentTower {
  constructor(private readonly options: AgentTowerOptions) {}

  startRun(input: StartRunInput): ActiveTrace {
    return {
      ...input,
      traceId: `tr_${crypto.randomUUID()}`,
      startedAt: new Date().toISOString(),
    };
  }

  async finishRun(trace: ActiveTrace, input: FinishRunInput = {}) {
    const baseUrl = this.options.baseUrl ?? "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/v1/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        traceId: trace.traceId,
        agent: trace.agent,
        project: trace.project,
        environment: trace.environment ?? "production",
        status: input.status ?? "success",
        startedAt: trace.startedAt,
        completedAt: new Date().toISOString(),
        model: trace.model,
        provider: trace.provider,
        inputTokens: input.inputTokens ?? 0,
        outputTokens: input.outputTokens ?? 0,
        estimatedCost: input.estimatedCost,
        error: input.error,
        metadata: trace.metadata,
        steps: input.steps ?? [],
      }),
    });

    const body = (await response.json()) as { data?: { runId: string; created: boolean }; error?: { message: string } };
    if (!response.ok) {
      throw new Error(body.error?.message ?? `Ingest failed with ${response.status}`);
    }
    return body.data;
  }
}
