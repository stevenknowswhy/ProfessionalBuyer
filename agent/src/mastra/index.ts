import { chatRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
import { apiError, HttpError } from "../errors";
import { buyerAgent } from "./agents/buyer";
import { apiRoutes } from "./routes";

const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const mastra = new Mastra({
  agents: { buyer: buyerAgent },
  bundler: { transpilePackages: ["@buyer/contract"] },
  server: {
    port: Number(process.env.PORT ?? 4111),
    // The contract owns /api/*, so Mastra's built-in routes move under /mastra/api.
    apiPrefix: "/mastra/api",
    cors: {
      origin: frontendOrigins,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-mastra-client-type"],
      credentials: false,
    },
    apiRoutes: [...apiRoutes, chatRoute({ path: "/chat/:agentId", version: "v7" })],
    onError: (err, c) => {
      if (err instanceof HttpError) return c.json(apiError(err.code, err.message), err.status);
      console.error(err);
      return c.json(apiError("internal_error", err.message || "Internal server error"), 500);
    },
  },
});
