/**
 * Continual store scout. Each cycle asks OpenRouter's free router for big-box
 * stores most families shop, checks that the site answers, and writes new ones
 * to web/data/discovered-stores.json. The Stores screen reads that file.
 *
 *   node web/scripts/store-scout.mjs          # loop
 *   node web/scripts/store-scout.mjs --once   # one cycle
 *
 * SCOUT_INTERVAL_MS defaults to 15 minutes. Requires OPENROUTER_API_KEY.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "data", "discovered-stores.json");
const catalogPath = join(root, "lib", "stores.ts");
const intervalMs = Number(process.env.SCOUT_INTERVAL_MS ?? 15 * 60 * 1000);
const once = process.argv.includes("--once");
const model = "openrouter/free";

function knownDomains() {
  const source = readFileSync(catalogPath, "utf8");
  return new Set([...source.matchAll(/"([a-z0-9.-]+\.[a-z]{2,})"/g)].map((match) => match[1]));
}

function loadFound() {
  try {
    const parsed = JSON.parse(readFileSync(outPath, "utf8"));
    return Array.isArray(parsed.stores) ? parsed.stores : [];
  } catch {
    return [];
  }
}

function slug(domain) {
  return domain.replace(/\.[a-z]{2,}$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function scanWeb() {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("EXA_API_KEY is not set");
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({
      query: "big-box supercenter and warehouse club stores most American families shop for groceries and household goods",
      numResults: 8,
      contents: { highlights: true },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Exa HTTP ${res.status}`);
  const json = await res.json();
  return (json.results ?? []).map((result) => ({
    title: result.title ?? "",
    url: result.url ?? "",
    highlights: Array.isArray(result.highlights) ? result.highlights.filter((part) => typeof part === "string").slice(0, 2) : [],
  }));
}

async function ask(known) {
  let lastError = "The free model did not return JSON";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await askOnce(known);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`attempt ${attempt}: ${lastError}`);
    }
  }
  throw new Error(lastError);
}

async function askOnce(known) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const pages = await scanWeb();
  if (pages.length === 0) throw new Error("The web scan returned no pages");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            'Reply with JSON only: {"stores":[{"name":"string","domain":"hostname without www","url":"https://..."}]}. No markdown. Use only stores named in the web results. Keep general-merchandise big-box stores and warehouse clubs. Drop department stores, apparel, tools, sports, and farm stores.',
        },
        {
          role: "user",
          content: `Web results:\n${JSON.stringify(pages)}\n\nSkip known domains: ${[...known].sort().join(", ")}. Return at most 8 stores.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) {
    console.error(`free model reply was not JSON (${text.slice(0, 180).replace(/\s+/g, " ")})`);
    throw new Error("The free model did not return JSON");
  }
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed.stores) || parsed.stores.length === 0) {
    console.error(`free model JSON had no stores (${text.slice(0, 180).replace(/\s+/g, " ")})`);
  }
  const blob = JSON.stringify(pages).toLowerCase();
  const stores = Array.isArray(parsed.stores) ? parsed.stores : [];
  const grounded = stores.filter((store) => typeof store?.name === "string" && blob.includes(store.name.toLowerCase()));
  console.log(
    `model returned ${stores.map((store) => store?.name).filter(Boolean).join(", ") || "nothing"}; ${grounded.length} names appear in the web results`,
  );
  return grounded;
}

async function siteAnswers(url, domain) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "MarginStoreScout/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    const host = new URL(res.url || url).hostname.replace(/^www\./, "");
    const alive = res.status < 500;
    return alive && (host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function normalize(raw, known) {
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  const domain = typeof raw?.domain === "string" ? raw.domain.trim().toLowerCase().replace(/^www\./, "") : "";
  const url = typeof raw?.url === "string" ? raw.url.trim() : domain ? `https://www.${domain}` : "";
  if (!name || name.length > 40 || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || known.has(domain)) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  return { id: slug(domain), name, domain, url: `${parsed.protocol}//${parsed.host}`, group: "big-box" };
}

async function cycle(cycleNumber) {
  const known = knownDomains();
  for (const store of loadFound()) if (store.domain) known.add(store.domain);
  const suggested = await ask(known);
  console.log(`model named ${suggested.length} grounded stores`);
  const accepted = [];
  for (const raw of suggested.slice(0, 8)) {
    const store = normalize(raw, known);
    if (!store) continue;
    const ok = await siteAnswers(store.url, store.domain);
    if (!ok) {
      console.log(`skip ${store.domain}: site did not answer`);
      continue;
    }
    known.add(store.domain);
    accepted.push({ ...store, foundAt: new Date().toISOString() });
    console.log(`add ${store.name} ${store.url}`);
  }
  const stores = [...loadFound(), ...accepted];
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify({ updatedAt: new Date().toISOString(), model, focus: "big-box", cycle: cycleNumber, stores }, null, 2) + "\n",
  );
  console.log(`cycle ${cycleNumber}: ${accepted.length} new, ${stores.length} saved`);
}

let cycleNumber = 0;
do {
  cycleNumber += 1;
  try {
    await cycle(cycleNumber);
  } catch (err) {
    console.error(`cycle ${cycleNumber} failed: ${err instanceof Error ? err.message : err}`);
  }
  if (once) break;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
} while (!once);
