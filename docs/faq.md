# FAQ

The questions that come up first.

## Do I need an Anthropic API key?

**No, if you have a Claude subscription** (Pro / Max). Run `claude login` once; every agent reuses your session. There's no `.env`, no per-token bill.

**Yes, if you don't have a subscription.** Set `ANTHROPIC_API_KEY=sk-ant-...` in the shell that runs `npm run dev`. The Claude Code CLI picks it up automatically and uses the API instead — you're billed per token.

## How much does it cost to run a day?

Two answers depending on path:

- **With a Claude subscription:** zero direct cost. You're capped by your subscription's usage limits, which hit fast on Pro and slowly on Max. A single "Run Day" on a small project burns through a Pro session quickly.
- **With API key:** depends entirely on which Claude model the CLI is set to and how big the codebase is. Expect $1-$5 per "Run Day" on a small project, more if QA writes a lot of E2E tests. Watch your bill.

## What kinds of apps actually work end-to-end?

What's known to work:

- **Single-screen utilities** — habit trackers, counters, simple loggers.
- **Multi-screen apps with local state only** — todo lists, journals, RSS readers.
- **Apps that wrap a public REST API** with no auth, or token-in-config auth.

What flops:

- **Apps with complex backends.** No backend agent today. You'll bolt one on yourself.
- **Apps that depend on native modules outside Expo's prebuilt set.** The Developer can `expo install` from the Expo SDK, but anything requiring custom CocoaPods or AndroidManifest changes needs human work.
- **Pixel-perfect designs from a Figma file.** The Designer agent picks a palette and screen layouts, but it's not reading your design tool. If you have a strict design, hand-edit the design doc before the Developer runs.

## Why is the Quality Gate not just "let the Reviewer agent run `tsc`"?

Cost and reliability. `tsc` is deterministic, free, and runs in 30s. An LLM Reviewer running `tsc` and reasoning about the output costs tokens and might hallucinate the result. The gate is the cheap, reliable layer; the Reviewer is the expensive judgment layer. Don't waste judgment on what a `tsc` exit code can answer.

## Security

This is the most important section. Read it.

The agents run with `--dangerously-skip-permissions`. That flag means Claude Code will not prompt before running shell commands, reading files, or writing files. **This is intentional** — a human-in-the-loop would break the multi-agent pipeline — but it has real implications.

What it actually means:

- **Filesystem access.** Each agent is scoped to `workspace/<project-id>/` via `--add-dir`. They can write, delete, and execute inside that directory. They cannot read your `~/.ssh/` or `~/Library/Keychains/` because the OS-level permissions still apply… but if the Claude Code CLI process has those permissions (it usually doesn't on macOS), the agents do too.
- **Network access.** Agents can hit any URL. They will run `npm install` against arbitrary packages. They will fetch from the internet to research APIs.
- **Spawn arbitrary processes.** They will run `xcodebuild`, `adb`, anything else needed for their job. They could, in principle, run anything else too.

What this means in practice:

1. **Don't run this on a machine with secrets you can't afford to leak.** Cloud SSH keys, password manager exports sitting in `~/Downloads`, work credentials. Use a dedicated dev account or a VM.
2. **Keep the API server on localhost.** It binds to `127.0.0.1` by default. Don't `ngrok` it, don't port-forward it, don't run it on a shared box without authentication.
3. **Review agent-generated code before running it outside the sandbox.** `npx expo run:ios` with the agents' code is fine — it's running on your phone in dev mode. Shipping that code to TestFlight or the App Store is your call after a code review.

## Can I trust the generated app?

For personal projects: yes, with the standard caveats (read the diff, run it on a phone, file bugs).

For anything you'd publish under your name: not without a careful manual review. The agents try, the Reviewer agent helps, but they're not your code-review team. Treat the output like a junior contractor's: useful starting point, not finished work.

## Why Expo and not bare React Native?

Three reasons:

1. **No `pod install` headaches.** Bare RN forces you to know about Ruby, CocoaPods, and Xcode tooling on day one. Expo defers that to `expo prebuild` once you actually need it.
2. **Single command builds.** `expo run:ios --device <udid>` with code signing handled. The agents can use this without an interactive UI.
3. **Sensible defaults.** Expo Router, file-based routing, EAS — most modern RN apps look like Expo apps anyway.

Trade-off: if your app needs a native module that isn't in Expo's prebuilt set, you'll `expo prebuild` and start hand-editing the iOS / Android dirs yourself. The agents won't follow you there.

## Why six agents and not three? Or twelve?

Six is what fit naturally:

- **PM + Critic** — adversarial pair on the spec. The Critic catches what the PM misses.
- **Designer + Developer** — design-first, then code. Skipping design produces apps that look LLM-generated.
- **Reviewer + QA** — code review, then end-to-end testing. Different concerns, different skills.
- **Manager** — the supervisor. Has visibility everyone else lacks.

Adding more (security auditor, accessibility reviewer, i18n localizer) is a normal extension via [Adding an agent](/extending/agents). Removing any of the six produces noticeably worse output.

## Can I use this with Claude Sonnet instead of Opus?

Yes. Claude Code CLI's model is set per session. If you want different agents to use different models, that's a per-role setting in the `agent.ts` spawn — open an issue if you'd like a UI for it.

## What if my project gets stuck?

Two failure modes:

1. **A task is `in_progress` forever.** Click the task, "Reset" — sets it back to its previous status and unassigns. The next pipeline run picks it up fresh.
2. **A task ping-pongs between Developer and Reviewer.** Look at the comments — usually the Reviewer is asking for something the Developer can't infer from the spec. Add a comment yourself with the resolution, or edit the design / spec file to clarify.

The Manager (supervisor) tries to catch these on its pre-pipeline pass and unblock them, but it's not infallible.

## How do I update an agent's prompt?

Two ways:

- **Globally:** edit `src/agents/<role>.ts` and restart `npm run dev`.
- **Per project:** the **Agents** tab on the board lets you override per-project titles and add per-project instructions. Stored under `data/projects/<id>/`.

## My docs build fails on GitHub Pages with 404 for assets

Almost always the `base` path. In `docs/.vitepress/config.ts`, the default is `'/agent-team/'` — that matches `https://<you>.github.io/agent-team/`. If you forked under a different repo name, change it. If you deploy to a custom domain or to Cloudflare Pages at the apex, set `base: '/'`.

## Is there a way to run agents in parallel?

Today, no — the orchestrator runs one agent at a time, in pipeline order. This is intentional: the agents coordinate through the board JSON, and parallel writes would race. If you want speedup, the right move is to push more work into the deterministic Quality Gate (which *can* run things in parallel internally) rather than parallelizing agents.
