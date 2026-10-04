"use client";

import { ApprovalCard } from "@/components/approval/approval-card";
import { ComposerPreview, ConversationPreview } from "@/components/conversation/conversation-preview";
import { DataError, EmptyState, RowsSkeleton } from "@/components/data-state";
import { HouseholdLedger } from "@/components/ledger/household-ledger";
import { ProvenanceBadge } from "@/components/provenance";
import { SavingsSummarySkeleton } from "@/components/savings/savings-summary";
import { SubSection, Zone } from "@/components/shell/zone";
import { TopBar } from "@/components/shell/top-bar";
import { TracePanel } from "@/components/trace/trace-panel";
import { WatchList } from "@/components/watch/watch-list";
import { DATA_SOURCE } from "@/lib/api";
import { plural } from "@/lib/format";
import { useActions, useApprovals, useHealth, useHousehold, useSavingsLatest, useTraceStream, useWatches } from "@/lib/hooks";

export function BuyerApp() {
  const household = useHousehold();
  const savings = useSavingsLatest();
  const health = useHealth();
  const approvals = useApprovals();
  const watches = useWatches();
  const trace = useTraceStream();
  const { approve, decline } = useActions();

  const open = approvals.data?.filter((a) => a.status !== "declined") ?? [];

  return (
    <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-paper">
      <TopBar household={household.data} health={health.data} source={DATA_SOURCE} />

      <main className="grid min-h-0 grid-cols-1 xl:grid-cols-[20rem_minmax(0,1fr)_25rem] 2xl:grid-cols-[22rem_minmax(0,1fr)_28rem]">
        <Zone
          title="Household"
          labelledBy="zone-household"
          className="border-rule xl:border-r"
          aside={household.data && <span className="text-small text-ink-soft">{plural(household.data.items.length, "item")}</span>}
        >
          {household.error ? (
            <DataError error={household.error} onRetry={() => household.mutate()} />
          ) : household.data ? (
            <HouseholdLedger household={household.data} savings={savings.data} />
          ) : (
            <RowsSkeleton rows={6} />
          )}
        </Zone>

        <Zone
          title="Concierge"
          labelledBy="zone-concierge"
          bodyClassName="flex flex-col px-0 pb-0"
          aside={<ProvenanceBadge source={DATA_SOURCE} />}
        >
          <div className="mx-auto flex w-full max-w-[45rem] flex-1 flex-col px-6 py-4">
            {savings.error ? (
              <DataError error={savings.error} onRetry={() => savings.mutate()} />
            ) : savings.data === undefined ? (
              <SavingsSummarySkeleton />
            ) : savings.data === null ? (
              <EmptyState
                title="No savings run yet"
                body="Ask the buyer to scan your receipts. It reads them, prices every item across local, shipped and long-haul channels, and shows its working."
              />
            ) : (
              <ConversationPreview household={household.data} savings={savings.data} source={DATA_SOURCE} />
            )}
          </div>
          <div className="sticky bottom-0 bg-gradient-to-t from-paper from-70% to-transparent pt-6 pb-5">
            <div className="mx-auto w-full max-w-[45rem] px-6">
              <ComposerPreview />
            </div>
          </div>
        </Zone>

        <Zone title="Workbench" labelledBy="zone-workbench" className="border-rule xl:border-l" bodyClassName="flex flex-col gap-7">
          <SubSection
            title="Needs your approval"
            aside={approvals.data && <span className="text-small text-ink-soft">{plural(open.length, "purchase")}</span>}
          >
            {approvals.error ? (
              <DataError error={approvals.error} onRetry={() => approvals.mutate()} />
            ) : !approvals.data ? (
              <RowsSkeleton rows={1} />
            ) : open.length === 0 ? (
              <EmptyState title="Nothing to approve" body="When the buyer proposes a purchase, it waits here for you. It never spends without your approval." />
            ) : (
              open.map((a) => <ApprovalCard key={a.id} approval={a} onApprove={approve} onDecline={decline} source={DATA_SOURCE} />)
            )}
          </SubSection>

          <SubSection title="Activity" className="min-h-64">
            <TracePanel events={trace.events} status={trace.status} source={trace.source} className="max-h-[22rem]" />
          </SubSection>

          <SubSection title="Watching">
            {watches.error ? (
              <DataError error={watches.error} onRetry={() => watches.mutate()} />
            ) : watches.data ? (
              <WatchList watches={watches.data} items={household.data?.items ?? []} />
            ) : (
              <RowsSkeleton rows={3} />
            )}
          </SubSection>
        </Zone>
      </main>
    </div>
  );
}
