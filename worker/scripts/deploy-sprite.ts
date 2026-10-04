/**
 * Deploys the worker to a Fly Sprite and runs it as a supervised service.
 *
 *   SPRITES_TOKEN=... DATABASE_URL=... pnpm --filter worker deploy:sprite
 *
 * 1. Bundles worker/ into one file (dist/index.js) with esbuild.
 * 2. Gets or creates the Sprite (SPRITE_NAME, default buyer-worker) and uploads the bundle.
 * 3. Creates/updates service "worker" (node index.js, HTTP status on 8080) so it restarts on boot and wake.
 *    The worker itself holds a renewable Sprite task over /.sprite/api.sock so the Sprite stays awake.
 * Secrets are passed as service env and never printed. The AgentMail WebSocket never runs here.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SpritesClient, type Sprite } from "@fly/sprites";

const token = process.env.SPRITES_TOKEN?.trim();
const dbUrl = process.env.DATABASE_URL?.trim();
const name = process.env.SPRITE_NAME?.trim() || "buyer-worker";
const interval = process.env.WORKER_INTERVAL_MS?.trim() || "120000";
const APP_DIR_NAME = "buyer-worker";
const HTTP_PORT = 8080;

if (!token) {
  console.error("SPRITES_TOKEN is not set. Fallback: run the worker locally with `pnpm --filter worker start` (watches stay runs_on=local).");
  process.exit(1);
}
if (!dbUrl) {
  console.error("DATABASE_URL is not set. The Sprite worker needs Neon to write observations; refusing to deploy a dry-run worker.");
  process.exit(1);
}

const workerDir = join(dirname(fileURLToPath(import.meta.url)), "..");

console.log("[deploy] bundling worker");
execFileSync("pnpm", ["run", "build"], { cwd: workerDir, stdio: "inherit" });
const bundle = readFileSync(join(workerDir, "dist", "index.js"));

const client = new SpritesClient(token);
const sprite = await getOrCreate(client, name);

const sh = async (script: string) => {
  const r = await sprite.execFile("bash", ["-lc", script]);
  if (r.exitCode !== 0) throw new Error(`sprite command failed (${r.exitCode}): ${script}\n${r.stderr}`);
  return String(r.stdout).trim();
};

const home = await sh("echo $HOME");
const nodePath = await sh("command -v node || true");
if (!nodePath) throw new Error("node is not installed on the Sprite");
console.log(`[deploy] sprite ${name}: node ${await sh("node -v")} at ${nodePath}`);

const appDir = `${home}/${APP_DIR_NAME}`;
await sh(`mkdir -p ${appDir}`);
await sprite.filesystem().writeFile(`${appDir}/index.js`, bundle);
console.log(`[deploy] uploaded ${bundle.length} bytes to ${appDir}/index.js`);

const logs = await sprite.createService(
  "worker",
  {
    cmd: nodePath,
    args: ["index.js"],
    dir: appDir,
    env: { DATABASE_URL: dbUrl, WORKER_INTERVAL_MS: interval, PORT: String(HTTP_PORT), NODE_ENV: "production" },
    httpPort: HTTP_PORT,
  },
  "10s",
);
for (let ev = await logs.next(); ev; ev = await logs.next()) {
  const line = JSON.stringify(ev);
  console.log(`[service] ${dbUrl ? line.split(dbUrl).join("<DATABASE_URL>") : line}`);
}

const svc = await sprite.getService("worker");
console.log(`[deploy] service worker: ${svc.state?.status ?? "unknown"}${svc.state?.pid ? ` pid ${svc.state.pid}` : ""}`);
console.log(`[deploy] status URL: \`sprite url -s ${name}\` (GET / returns cycle counters only)`);
console.log(`[deploy] verify keep-awake: sprite exec -s ${name} -- curl -s --unix-socket /.sprite/api.sock http://sprite/v1/tasks`);

async function getOrCreate(c: SpritesClient, spriteName: string): Promise<Sprite> {
  try {
    return await c.getSprite(spriteName);
  } catch {
    console.log(`[deploy] creating sprite ${spriteName}`);
    return c.createSprite(spriteName);
  }
}
