import { Badge } from "@/components/ui/badge";

const MAP = {
  success: { label: "Success", variant: "success" as const },
  error: { label: "Error", variant: "error" as const },
  running: { label: "Running", variant: "warning" as const },
  cancelled: { label: "Cancelled", variant: "default" as const },
  open: { label: "Open", variant: "error" as const },
  resolved: { label: "Resolved", variant: "success" as const },
  ignored: { label: "Ignored", variant: "default" as const },
  active: { label: "Active", variant: "success" as const },
};

export function StatusBadge({ status }: { status: string }) {
  const mapped = MAP[status as keyof typeof MAP] ?? { label: status, variant: "default" as const };
  return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
}
