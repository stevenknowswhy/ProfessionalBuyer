"use client";

import { TraceEvent, type Approval } from "@buyer/contract";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { mutate, type SWRConfiguration } from "swr";
import { DATA_SOURCE, USE_FIXTURES, api, endpointUrl, request, type Params, type ResponseOf, type RestEndpoint } from "./api";
import { TRACE_STREAM_INTERVAL_MS, fixtureTraceSplit, subscribeFixtureTrace } from "./fixtures";

type Key<N extends RestEndpoint> = readonly [N, Params?];

function useEndpoint<N extends RestEndpoint>(
  name: N | null,
  params?: Params,
  config?: SWRConfiguration<ResponseOf<N>>,
) {
  const key: Key<N> | null = name ? (params ? [name, params] : [name]) : null;
  const swr = useSWR<ResponseOf<N>>(key, ([n, p]: Key<N>) => request(n, { params: p }), {
    revalidateOnFocus: false,
    ...config,
  });
  return { ...swr, source: DATA_SOURCE };
}

export const useHealth = () => useEndpoint("health");
export const useHousehold = () => useEndpoint("household");
export const useSavingsLatest = () => useEndpoint("savingsLatest");
export const useSavingsRun = (id: string | null) => useEndpoint(id ? "savingsById" : null, id ? { id } : undefined);
export const useTraceHistory = () => useEndpoint("traceHistory");
export const useWatches = () => useEndpoint("watches");
export const useWatchObservations = (watchId: string | null) =>
  useEndpoint(watchId ? "watchObservations" : null, watchId ? { id: watchId } : undefined);

/** Polls every second while any approval is executing (CONTRACT.md, approval flow step 4). */
export const useApprovals = () =>
  useEndpoint("approvals", undefined, {
    refreshInterval: (latest?: Approval[]) => (latest?.some((a) => a.status === "executing") ? 1000 : 0),
  });

const refresh = (name: RestEndpoint) => mutate((key) => Array.isArray(key) && key[0] === name);

export function useActions() {
  const approve = useCallback(async (id: string) => {
    const result = await api.approve(id);
    await refresh("approvals");
    return result;
  }, []);
  const decline = useCallback(async (id: string) => {
    const result = await api.decline(id);
    await refresh("approvals");
    return result;
  }, []);
  const scan = useCallback(async () => {
    const result = await api.scan();
    await Promise.all([refresh("household"), refresh("savingsLatest")]);
    return result;
  }, []);
  const seed = useCallback(async () => {
    const result = await api.seed();
    await refresh("household");
    return result;
  }, []);
  const sendBriefing = useCallback(() => api.sendBriefing(), []);
  return { approve, decline, scan, seed, sendBriefing };
}

export type TraceStreamStatus = "connecting" | "open" | "reconnecting" | "error";

const MAX_TRACE_EVENTS = 200;
const FIRST_FIXTURE_DELAY_MS = 600;

/**
 * History from GET /api/trace/history, then live events from the GET /api/trace SSE stream.
 * Fixture mode plays the sample trace on a timer and keeps listening for scripted events (approve, scan).
 */
export function useTraceStream() {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [status, setStatus] = useState<TraceStreamStatus>("connecting");
  const [rejected, setRejected] = useState(0);
  const seen = useRef(new Set<string>());

  const push = useCallback((raw: unknown) => {
    const parsed = TraceEvent.safeParse(raw);
    if (!parsed.success) {
      setRejected((n) => n + 1);
      return;
    }
    if (seen.current.has(parsed.data.id)) return;
    seen.current.add(parsed.data.id);
    setEvents((prev) => [...prev, parsed.data].slice(-MAX_TRACE_EVENTS));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cleanups: (() => void)[] = [];

    request("traceHistory")
      .then((history) => {
        if (!cancelled) history.forEach(push);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    if (USE_FIXTURES) {
      const { stream } = fixtureTraceSplit();
      const timers = stream.map((event, i) =>
        setTimeout(() => push(event), FIRST_FIXTURE_DELAY_MS + i * TRACE_STREAM_INTERVAL_MS),
      );
      cleanups.push(() => timers.forEach(clearTimeout));
      cleanups.push(subscribeFixtureTrace(push));
      setStatus("open");
    } else {
      const source = new EventSource(endpointUrl("trace"));
      source.onopen = () => setStatus("open");
      source.onerror = () => setStatus(source.readyState === EventSource.CLOSED ? "error" : "reconnecting");
      source.onmessage = (message) => {
        try {
          push(JSON.parse(message.data));
        } catch {
          setRejected((n) => n + 1);
        }
      };
      cleanups.push(() => source.close());
    }

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [push]);

  return { events, status, rejected, source: DATA_SOURCE };
}
