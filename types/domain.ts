export const roles = ["owner", "admin", "developer", "viewer"] as const;
export type Role = (typeof roles)[number];

export const plans = ["free", "pro", "team"] as const;
export type Plan = (typeof plans)[number];

export const runStatuses = ["success", "error", "running", "cancelled"] as const;
export type RunStatus = (typeof runStatuses)[number];

export const environments = ["production", "staging", "development"] as const;
export type Environment = (typeof environments)[number];

export const stepTypes = ["llm", "tool", "retriever", "chain", "custom"] as const;
export type StepType = (typeof stepTypes)[number];

export const alertTypes = [
  "error_rate",
  "cost",
  "latency",
  "success_rate",
  "budget_usage",
  "failure_count",
] as const;
export type AlertType = (typeof alertTypes)[number];

export const alertChannels = ["in_app", "email", "slack", "webhook"] as const;
export type AlertChannel = (typeof alertChannels)[number];

export const providers = ["openai", "anthropic", "google", "custom"] as const;
export type Provider = (typeof providers)[number];

export const stacks = [
  "openai",
  "anthropic",
  "google-gemini",
  "custom",
  "langchain",
  "langgraph",
  "vercel-ai-sdk",
] as const;
export type Stack = (typeof stacks)[number];

export type DatePreset = "24h" | "7d" | "30d" | "custom";

export type AnalyticsFilters = {
  from: Date;
  to: Date;
  projectId?: string;
  environment?: Environment;
  agentId?: string;
  model?: string;
  provider?: Provider;
  status?: RunStatus;
  query?: string;
};

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export type Membership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Role;
  plan: Plan;
  onboardedAt: string | null;
};
