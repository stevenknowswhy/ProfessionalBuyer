"use client";

import type { Item, Watch, WatchObservation } from "@buyer/contract";
import { EmptyState } from "@/components/data-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime, formatUsd, plural } from "@/lib/format";
import { useWatchObservations } from "@/lib/hooks";
import { Sparkline } from "./sparkline";

export function WatchRow({
  watch,
  item,
  observations,
}: {
  watch: Watch;
  item?: Item;
  observations?: WatchObservation[];
}) {
  const prices = (observations ?? []).flatMap((o) => (o.priceCents === null ? [] : [o.priceCents]));
  const name = item?.name ?? watch.itemId;
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 py-3">
      <p className="text-small font-semibold text-ink">{name}</p>
      <p className="money text-right text-small text-ink">
        {watch.lastPriceCents === null ? "No price yet" : formatUsd(watch.lastPriceCents)}
      </p>
      <p className="text-micro text-ink-soft">
        Since {formatTime(watch.startedAt)}, {plural(watch.observationCount, "check")}
        {watch.runsOn === "sprite" ? " on a Fly Sprite" : ", local fallback"}
      </p>
      <div className="row-span-1 flex justify-end text-ink">
        {observations === undefined ? (
          <Skeleton className="h-7 w-[120px] rounded-chip bg-paper-sunk" />
        ) : (
          <Sparkline values={prices} label={`Price history for ${name}, ${plural(prices.length, "check")}`} />
        )}
      </div>
    </li>
  );
}

function LiveWatchRow({ watch, item }: { watch: Watch; item?: Item }) {
  const { data } = useWatchObservations(watch.id);
  return <WatchRow watch={watch} item={item} observations={data} />;
}

export function WatchList({ watches, items }: { watches: Watch[]; items: Item[] }) {
  if (watches.length === 0) {
    return <EmptyState title="Nothing watched yet" body="After a scan, the buyer keeps checking the best offers and records every price it sees." />;
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  return (
    <ul className="flex flex-col divide-y divide-rule/60">
      {watches.map((w) => (
        <LiveWatchRow key={w.id} watch={w} item={byId.get(w.itemId)} />
      ))}
    </ul>
  );
}
