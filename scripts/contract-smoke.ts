/**
 * Hits every REST endpoint in ENDPOINTS (plus the trace SSE stream and /chat/buyer) and parses each response
 * with its contract schema. Exits nonzero on any failure.
 *
 *   pnpm contract:smoke                       # against http://localhost:4111
 *   API_BASE=http://host:4111 pnpm contract:smoke
 */
import { ApiError, ENDPOINTS, ToolResults, TraceEvent, type EndpointName } from "../contract/src/index.ts";
import type { z } from "zod";

const BASE = (process.env.API_BASE ?? "http://localhost:4111").replace(/\/$/, "");
const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

type Result = { name: string; ok: boolean; note: string };
const results: Result[] = [];
const covered = new Set<EndpointName>();

function record(name: string, ok: boolean, note: string) {
  results.push({ name, ok, note });
}

async function call<N extends EndpointName>(
  name: N,
  params: Record<string, string> = {},
): Promise<z.infer<(typeof ENDPOINTS)[N]["response"]> | undefined> {
  const ep = ENDPOINTS[name];
  const path = ep.path.replace(/:(\w+)/g, (_, k: string) => encodeURIComponent(params[k] ?? ""));
  const label = `${name.padEnd(17)} ${ep.method.padEnd(4)} ${path}`;
  covered.add(name);
  try {
    const res = await fetch(BASE + path, { method: ep.method, headers: { Origin: ORIGIN } });
    const body = await res.json();
    if (!res.ok) {
      const err = ApiError.safeParse(body);
      record(label, false, `HTTP ${res.status} ${err.success ? err.data.error.code : JSON.stringify(body).slice(0, 120)}`);
      return undefined;
    }
    const parsed = ep.response.safeParse(body);
    if (!parsed.success) {
      record(label, false, `schema: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      return undefined;
    }
    const cors = res.headers.get("access-control-allow-origin");
    record(label, cors === ORIGIN, cors === ORIGIN ? `HTTP ${res.status}` : `missing CORS header for ${ORIGIN} (got ${cors})`);
    return parsed.data as z.infer<(typeof ENDPOINTS)[N]["response"]>;
  } catch (e) {
    record(label, false, `request failed: ${(e as Error).message}`);
    return undefined;
  }
}

async function readSse(path: string, init: RequestInit, maxMs: number, onData: (data: string) => boolean) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), maxMs);
  try {
    const res = await fetch(BASE + path, { ...init, signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) throw new Error(`content-type ${contentType}`);
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trimEnd();
        buffer = buffer.slice(nl + 1);
        if (line.startsWith("data:") && onData(line.slice(5).trim())) return;
      }
    }
  } finally {
    clearTimeout(timer);
    ctrl.abort();
  }
}

async function smokeTrace(minEvents: number) {
  const ep = ENDPOINTS.trace;
  const label = `${"trace".padEnd(17)} ${ep.method.padEnd(4)} ${ep.path} (SSE)`;
  covered.add("trace");
  let count = 0;
  try {
    await readSse(ep.path, { headers: { Origin: ORIGIN, Accept: "text/event-stream" } }, 10_000, (data) => {
      TraceEvent.parse(JSON.parse(data));
      return ++count >= minEvents;
    });
    record(label, count >= minEvents, `${count} TraceEvents parsed`);
  } catch (e) {
    record(label, false, count >= minEvents ? `${count} events` : `after ${count} events: ${(e as Error).message}`);
  }
}

async function smokeChat() {
  const label = `${"chat".padEnd(17)} POST /chat/buyer (UI message stream v7)`;
  let toolOutput: unknown;
  let text = "";
  try {
    await readSse(
      "/chat/buyer",
      {
        method: "POST",
        headers: { Origin: ORIGIN, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ id: "smoke-1", role: "user", parts: [{ type: "text", text: "How much could I save this year?" }] }],
        }),
      },
      60_000,
      (data) => {
        if (data === "[DONE]") return true;
        const part = JSON.parse(data) as { type: string; output?: unknown; delta?: string; errorText?: string };
        if (part.type === "tool-output-available") toolOutput = part.output;
        if (part.type === "text-delta") text += part.delta ?? "";
        if (part.type === "error") throw new Error(part.errorText ?? "stream error");
        return false;
      },
    );
    const parsed = ToolResults.showSavings.safeParse(toolOutput);
    record(label, parsed.success, parsed.success ? `showSavings output parsed; text: "${text.slice(0, 60)}..."` : "no valid showSavings tool output");
  } catch (e) {
    record(label, false, (e as Error).message);
  }
}

async function smokeErrors() {
  const label = `${"errors".padEnd(17)} GET  /api/savings/does-not-exist`;
  try {
    const res = await fetch(`${BASE}/api/savings/does-not-exist`);
    const parsed = ApiError.safeParse(await res.json());
    record(label, res.status === 404 && parsed.success, `HTTP ${res.status} ${parsed.success ? parsed.data.error.code : "not an ApiError"}`);
  } catch (e) {
    record(label, false, (e as Error).message);
  }
}

async function main() {
  console.log(`Contract smoke against ${BASE}\n`);
  await call("health");
  await call("household");
  await call("seed");
  const scan = await call("scan");
  const latest = await call("savingsLatest");
  await call("savingsById", { id: latest?.id ?? scan?.runId ?? "" });
  await call("traceHistory");
  await smokeTrace(3);

  const pending = (await call("approvals"))?.find((a) => a.status === "pending");
  const approved = await call("approvalApprove", { id: pending?.id ?? "" });
  if (approved && approved.status === "pending") record("approvalApprove status", false, "still pending after approve");
  await call("seed");
  const pendingAgain = (await call("approvals"))?.find((a) => a.status === "pending");
  const declined = await call("approvalDecline", { id: pendingAgain?.id ?? "" });
  if (declined && declined.status !== "declined") record("approvalDecline status", false, `status ${declined.status}`);

  const watches = await call("watches");
  await call("watchObservations", { id: watches?.[0]?.id ?? "" });
  await call("sendBriefing");
  await smokeErrors();
  await smokeChat();

  const missing = (Object.keys(ENDPOINTS) as EndpointName[]).filter((n) => !covered.has(n));
  if (missing.length) record("coverage", false, `endpoints not exercised: ${missing.join(", ")}`);

  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  ${r.note}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();
