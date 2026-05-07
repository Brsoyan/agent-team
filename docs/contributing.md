# Contributing

Thanks for being here. The bar for changes is "**does this make the agents ship better apps?**" — not feature count, not abstract goodness.

## Before you write code

1. **Open an issue** for anything beyond a typo. Cheaper for both sides than a PR closed for scope.
2. **Pick the right lane.** Most contributions fall into one of these:
   - [New agent](/extending/agents) — a new specialist in the pipeline (security, i18n, a11y, …)
   - [New gate check](/extending/gates) — a non-LLM check that runs between Developer and Reviewer
   - [New knowledge pack](/extending/knowledge-packs) — markdown context every agent sees
   - [Project template](/extending/templates) — wanted feature, not yet built; open an issue first
   - **Core** — board UX, orchestrator behavior, API, CLI ergonomics
3. **Read the lane's docs page.** It'll tell you exactly which files change.

## What's in scope

| Yes | No |
|-----|-----|
| New agents and gate checks | Renames / refactors with no functional change |
| Bug fixes with a repro | "Best practice" patterns we don't have a use for yet |
| Clearer error messages | Cosmetic prompt edits without measurable effect |
| Knowledge packs (with rationale) | Adding deps that solve nothing concrete |
| Board UX improvements (with screenshots) | New abstractions for hypothetical future cases |
| Docs corrections + clarifications | Docs that re-explain React, TypeScript, or Expo |

## Local setup

### Backend + board

```bash
git clone https://github.com/brsoyan/agent-team
cd agent-team
npm install
cd board && npm install && cd ..
npm run dev
```

The API server runs on `127.0.0.1:3333`, the board on `http://localhost:7788`.

### Docs site

Only needed if you're editing pages under `docs/`:

```bash
cd docs
npm install
npm run docs:dev
```

VitePress serves at `http://localhost:5173` with hot reload. Build locally to check production output:

```bash
npm run docs:build
npm run docs:preview
```

## Code style

- **TypeScript with `strict: true`.** No `any` without a comment explaining why.
- **One topic per file.** If a file is doing two unrelated things, split it.
- **No comments unless they explain *why*.** The code says *what*. Don't write JSDoc for self-evident parameters.
- **React: function components only**, hooks at the top, no class components.
- **Keep diffs small.** <300 lines is friendly to review. >800 needs a justification in the PR description.

## Commit + PR

- One topic per PR. If your description says "Also: …", that's a second PR.
- PR title in present tense: `add security-auditor agent`, not `added` / `adding`.
- Include before/after screenshots for board changes.
- Mention the extension lane in the PR template's checklist.

## Verification before opening a PR

- `npx tsc --noEmit` is clean.
- `npm run dev` boots; you've exercised your change in the board.
- For new agents: ran a full pipeline day on a sample project. Agent shows up in the pipeline view.
- For new gate checks: triggered a failure case once and confirmed the failure comment appears on the task.
- For docs: `cd docs && npm run docs:build` succeeds.

## Reviewing other PRs

Reviews are a contribution. The bar:

- **Did the contributor pick the right lane?** A "core" change that's actually four custom agents needs to be split.
- **Does the diff size match the change?** A 500-line agent file probably copied too much from an existing one.
- **Is there a screenshot / repro?** UI without a screenshot, agent without a sample run — request one.
- **Be kind.** This is unpaid weekend work for everyone involved.

## Deploying the docs site

If you're a maintainer and want to test the deploy:

- Push to `main` with changes in `docs/**` → GitHub Actions builds and deploys to GitHub Pages.
- Workflow file: [`.github/workflows/docs-deploy.yml`](https://github.com/brsoyan/agent-team/blob/main/.github/workflows/docs-deploy.yml).

### Cloudflare Pages instead of GitHub Pages

If you want to host the docs on Cloudflare Pages (faster CDN, custom domain easier):

1. In Cloudflare dashboard → Pages → "Connect to Git" → pick the repo.
2. **Build command:** `cd docs && npm install && npm run docs:build`
3. **Build output directory:** `docs/.vitepress/dist`
4. **Root directory:** leave blank (project root).
5. In `docs/.vitepress/config.ts`, change `base: '/agent-team/'` to `base: '/'` (Cloudflare Pages serves at the domain root).

Both can coexist — GitHub Actions for `<user>.github.io/agent-team/`, Cloudflare for a custom domain.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](https://github.com/brsoyan/agent-team/blob/main/LICENSE).
