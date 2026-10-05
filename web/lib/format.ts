import type { Channel, Sponsor } from "@buyer/contract";

export { formatUsd } from "@buyer/contract";

/** Formats a contract unit cost (fractional cents per normalized unit) without rounding it into dollars. */
export function formatUnitCents(cents: number): string {
  const digits = cents < 10 ? 2 : 1;
  return `${cents.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}¢`;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} s`;
}

const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export const formatTime = (iso: string) => timeFormat.format(new Date(iso));
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

export const SPONSOR_NAMES: Record<Sponsor, string> = {
  neon: "Neon",
  mastra: "Mastra",
  exa: "Exa",
  fly: "Fly.io",
  kernel: "Kernel",
  executor: "Executor",
  "assistant-ui": "assistant-ui",
  agentmail: "AgentMail",
  coderabbit: "CodeRabbit",
  laya: "Laya",
  system: "System",
};

export const CHANNEL_NAMES: Record<Channel, string> = {
  local: "Local",
  shipped: "Shipped",
  "long-haul": "Long-haul",
};

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
