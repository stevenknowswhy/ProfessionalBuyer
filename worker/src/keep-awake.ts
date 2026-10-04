import { existsSync } from "node:fs";
import http from "node:http";

/**
 * Sprite Tasks API heartbeat (https://docs.fly.io/sprites/keeping-sprites-running.md): while a task is live the
 * Sprite does not pause. Short expiry, refreshed more often, deleted on exit; if the worker dies the task expires
 * on its own and the Sprite may pause (the service restarts the worker on the next wake).
 */
export const SPRITE_SOCKET = "/.sprite/api.sock";
export const onSprite = () => existsSync(SPRITE_SOCKET);

const TASK = "worker";

function spriteApi(method: string, path: string, body?: unknown): Promise<number> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(
      {
        socketPath: SPRITE_SOCKET,
        host: "sprite",
        path,
        method,
        headers: data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {},
        timeout: 5_000,
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode ?? 0));
      },
    );
    req.on("timeout", () => req.destroy(new Error("sprite api timeout")));
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

export function startKeepAwake(expire = process.env.WORKER_TASK_EXPIRE ?? "5m", refreshMs = Number(process.env.WORKER_TASK_REFRESH_MS ?? 60_000)) {
  if (!onSprite()) return { stop: async () => {} };
  const renew = async () => {
    try {
      const status = await spriteApi("PUT", `/v1/tasks/${TASK}`, { expire });
      if (status !== 200 && status !== 201) console.error(`[worker] sprite task renew returned HTTP ${status}`);
    } catch (err) {
      console.error(`[worker] sprite task renew failed: ${err instanceof Error ? err.message : err}`);
    }
  };
  void renew().then(() => console.log(`[worker] holding sprite task "${TASK}" (expire ${expire}, renew every ${refreshMs / 1000}s)`));
  const timer = setInterval(renew, refreshMs);
  return {
    stop: async () => {
      clearInterval(timer);
      await spriteApi("DELETE", `/v1/tasks/${TASK}`).catch(() => {});
    },
  };
}
