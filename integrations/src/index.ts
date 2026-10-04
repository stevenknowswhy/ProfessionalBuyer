/**
 * @buyer/integrations: AgentMail, Jev triage, and integration health, implementing `Integrations` from
 * @buyer/contract. The Kernel client stays in this package and is not called. Each live service uses a
 * labeled fallback when its key is missing.
 */
import type { Integrations } from "@buyer/contract";
import { health } from "./health";
import { createKernel } from "./kernel";
import { createMail } from "./mail";
import { createTriage } from "./triage";

export function createIntegrations(): Integrations {
  return { kernel: createKernel(), mail: createMail(), triage: createTriage(), health };
}

const integrations: Integrations = createIntegrations();
export default integrations;

export { checkPageTotal, nextCheckoutStep, formatCents } from "./checkout-guard";
export { extractPriceFromHtml, parseMoneyToCents } from "./price";
export { ingestReceipt, deliverToCore, inboundToIngest } from "./ingest";
export { AGENT_INBOX } from "./mail";
export { JEV_MODEL, JEV_DECISIONS_URL, jevRequestModel } from "./triage";
export { startInbox } from "./inbox";
