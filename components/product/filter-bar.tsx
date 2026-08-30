"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FilterBar({
  projects,
  agents,
  models,
  showSearch = false,
}: {
  projects: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  models: { model: string | null; provider: string | null }[];
  showSearch?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {["24h", "7d", "30d"].map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => set("range", range)}
          className={`h-8 rounded-md border px-2.5 text-xs ${
            (params.get("range") ?? "7d") === range ? "border-primary bg-accent text-accent-foreground" : "border-border"
          }`}
        >
          {range}
        </button>
      ))}
      <Select value={params.get("project") ?? "all"} onValueChange={(value) => set("project", value)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Project" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("environment") ?? "all"} onValueChange={(value) => set("environment", value)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Environment" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All envs</SelectItem>
          <SelectItem value="production">production</SelectItem>
          <SelectItem value="staging">staging</SelectItem>
          <SelectItem value="development">development</SelectItem>
        </SelectContent>
      </Select>
      <Select value={params.get("agent") ?? "all"} onValueChange={(value) => set("agent", value)}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Agent" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All agents</SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("status") ?? "all"} onValueChange={(value) => set("status", value)}>
        <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="success">success</SelectItem>
          <SelectItem value="error">error</SelectItem>
          <SelectItem value="running">running</SelectItem>
        </SelectContent>
      </Select>
      {showSearch ? (
        <Input
          defaultValue={params.get("q") ?? ""}
          placeholder="Search trace ID or agent"
          className="w-56"
          onKeyDown={(event) => {
            if (event.key === "Enter") set("q", event.currentTarget.value);
          }}
        />
      ) : null}
      {models.length ? <span className="sr-only">{models.length} models</span> : null}
    </div>
  );
}
