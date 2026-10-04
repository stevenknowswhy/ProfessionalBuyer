"use client";

import { Camera, ImagePlus } from "lucide-react";
import { useState } from "react";
import type { Household } from "@buyer/contract";
import { formatUsd } from "@buyer/contract";
import { sampleLines, type ReceiptLine } from "@/lib/receipt";

export function CaptureReceipt({
  household,
  onCompare,
}: {
  household?: Household;
  onCompare: (line: ReceiptLine, source: "vision" | "sample", retailer: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<ReceiptLine[] | null>(null);
  const [retailer, setRetailer] = useState("");
  const [source, setSource] = useState<"vision" | "sample">("vision");

  function take(next: File | null) {
    if (!next) return;
    setFile(next);
    setLines(null);
    setError(null);
    setSource("vision");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(next));
  }

  async function readPhoto() {
    if (!file) return;
    setReading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("image", file);
      const res = await fetch("/api/receipt/read", { method: "POST", body });
      const json = (await res.json()) as { error?: string; retailer?: string; lines?: ReceiptLine[] };
      if (!res.ok || !json.lines?.length) {
        setError(json.error ?? "That photo could not be read.");
        return;
      }
      setRetailer(json.retailer ?? "");
      setLines(json.lines);
      setSource("vision");
    } catch {
      setError("The photo could not be sent. Check the connection and try again.");
    } finally {
      setReading(false);
    }
  }

  function useSample() {
    if (!household) return;
    const sample = sampleLines(household);
    setRetailer(sample.retailer);
    setLines(sample.lines);
    setSource("sample");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="type-heading text-[1.75rem] text-ink">Photograph a receipt</h2>
        <p className="max-w-[36ch] text-body text-ink-soft">
          Take a picture or upload one. Pick a line, and the buyer searches your stores for the same item.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="pressable flex min-h-36 cursor-pointer flex-col items-start justify-between rounded-panel bg-ink p-4 text-paper-raised">
          <Camera aria-hidden className="size-6" />
          <span className="text-body font-semibold">Take a picture</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => take(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="pressable surface flex min-h-36 cursor-pointer flex-col items-start justify-between p-4 text-ink">
          <ImagePlus aria-hidden className="size-6" />
          <span className="text-body font-semibold">Upload a photo</span>
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => take(event.target.files?.[0] ?? null)} />
        </label>
      </div>

      {preview && (
        <figure className="surface overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="The receipt you added" className="max-h-64 w-full object-contain bg-paper-sunk" />
          <figcaption className="flex items-center justify-between gap-3 p-3">
            <span className="truncate text-small text-ink-soft">{file?.name ?? "Receipt photo"}</span>
            <button
              type="button"
              onClick={readPhoto}
              disabled={reading}
              className="pressable min-h-10 shrink-0 rounded-chip bg-ink px-3 text-small font-semibold text-paper-raised disabled:opacity-60"
            >
              {reading ? "Reading" : "Read this receipt"}
            </button>
          </figcaption>
        </figure>
      )}

      {error && (
        <p role="alert" className="rounded-card bg-carmine-wash px-3 py-3 text-small text-carmine">
          {error}
        </p>
      )}

      {lines && lines.length > 0 && (
        <section aria-labelledby="receipt-lines" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="receipt-lines" className="text-small font-semibold text-ink">
              {retailer ? retailer : "Receipt"} lines
            </h3>
            {source === "sample" && <span className="text-micro font-semibold text-ink-soft">Sample data</span>}
          </div>
          <ul className="flex flex-col">
            {lines.map((line) => (
              <li key={line.id} className="border-b border-rule/70 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onCompare(line, source, retailer)}
                  className="pressable flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left"
                >
                  <span>
                    <span className="block text-body font-semibold text-ink">{line.name}</span>
                    <span className="text-small text-ink-soft">
                      {line.quantity} {line.unit}
                    </span>
                  </span>
                  <span className="money text-body text-ink">{formatUsd(line.lineTotalCents)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={useSample}
        disabled={!household}
        className="self-start text-small font-semibold text-ink-soft underline-offset-4 hover:underline disabled:opacity-50"
      >
        Use the sample receipt
      </button>
    </div>
  );
}
