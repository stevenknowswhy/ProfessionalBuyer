import { ApiError, ENDPOINTS, type EndpointName } from "@buyer/contract";
import type { z } from "zod";
import { FIXTURE_LATENCY_MS, FixtureNotFound, fixtureResponse } from "./fixtures";

/**
 * The one data layer. Every response, live or fixture, is validated with the contract's Zod schema.
 * NEXT_PUBLIC_API_BASE unset, or NEXT_PUBLIC_USE_FIXTURES=1, serves contract/fixtures/*.sample.json.
 */

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");
export const USE_FIXTURES = API_BASE === "" || process.env.NEXT_PUBLIC_USE_FIXTURES === "1";

/** "fixture" data is always labeled as sample in the UI, whatever its own provenance field says. */
export type DataSource = "fixture" | "live";
export const DATA_SOURCE: DataSource = USE_FIXTURES ? "fixture" : "live";

export type RestEndpoint = Exclude<EndpointName, "trace">;
export type ResponseOf<N extends EndpointName> = z.output<(typeof ENDPOINTS)[N]["response"]>;
export type Params = Record<string, string>;

export type ApiErrorKind = "network" | "http" | "contract" | "not-found";

export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind;
  readonly endpoint: string;
  readonly status?: number;
  readonly code?: string;
  readonly issues?: z.core.$ZodIssue[];

  constructor(init: {
    kind: ApiErrorKind;
    endpoint: string;
    message: string;
    status?: number;
    code?: string;
    issues?: z.core.$ZodIssue[];
  }) {
    super(init.message);
    this.name = "ApiRequestError";
    this.kind = init.kind;
    this.endpoint = init.endpoint;
    this.status = init.status;
    this.code = init.code;
    this.issues = init.issues;
  }
}

export function endpointPath(name: EndpointName, params: Params = {}): string {
  return ENDPOINTS[name].path.replace(/:(\w+)/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined) throw new Error(`Missing path parameter "${key}" for ${name}`);
    return encodeURIComponent(value);
  });
}

export function endpointUrl(name: EndpointName, params: Params = {}): string {
  return `${API_BASE}${endpointPath(name, params)}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadRaw(name: RestEndpoint, params: Params, body: unknown, signal?: AbortSignal): Promise<unknown> {
  const { method, path } = ENDPOINTS[name];
  const label = `${method} ${path}`;

  if (USE_FIXTURES) {
    await sleep(FIXTURE_LATENCY_MS);
    try {
      return fixtureResponse(name, params);
    } catch (error) {
      if (error instanceof FixtureNotFound) {
        throw new ApiRequestError({ kind: "not-found", endpoint: label, status: 404, code: error.code, message: error.message });
      }
      throw error;
    }
  }

  let response: Response;
  try {
    response = await fetch(endpointUrl(name, params), {
      method,
      signal,
      headers: body === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiRequestError({
      kind: "network",
      endpoint: label,
      message: `Could not reach the buyer service at ${API_BASE}. Check that it is running.`,
    });
  }

  const json: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const parsed = ApiError.safeParse(json);
    throw new ApiRequestError({
      kind: response.status === 404 ? "not-found" : "http",
      endpoint: label,
      status: response.status,
      code: parsed.success ? parsed.data.error.code : undefined,
      message: parsed.success ? parsed.data.error.message : `The buyer service answered ${response.status}.`,
    });
  }
  return json;
}

export async function request<N extends RestEndpoint>(
  name: N,
  options: { params?: Params; body?: unknown; signal?: AbortSignal } = {},
): Promise<ResponseOf<N>> {
  const endpoint = ENDPOINTS[name];
  const raw = await loadRaw(name, options.params ?? {}, options.body, options.signal);
  const parsed = endpoint.response.safeParse(raw);
  if (!parsed.success) {
    throw new ApiRequestError({
      kind: "contract",
      endpoint: `${endpoint.method} ${endpoint.path}`,
      message: "The response did not match the contract, so it is not shown.",
      issues: parsed.error.issues,
    });
  }
  return parsed.data as ResponseOf<N>;
}

export const api = {
  health: () => request("health"),
  household: () => request("household"),
  seed: () => request("seed"),
  scan: () => request("scan"),
  savingsLatest: () => request("savingsLatest"),
  savingsById: (id: string) => request("savingsById", { params: { id } }),
  traceHistory: () => request("traceHistory"),
  approvals: () => request("approvals"),
  approve: (id: string) => request("approvalApprove", { params: { id } }),
  decline: (id: string) => request("approvalDecline", { params: { id } }),
  watches: () => request("watches"),
  watchObservations: (id: string) => request("watchObservations", { params: { id } }),
  sendBriefing: () => request("sendBriefing"),
};
