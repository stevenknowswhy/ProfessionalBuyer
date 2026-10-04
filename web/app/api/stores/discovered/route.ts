import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "discovered-stores.json"), "utf8");
    const parsed = JSON.parse(raw) as { updatedAt?: string; model?: string; focus?: string; stores?: unknown };
    const stores = Array.isArray(parsed.stores) ? parsed.stores : [];
    return NextResponse.json({
      updatedAt: parsed.updatedAt ?? null,
      model: parsed.model ?? "openrouter/free",
      focus: parsed.focus ?? "big-box",
      stores,
    });
  } catch {
    return NextResponse.json({ updatedAt: null, model: "openrouter/free", focus: "big-box", stores: [] });
  }
}
