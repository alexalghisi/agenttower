export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text
);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  stack text,
  monthly_budget numeric(12, 2) NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  onboarded_at timestamptz
);

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'developer', 'viewer')),
  token_hash text NOT NULL UNIQUE,
  invited_by_user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  environment_default text NOT NULL DEFAULT 'production',
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, project_id, slug)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_by_user_id uuid REFERENCES users(id),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'pro', 'team')),
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS errors (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'resolved', 'ignored')),
  occurrence_count integer NOT NULL DEFAULT 1,
  last_seen_at timestamptz NOT NULL,
  first_seen_at timestamptz NOT NULL,
  UNIQUE (organization_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  error_id uuid REFERENCES errors(id) ON DELETE SET NULL,
  trace_id text NOT NULL,
  environment text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'running', 'cancelled')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  duration_ms integer,
  total_input_tokens integer NOT NULL DEFAULT 0,
  total_output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost numeric(14, 6) NOT NULL DEFAULT 0,
  model text,
  provider text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (organization_id, trace_id)
);

CREATE TABLE IF NOT EXISTS run_steps (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  parent_step_id uuid REFERENCES run_steps(id) ON DELETE SET NULL,
  step_type text NOT NULL,
  name text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  duration_ms integer,
  input jsonb,
  output jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sequence integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS llm_calls (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_id uuid REFERENCES run_steps(id) ON DELETE SET NULL,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost numeric(14, 6) NOT NULL DEFAULT 0,
  temperature numeric(4, 2),
  prompt text,
  response text,
  latency_ms integer
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_id uuid REFERENCES run_steps(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  arguments jsonb,
  result jsonb,
  duration_ms integer,
  status text NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  threshold numeric(14, 4) NOT NULL,
  window_minutes integer NOT NULL DEFAULT 60,
  channel text NOT NULL DEFAULT 'in_app',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered_via text NOT NULL DEFAULT 'in_app',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_daily (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bucket_date date NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  model text,
  provider text,
  runs integer NOT NULL DEFAULT 0,
  successes integer NOT NULL DEFAULT 0,
  failures integer NOT NULL DEFAULT 0,
  tokens integer NOT NULL DEFAULT 0,
  cost numeric(14, 6) NOT NULL DEFAULT 0,
  latency_sum_ms bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, bucket_date, project_id, agent_id, model, provider)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_tokens (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify', 'reset')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_members_user ON organization_members (user_id);
CREATE INDEX IF NOT EXISTS idx_members_org ON organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects (organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents (organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_project ON agents (project_id);
CREATE INDEX IF NOT EXISTS idx_runs_org_started ON agent_runs (organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_org_status ON agent_runs (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_runs_project ON agent_runs (project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_agent ON agent_runs (agent_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_trace ON agent_runs (trace_id);
CREATE INDEX IF NOT EXISTS idx_runs_model ON agent_runs (organization_id, model);
CREATE INDEX IF NOT EXISTS idx_steps_run ON run_steps (run_id, sequence);
CREATE INDEX IF NOT EXISTS idx_llm_run ON llm_calls (run_id);
CREATE INDEX IF NOT EXISTS idx_tools_run ON tool_calls (run_id);
CREATE INDEX IF NOT EXISTS idx_errors_org ON errors (organization_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_org ON alerts (organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_org ON alert_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_org_date ON usage_daily (organization_id, bucket_date);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys (organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
`;
