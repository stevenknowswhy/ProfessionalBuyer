# API keys to get

The build does not wait for these. Every service has a labeled fallback, so the agents build now and switch to the real service when its key arrives. Get them in this order (most impact first). Names match [`.env.example`](.env.example).

**Where to put them:** add each one as a secret in the Cursor Dashboard (Cloud Agents > Secrets, scoped to this repo) so the cloud agents can test with it, and in your local `.env` on the demo laptop. Never paste a key into a chat, an issue, a PR or a committed file.

Check the hackathon page and sponsor tables for credit codes before paying for anything.

## 1. Needed for the core demo

| # | Service | Env var(s) | Where to get it | Notes | Status |
|---|---|---|---|---|---|
| 1 | **Neon** Postgres | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | [console.neon.tech](https://console.neon.tech): create a project, or run `npx neon@latest init` / `neon env pull` | Pick region `aws-us-east-1`, `aws-us-east-2`, `aws-eu-central-1` or `aws-ap-southeast-1` so the AI Gateway works too | ☐ |
| 2 | **Exa** | `EXA_API_KEY` | [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys) | Powers the live price scan and the yearly number | ☐ |
| 3 | **OpenAI** (default LLM) | `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Default for every model call (`gpt-4o-mini`). ✅ provided | ✅ |
| 3b | **OpenRouter** (fallback LLM) | `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | Used automatically when OpenAI is rate-limited or down, through the free router (`openrouter/free`). ✅ provided | ✅ |
| 4 | **Kernel** | `KERNEL_API_KEY` | [dashboard.onkernel.com](https://dashboard.onkernel.com), API keys | Price verification and checkout with live view | ☐ |
| 5 | **AgentMail** | `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID` | [console.agentmail.to](https://console.agentmail.to): create a key, then create an inbox and copy its ID | The inbox you forward receipts to. Also set `BRIEFING_TO_EMAIL` to your own address | ☐ |
| 6 | **Fly.io Sprites** | `SPRITES_TOKEN` | [sprites.dev](https://sprites.dev) (Fly.io account), create an API token | **Needed by 1:30 PM** so the worker is watching prices by 1:45 and the demo has real history | ☐ |

## 2. Set up, but no key to paste

| Service | What to do | Status |
|---|---|---|
| **Executor** (v1) | Nothing to sign up for: it runs locally (`npm i -g executor && executor install && executor web`, port 4788). The backend agent sets it up; you run the same on the demo laptop | ☐ |
| **Kernel Vault** (payment) | In the Kernel dashboard, create a Vault item with a **low-limit** card. Put the item's name in `KERNEL_VAULT_PAYMENT_ITEM`. Only needed for the final `place` run; `review` mode never pays | ☐ |
| **Laya** | On the demo laptop: download the weights now on fast Wi-Fi (about 2.3 GB, see `.claude/skills/laya-integration/SKILL.md`), then run offline with `HF_HUB_OFFLINE=1` | ☐ |
| **CodeRabbit** | Already installed. Comment `@coderabbitai full review` on each PR from your own account | ✅ |
| **assistant-ui, Mastra** | Open source, no key | ✅ |

## 3. Settings you choose (no signup)

| Env var | Default | Decide |
|---|---|---|
| `CHECKOUT_MODE` | `review` | Switch to `place` only after two clean rehearsals |
| `SPEND_CAP_USD` | `25` | Max for one purchase |
| `MERCHANT_ALLOWLIST` | empty | The integrations agent proposes a guest-checkout store; you confirm |
| `BRIEFING_TO_EMAIL` | empty | Your email |

## When a key arrives

Tell the agent which service is ready (not the key itself). It will confirm the secret name, switch that service from fallback to live, and the status page (`/status`) will turn green for it.
