import { NextResponse } from "next/server";
import { buildNearbyStores, type NearbyAddress } from "@/lib/nearby-stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAddress(value: unknown): value is NearbyAddress {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return ["addressLine", "city", "region", "postalCode", "country"].every(
    (key) => typeof body[key] === "string" && body[key].trim().length > 0,
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send an address." }, { status: 400 });
  }
  if (!isAddress(body)) {
    return NextResponse.json({ error: "Send a street, city, region, postal code, and country." }, { status: 400 });
  }
  const result = await buildNearbyStores(body);
  return NextResponse.json(result);
}
