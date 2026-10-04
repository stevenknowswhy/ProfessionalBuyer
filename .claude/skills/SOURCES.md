# Vendored agent skills

Copied (not symlinked) on Oct 4, 2026 so every cloud agent gets the same pinned version. Do not edit these; re-copy from the source to update. Licenses travel with each skill (`LICENSE`, `LICENSE.txt` or `NOTICE`).

| Skill | Used by | Source | Commit | License |
|---|---|---|---|---|
| `laya-integration` | backend-core, integrations | brainfunctioncollapse.com/laya | n/a | per source |
| `assistant-ui`, `assistant-ui-setup`, `assistant-ui-tools`, `assistant-ui-elements`, `assistant-ui-runtime` | frontend | [assistant-ui/skills](https://github.com/assistant-ui/skills) (renamed from `setup`, `tools`, `elements`, `runtime` to avoid collisions) | 139674d | MIT (stated in README) |
| `shadcn` | frontend | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) `skills/shadcn` | 295a1f1 | MIT |
| `frontend-design` | frontend | [anthropics/skills](https://github.com/anthropics/skills) | 8a1541c | Apache-2.0 (`LICENSE.txt`) |
| `emil-design-eng`, `review-animations` | frontend | [emilkowalski/skills](https://github.com/emilkowalski/skills) | e8a175d | MIT |
| `web-design-guidelines` | frontend, release | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | 063bee9 | MIT (stated in README) |
| `mastra` | backend-core | [mastra-ai/skills](https://github.com/mastra-ai/skills) | 1ddd321 | Apache-2.0 |
| `neon-postgres`, `neon-ai-gateway` | backend-core, integrations | [neondatabase/agent-skills](https://github.com/neondatabase/agent-skills) | 9e4a570 | Apache-2.0 |
| `build-with-exa` | backend-core | [exa-labs/agent-skills](https://github.com/exa-labs/agent-skills) | 975171a | MIT |
| `kernel-typescript-sdk` | integrations | [kernel/skills](https://github.com/kernel/skills) | 6571289 | MIT |
| `sprites` | integrations | [superfly/skills](https://github.com/superfly/skills) | 502646d | MIT |

Not vendored: AgentMail's skills ([agentmail-to/agentmail-skills](https://github.com/agentmail-to/agentmail-skills)) have no license, so the integrations agent installs them into its own VM with `npx skills add agentmail-to/agentmail-skills --skill agentmail -g -y` and does not commit them.
