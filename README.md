# agent-team

Six AI agents that design, build, review, and test **Expo** (React Native) apps together. They communicate through a shared task board you can watch live in your browser.

Each agent is a separate Claude Code session with its own role and memory. They piggyback on your local `claude` CLI, so **there's no Anthropic API key to manage and no per-token bill** if you already pay for a Claude Pro / Max subscription.

📖 **[Full documentation →](https://brsoyan.github.io/agent-team)** ([How it works](https://brsoyan.github.io/agent-team/how-it-works) · [Architecture](https://brsoyan.github.io/agent-team/architecture) · [Extending](https://brsoyan.github.io/agent-team/extending/agents) · [FAQ](https://brsoyan.github.io/agent-team/faq))

## The team

| Role | Name | Job |
|---|---|---|
| Manager | Elena Ruiz | Supervisor — runs first each day, unblocks stuck tasks |
| PM | Sarah Chen | Writes specs from the user's PRD |
| Critic | Marcus Webb | Reviews specs, finds gaps and edge cases |
| Designer | Ava Moretti | Picks palette, defines screens / flows / states |
| Developer | James Park | Scaffolds the Expo app, writes code + unit tests |
| **Quality Gate** | *(automation)* | `tsc` + `jest` against the generated app — bounces failures back |
| Reviewer | Diana Okafor | Reviews code against the spec and design |
| QA | Raj Patel | Writes E2E tests, files bugs, signs off |

## Quick start

Prerequisites: **Node 20+** and the **Claude Code CLI** (`npm install -g @anthropic-ai/claude-code`, then `claude login`).

```bash
git clone https://github.com/brsoyan/agent-team
cd agent-team
npm install
cd board && npm install && cd ..
npm run dev
```

Open **http://localhost:7788**. Click **+ New Project**, give it a PRD, click **Run Day**. Watch the pipeline.

For iOS / Android device runs, see [Getting started → Run on a real device](https://brsoyan.github.io/agent-team/getting-started#run-the-generated-app-on-a-real-iphone).

## ⚠️ What the agents can do to your machine

This project spawns each agent with `npx @anthropic-ai/claude-code --dangerously-skip-permissions`. Agents run shell commands, install npm packages, and write files **without prompting**. They are scoped to `workspace/<project-id>/` via `--add-dir` — but the OS-level permissions still apply.

**Do not point this at a machine with secrets you can't afford to leak.** Use a dedicated dev account or a VM. The API server binds to `127.0.0.1` only — don't expose it via `ngrok` or port-forwarding.

Full security notes: [FAQ → Security](https://brsoyan.github.io/agent-team/faq#security).

## Extending

The pipeline is one TypeScript array in [`src/agents/pipeline.ts`](src/agents/pipeline.ts). Four ways to contribute:

1. **[New agents](https://brsoyan.github.io/agent-team/extending/agents)** — add a security auditor, i18n localizer, or accessibility reviewer in 3 file edits.
2. **[Quality-gate checks](https://brsoyan.github.io/agent-team/extending/gates)** — add ESLint, security scanners, bundle-size budgets.
3. **[Knowledge packs](https://brsoyan.github.io/agent-team/extending/knowledge-packs)** — markdown context every agent sees.
4. **[Project templates](https://brsoyan.github.io/agent-team/extending/templates)** — wanted feature, not yet built. Open an issue if you want to champion it.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## Commands

```bash
npm run dev   # API + board together (recommended)
npm run api   # API only (127.0.0.1:3333)
npm start     # CLI mode (run `npm start -- help` for subcommands)
```

## License

MIT — see [LICENSE](LICENSE).
