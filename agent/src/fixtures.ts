import { createRequire } from "node:module";
import {
  Approval,
  Health,
  Household,
  SavingsRun,
  TraceEvent,
  Watch,
  WatchObservation,
} from "@buyer/contract";
import { z } from "zod";

// Loaded with require at runtime: the Mastra bundler drops JSON import attributes.
const require = createRequire(import.meta.url);
const load = (name: string): unknown => require(`@buyer/contract/fixtures/${name}.sample.json`);

/** Parsed once at startup, so a fixture that drifts from the contract fails loudly instead of reaching the UI. */
export const fixtures = {
  approvals: z.array(Approval).parse(load("approvals")),
  health: Health.parse(load("health")),
  household: Household.parse(load("household")),
  savings: SavingsRun.parse(load("savings")),
  trace: z.array(TraceEvent).parse(load("trace")),
  watches: z.array(Watch).parse(load("watches")),
  observations: z.array(WatchObservation).parse(load("watch-observations")),
};
