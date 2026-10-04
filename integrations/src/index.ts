/**
 * @buyer/integrations: Kernel, AgentMail, Laya triage and integration health, implementing `Integrations` from
 * @buyer/contract. Each service checks its env at call time and uses a labeled fallback when its key is missing.
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
