/**
 * Points the existing buyer-worker Sprite at this worker and runs it as a service.
 * Does not create a sprite.
 *
 *   DATABASE_URL=... pnpm --filter worker deploy:sprite
 *
 * Auth is the logged-in `sprite` CLI (org stefano94120). SPRITES_TOKEN is not required.
 * The database URL is written on the Sprite as worker.env and is never printed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SPRITE_TARGET, assertExistingSprite, assertSpriteUrl } from "../src/sprite-target";

const workerDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const interval = process.env.WORKER_INTERVAL_MS?.trim() || "120000";
const HTTP_PORT = "8080";

function spriteBin(): string {
  const fromEnv = process.env.SPRITE_BIN?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const local = join(homedir(), ".local/bin/sprite");
  if (existsSync(local)) return local;
  return "sprite";
}

const bin = spriteBin();

function run(args: string[], input?: string): { code: number; stdout: string; stderr: string } {
  const r = spawnSync(bin, args, { input, encoding: "utf8" });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: `${r.stderr ?? ""}${r.error ? r.error.message : ""}` };
}

function must(args: string[], input?: string): string {
  const r = run(args, input);
  if (r.code !== 0) {
    const detail = `${r.stderr}\n${r.stdout}`.replace(process.env.DATABASE_URL ?? "\u0000", "<DATABASE_URL>");
    throw new Error(`sprite ${args.join(" ")} failed (${r.code}): ${detail.slice(0, 2000)}`);
  }
  return r.stdout;
}

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL is not set. The Sprite worker needs Neon to write observations; refusing to deploy a dry-run worker.");
  process.exit(1);
}

console.log("[deploy] bundling worker");
const build = spawnSync("pnpm", ["run", "build"], { cwd: workerDir, stdio: "inherit" });
if ((build.status ?? 1) !== 0) process.exit(build.status ?? 1);

const { org, name, url } = SPRITE_TARGET;
const listed = must(["-o", org, "list"]);
const names = listed
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("Command") && !l.includes(" "));
assertExistingSprite(names, name);
console.log(`[deploy] using existing sprite ${org}/${name}`);

const infoRaw = must(["-o", org, "-s", name, "exec", "--no-stdin", "--", "sprite-env", "info"]);
const info = JSON.parse(infoRaw) as { sprite_url?: string };
if (!info.sprite_url) throw new Error("sprite-env info did not include sprite_url");
assertSpriteUrl(info.sprite_url, url);
console.log(`[deploy] sprite URL ${info.sprite_url}`);

const home = must(["-o", org, "-s", name, "exec", "--no-stdin", "--", "bash", "-lc", "printf %s \"$HOME\""]).trim();
if (!home.startsWith("/")) throw new Error("could not read the sprite home directory");
const appDir = `${home}/buyer-worker`;
must(["-o", org, "-s", name, "exec", "--no-stdin", "--", "bash", "-lc", `mkdir -p ${appDir}`]);

const bundlePath = join(workerDir, "dist", "index.js");
const bundle = readFileSync(bundlePath);
const startPath = join(workerDir, "scripts/sprite-start.sh");
// `sprite file push` stats the remote path on the local machine. `--file` uploads into the sprite.
const upload = (local: string, remote: string) =>
  must(["-o", org, "-s", name, "exec", "--file", `${local}:${remote}`, "--no-stdin", "--", "true"]);
upload(bundlePath, `${appDir}/index.js`);
upload(startPath, `${appDir}/start.sh`);
must(["-o", org, "-s", name, "exec", "--no-stdin", "--", "chmod", "+x", `${appDir}/start.sh`]);

const envFile = [
  `DATABASE_URL=${shellQuote(dbUrl)}`,
  `WORKER_INTERVAL_MS=${shellQuote(interval)}`,
  `PORT=${shellQuote(HTTP_PORT)}`,
  "NODE_ENV=production",
  "",
].join("\n");
must(
  ["-o", org, "-s", name, "exec", "--", "bash", "-lc", `umask 077; cat > ${appDir}/worker.env`],
  envFile,
);
console.log(`[deploy] uploaded ${bundle.length} bytes to ${appDir}/index.js (database url not printed)`);

const services = must(["-o", org, "-s", name, "exec", "--no-stdin", "--", "sprite-env", "services", "list"]);
if (services.includes("worker")) {
  console.log("[deploy] replacing existing worker service");
  must(["-o", org, "-s", name, "exec", "--no-stdin", "--", "sprite-env", "services", "delete", "worker"]);
}
const nodePath = must(["-o", org, "-s", name, "exec", "--no-stdin", "--", "bash", "-lc", "command -v node"]).trim();
if (!nodePath.startsWith("/")) throw new Error("node is not installed on the Sprite");
console.log(`[deploy] node ${nodePath}`);

must([
  "-o",
  org,
  "-s",
  name,
  "exec",
  "--no-stdin",
  "--",
  "sprite-env",
  "services",
  "create",
  "worker",
  "--cmd",
  "/bin/sh",
  "--args",
  "start.sh",
  "--dir",
  appDir,
  "--http-port",
  HTTP_PORT,
  "--no-stream",
]);

const state = must(["-o", org, "-s", name, "exec", "--no-stdin", "--", "sprite-env", "services", "get", "worker"]);
console.log(`[deploy] service worker created on ${url}`);
console.log(state.split(dbUrl).join("<DATABASE_URL>").slice(0, 1500));

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
