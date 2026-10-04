import { ToolResults } from "@buyer/contract";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { fixtures } from "../../fixtures";

export const showSavings = createTool({
  id: "showSavings",
  description: "Show the household's latest savings run: the yearly number and the per-item price tables.",
  inputSchema: z.object({}),
  outputSchema: ToolResults.showSavings,
  execute: async () => fixtures.savings,
});
