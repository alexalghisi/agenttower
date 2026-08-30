import { ingestRunSchema } from "@/lib/ingestion/schema";
import { ingestRun } from "@/lib/ingestion/service";
import { rateLimit } from "@/lib/api/rate-limit";

function requestId(): string {
  return crypto.randomUUID();
}

export async function POST(request: Request) {
  const id = request.headers.get("x-request-id") ?? requestId();
  const limit = rateLimit(request.headers.get("authorization") ?? request.headers.get("x-forwarded-for") ?? "anon");
  if (!limit.ok) {
    return Response.json(
      { error: { code: "rate_limited", message: "Too many requests", details: { resetAt: limit.resetAt } } },
      { status: 429, headers: { "X-Request-Id": id, "Retry-After": "60" } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json(
      { error: { code: "invalid_json", message: "Body must be JSON" } },
      { status: 400, headers: { "X-Request-Id": id } },
    );
  }

  const parsed = ingestRunSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "validation_error", message: "Invalid run payload", details: parsed.error.flatten() } },
      { status: 422, headers: { "X-Request-Id": id } },
    );
  }

  const result = await ingestRun(request.headers.get("authorization"), parsed.data);
  if (!result.ok) {
    return Response.json(
      { error: { code: result.code, message: result.message } },
      { status: result.status, headers: { "X-Request-Id": id } },
    );
  }

  console.info(JSON.stringify({ msg: "ingest.run", requestId: id, runId: result.runId, created: result.created }));
  return Response.json(
    { data: { runId: result.runId, created: result.created } },
    { status: result.created ? 201 : 200, headers: { "X-Request-Id": id } },
  );
}
