# Release agent plan (starts 2:45 PM)

A short-lived fourth agent. Do **not** start it earlier: before 2:45 there is nothing integrated to test, and an extra agent only adds PRs for one human to review.
Read: [PLAN.md](PLAN.md) sections 2, 7 and 9, [CONTRACT.md](CONTRACT.md), the three other plans' acceptance checklists.

## Mission

Make sure what exists actually works end to end and that the submission shows every sponsor, while the three builders keep building. It finds problems and fixes docs. It does not build features.

## Owns

`README.md`, `techStack.md` (status columns and "how it works" text the builders put in their PR descriptions), `docs/`, `scripts/rehearse.ts`, `scripts/contract-smoke.ts` if core has not written it. Never edits `web/`, `agent/`, `integrations/` or `worker/`: it files bugs in its PR description, addressed to the owning agent, and the human relays them.

Branch: `cursor/release-5766`.

## Tasks

1. **2:45** Run `pnpm install`, start everything, run `pnpm preflight` and the contract smoke test against the live backend. Report each red with the owning agent.
2. **3:00** Walk the demo script in [PLAN.md section 9](PLAN.md#9-demo-script-v2-200) and time each beat. Write the click path and the fallback for each beat to `docs/demo-runbook.md`.
3. **3:15** Capture screenshots at 1440 and 1920 widths for the design review. Run Lighthouse on `/` and the app.
4. **3:30** Update the README sponsor table status column from Planned to Live, Fallback or Missing, based on evidence, and paste the builders' "how it works" sections into README and techStack.md. Add real CodeRabbit catches to the open-source section.
5. **3:40** Rehearsals: three clean runs in a row (`review` mode). Log each to `docs/rehearsals.md` with time and result.
6. **4:00** Freeze. Help record the 2-minute fallback video and the 15-second GIF. Fill the submission form text in `docs/submission.md` for the human to paste by 4:15.

## Kickoff prompt

```
You are the RELEASE agent for "Personal Professional Buyer", a hackathon app due 4:30 PM PT today (feature freeze 4:00 PM, submit by 4:15). I am the only human. Three builder agents own web/, agent/ and integrations/+worker/; you must not edit their code.

Read PLAN-release.md, PLAN.md (sections 2, 7, 9), CONTRACT.md and the acceptance checklists in PLAN-frontend.md, PLAN-backend.md and PLAN-integrations.md.

Work on branch cursor/release-5766 from main. Follow the task list by time. Report every failure with the owning agent and exact reproduction steps in your PR description. Update README.md and techStack.md status only from evidence you observed.
```
