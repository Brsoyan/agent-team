# Contributing to agent-team

Thanks for your interest. This project is small and opinionated; the bar for changes is "does it make the agents ship better apps?" — not feature count.

## Quick links

- [Full contribution guide on the docs site](https://brsoyan.github.io/agent-team/contributing) (or your fork's GH Pages URL)
- [Architecture overview](https://brsoyan.github.io/agent-team/architecture)
- [The four extension lanes](https://brsoyan.github.io/agent-team/extending/agents) — agents, gates, knowledge packs, templates

## Before you open a PR

1. **Open an issue first** for anything beyond a typo or one-line bugfix. Cheaper for both of us than a PR that gets closed.
2. **Check existing issues / discussions** — your idea might already be in flight.
3. **Read the matching extension doc** if you're contributing in one of the four lanes (see below).

## What's in scope

| Yes | No |
|-----|-----|
| New agents (security auditor, i18n agent, …) | Refactors with no functional change |
| New quality-gate checks (lint, a11y, security scanners) | Renaming files/symbols for taste |
| New global knowledge packs (design systems, SDKs) | Cosmetic prompt edits without measurable effect |
| Bug fixes + clearer error messages | Adding dependencies that solve nothing concrete |
| Board UX improvements with screenshots | "Best practice" patterns we don't need yet |
| Docs corrections | New abstractions for hypothetical future cases |

## Local setup

```bash
git clone https://github.com/<you>/agent-team
cd agent-team
npm install
cd board && npm install && cd ..
npm run dev
```

The board lives at `http://localhost:7788`, the API at `127.0.0.1:3333`.

For the docs site (you only need this if you're editing pages under `docs/`):

```bash
cd docs
npm install
npm run docs:dev
```

## Code style

- TypeScript with `strict: true`. No `any` without a comment explaining why.
- Prefer **small, single-purpose modules**. If a file is doing two unrelated things, split it.
- **No comments** unless they explain *why*. The code says *what*.
- React: function components only, hooks at the top, no class components.

## Commit + PR

- One topic per PR. If you find yourself writing "Also: …" in the description, that's a second PR.
- PR title in present tense: `add security-auditor agent`, not `added` or `adding`.
- Include before/after screenshots for board changes.
- Mention which extension lane your change belongs to (or "core" if it's not in a lane).

## The four extension lanes

Most contributions fall into one of these. Each has a docs page that walks through the change with a real example. Read the page before you write code.

1. **New agents** — `src/agents/<role>.ts` + one entry in `src/agents/pipeline.ts`. See [extending/agents](https://brsoyan.github.io/agent-team/extending/agents).
2. **New gate checks** — extend the `checks: GateCheck[]` array on the gatekeeper entry in `pipeline.ts`. See [extending/gates](https://brsoyan.github.io/agent-team/extending/gates).
3. **New knowledge packs** — drop a markdown file under `data/global-knowledge/`. See [extending/knowledge-packs](https://brsoyan.github.io/agent-team/extending/knowledge-packs).
4. **Project templates** — *currently a wanted feature, no plumbing yet.* If you want to champion this, open an issue first; the design needs to be agreed before code lands.

## Getting your PR reviewed

Maintainer time is finite and unpaid. Make a reviewer's life easier:

- Keep the diff small. <300 lines is friendly; >800 needs justification.
- If you're adding an agent, include a screenshot of the pipeline view with your agent in it.
- If you're adding a gate check, include the output it produces on a real failing project.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).
