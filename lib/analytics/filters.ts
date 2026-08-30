import { rangeFromPreset } from "@/lib/utils";
import type { AnalyticsFilters, DatePreset, Environment, Provider, RunStatus } from "@/types/domain";

export function filtersFromSearch(search: URLSearchParams): AnalyticsFilters & { preset: DatePreset } {
  const preset = (search.get("range") as DatePreset | null) ?? "7d";
  const ranged =
    preset === "custom" && search.get("from") && search.get("to")
      ? { from: new Date(search.get("from") as string), to: new Date(search.get("to") as string) }
      : rangeFromPreset(preset === "custom" ? "7d" : preset);

  return {
    preset,
    ...ranged,
    projectId: search.get("project") ?? undefined,
    environment: (search.get("environment") as Environment | null) ?? undefined,
    agentId: search.get("agent") ?? undefined,
    model: search.get("model") ?? undefined,
    provider: (search.get("provider") as Provider | null) ?? undefined,
    status: (search.get("status") as RunStatus | null) ?? undefined,
    query: search.get("q") ?? undefined,
  };
}
