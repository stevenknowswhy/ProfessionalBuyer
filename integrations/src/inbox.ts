/**
 * AgentMail inbox listener.
 *
 *   pnpm --filter @buyer/integrations inbox
 *
 * Each inbound message is POSTed to core's ingest HTTP route when that route
 * exists. Otherwise it calls the exported `ingestReceipt` function, which core
 * can import from `@buyer/integrations`.
 */
import { fileURLToPath } from "node:url";
import { loadLocalSecrets } from "./env";
import { deliverToCore, inboundToIngest } from "./ingest";
import { createIntegrations } from "./index";

export async function startInbox(): Promise<() => void> {
  loadLocalSecrets();
  const integrations = createIntegrations();
  console.log(`[inbox] ${integrations.mail.inboxAddress()}`);
  return integrations.mail.onInbound(async (email) => {
    const result = await deliverToCore(inboundToIngest(email), (event) => {
      const via = event.detail?.via ?? event.detail?.reason ?? "";
      console.log(`[trace] ${event.sponsor} ${event.status} ${event.label}${via ? ` ${via}` : ""}`);
    });
    console.log(`[inbox] ${email.messageId} via=${result.via} accepted=${result.accepted} ${result.note}`);
  }, (event) => {
    console.log(`[trace] ${event.sponsor} ${event.status} ${event.label}`);
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  startInbox().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
