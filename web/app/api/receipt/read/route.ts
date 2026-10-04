import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Line = { id: string; name: string; quantity: number; unit: string; lineTotalCents: number };

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Add a photo of the receipt." }, { status: 400 });
  }
  if (file.size > 8_000_000) {
    return NextResponse.json({ error: "That photo is larger than 8 MB. Take another, closer to the receipt." }, { status: 400 });
  }
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Use a photo, not a document." }, { status: 400 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "The photo reader is not configured. Use the sample receipt to see the comparison." },
      { status: 503 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  let content = "";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Read a photo of a store receipt. Reply as JSON: {"retailer": string, "lines": [{"name": string, "quantity": number, "unit": string, "lineTotalCents": integer}]}. lineTotalCents is the line total in US cents. quantity is the count on that line. unit is sheet, diaper, egg, oz, roll, or unit. If the photo is not a receipt, return lines as an empty array and retailer as an empty string.',
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Read this receipt." },
              { type: "image_url", image_url: { url: `data:${mime};base64,${bytes.toString("base64")}` } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "The photo reader did not answer. Try the picture again." }, { status: 502 });
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    content = json.choices?.[0]?.message?.content ?? "";
  } catch {
    return NextResponse.json({ error: "The photo reader took too long. Try a smaller photo." }, { status: 504 });
  }

  let parsed: { retailer?: unknown; lines?: unknown };
  try {
    parsed = JSON.parse(content) as { retailer?: unknown; lines?: unknown };
  } catch {
    return NextResponse.json({ error: "The photo reader returned something unreadable. Try again." }, { status: 502 });
  }

  const lines = Array.isArray(parsed.lines) ? parsed.lines.flatMap((line, index): Line[] => normalizeLine(line, index)) : [];
  if (lines.length === 0) {
    return NextResponse.json(
      { error: "No items were readable in that photo. Fill the frame with the receipt and try again." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    retailer: typeof parsed.retailer === "string" ? parsed.retailer : "",
    lines,
    source: "vision",
  });
}

function normalizeLine(line: unknown, index: number): Line[] {
  if (!line || typeof line !== "object") return [];
  const row = line as { name?: unknown; quantity?: unknown; unit?: unknown; lineTotalCents?: unknown };
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const cents = Number(row.lineTotalCents);
  const quantity = Number(row.quantity);
  if (!name || !Number.isInteger(cents) || cents < 0) return [];
  return [
    {
      id: `line-${index + 1}`,
      name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit: typeof row.unit === "string" && row.unit.trim() ? row.unit.trim() : "unit",
      lineTotalCents: cents,
    },
  ];
}
