# Quality-gate checks

The **Quality Gate** sits between the Developer and the Reviewer. It runs shell commands against the generated Expo app and blocks the pipeline if a required check fails. No LLM, no token cost — just `tsc`, `jest`, `eslint`, or whatever you point it at.

## Why it exists

Without the gate, the Reviewer would routinely spend an LLM turn on code that doesn't compile. With the gate, broken code bounces back to the Developer with the failing output as a board comment, and the Reviewer only sees code that at least passes static checks.

## Default checks

Today there are two:

| Check | Command | Required? |
|---|---|---|
| TypeScript | `npm install --silent && npx tsc --noEmit` | **Yes** — blocks on fail |
| Unit tests | `npx jest --passWithNoTests --watchAll=false --ci` | No — warn-only |

Both run with `cwd: 'app'` (the generated Expo app's directory). The tail of stdout/stderr is posted as a comment on the task so you can see, from the board, why a task bounced back.

## Adding a check

Open [`src/agents/pipeline.ts`](https://github.com/brsoyan/agent-team/blob/main/src/agents/pipeline.ts), find the gatekeeper entry, append to its `checks` array.

```ts
{
  role: 'gatekeeper' as AgentRole,
  name: 'Quality Gate',
  title: 'Automated Checks',
  systemPrompt: '',
  pickUp: ['code_review'],
  handoff: { status: 'code_review', assignee: 'reviewer' },  // on pass
  onFail:  { status: 'code_review', assignee: 'developer' }, // on fail
  mode: 'gate',
  checks: [
    // ... existing tsc and jest ...
    {
      name: 'ESLint',
      command: 'npx eslint . --max-warnings=0',
      cwd: 'app',
      required: true,
      timeoutMs: 120_000,
    },
    {
      name: 'Bundle size',
      command: 'node ../../scripts/check-bundle-size.js',
      cwd: 'app',
      required: false,  // warn only
      timeoutMs: 60_000,
    },
  ],
}
```

`GateCheck` fields:

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | Shown on the board comment when the check fails. Keep short — "ESLint", not "ESLint with project rules". |
| `command` | `string` | Passed to a shell. Use `npm install --silent &&` if your check needs the app's dependencies. |
| `cwd` | `'app' \| 'workspace'` | `'app'` runs inside `workspace/<id>/code/<AppName>` (the Expo app). `'workspace'` runs at `workspace/<id>/`. |
| `required` | `boolean` | `true` blocks the pipeline on fail. `false` posts a warning and continues. |
| `timeoutMs` | `number?` | Defaults to 5 min. Anything that runs long enough to time out is probably the wrong shape for a gate. |

## Patterns that work well

- **Static analysis** — TypeScript, ESLint, Stylelint. Required = true once your project is established.
- **Bundle size budgets** — node script that errors if `dist/` is too big. Start `required: false` and tighten over time.
- **Security scanners** — `npm audit --audit-level=high`, `osv-scanner`, `gitleaks`. `required: true` for high severity.
- **Accessibility checks** — `npx axe-core` against rendered screens, or static checks like `eslint-plugin-jsx-a11y`.
- **API contract drift** — if your app talks to a known backend, a check that diffs the OpenAPI schema and fails on breaking changes.

## Patterns that don't work well

- **Anything that asks for user input.** The gate runs unattended.
- **Anything that takes >2 minutes.** It blocks the pipeline; the user is sitting there. Move it to CI.
- **Anything stateful** (writes to a DB, calls a paid API, sends emails). The gate runs every time the developer hands off — including bouncebacks.
- **Anything LLM-based.** That's an agent, not a gate. Gates are deterministic.

## Skipping the gate

Per project, the **Agents** tab in the board treats the gate like any other agent — toggle it off and tasks pass through directly to the Reviewer. Useful when you're in the middle of a refactor and `tsc` is intentionally red.

## Adding a *new* gate (not just a check)

Multiple gates are supported. Add another `mode: 'gate'` entry to `pipeline.ts`. Common shapes:

- **A pre-Developer "spec gate"** that lints the Designer's markdown for required sections (must include "screens", "states", "palette") before the Developer starts.
- **A post-QA "release gate"** that runs a smoke E2E suite once before the QA can mark a task `done`.

Each gate is just a regular `PipelineEntry` with `mode: 'gate'`, a `checks` array, and `handoff` / `onFail` routing. The orchestrator treats it like any other entry — runs in array order, posts comments, routes tasks.

## What's next

- [New agents](/extending/agents) — when a check needs judgment, you want an agent
- [Knowledge packs](/extending/knowledge-packs) — to give the agents context the gate can't enforce
