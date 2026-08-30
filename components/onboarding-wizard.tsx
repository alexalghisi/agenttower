"use client";

import { useState } from "react";
import { completeOnboardingAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeBlock } from "@/components/product/code-block";
import { stacks } from "@/types/domain";

const LABELS: Record<(typeof stacks)[number], string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  "google-gemini": "Google Gemini",
  custom: "Custom",
  langchain: "LangChain",
  langgraph: "LangGraph",
  "vercel-ai-sdk": "Vercel AI SDK",
};

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [stack, setStack] = useState<(typeof stacks)[number]>("vercel-ai-sdk");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    const result = await completeOnboardingAction({ organizationName, projectName, stack });
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("apiKey" in result && result.apiKey) {
      setApiKey(result.apiKey);
      setStep(5);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-6">
      <p className="text-xs text-muted-foreground">Step {step} of 5</p>
      {step === 1 ? (
        <div className="mt-4 space-y-3">
          <Label htmlFor="org">Organization name</Label>
          <Input id="org" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
          <Button onClick={() => setStep(2)} disabled={!organizationName.trim()}>Continue</Button>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="mt-4 space-y-3">
          <Label htmlFor="project">Project name</Label>
          <Input id="project" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
          <Button onClick={() => setStep(3)} disabled={!projectName.trim()}>Continue</Button>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {stacks.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStack(item)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${stack === item ? "border-primary bg-accent" : "border-border"}`}
            >
              {LABELS[item]}
            </button>
          ))}
          <Button className="sm:col-span-2" onClick={() => setStep(4)}>Continue</Button>
        </div>
      ) : null}
      {step === 4 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            The next action generates a key, stores only the SHA-256 hash, and shows the plaintext once.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button onClick={finish}>Generate API key</Button>
        </div>
      ) : null}
      {step === 5 && apiKey ? (
        <div className="mt-4 space-y-4">
          <CodeBlock label="AGENTTOWER_API_KEY" code={apiKey} />
          <CodeBlock
            label="packages/sdk example"
            code={`import { AgentTower } from "@agenttower/sdk";

const agentTower = new AgentTower({
  apiKey: process.env.AGENTTOWER_API_KEY,
  baseUrl: "${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}",
});

const trace = agentTower.startRun({
  agent: "customer-support-agent",
});

await agentTower.finishRun(trace, { status: "success" });`}
          />
          <Button asChild>
            <a href="/dashboard">Open dashboard</a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
