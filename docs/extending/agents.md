# Adding a new agent

Adding an agent is **three files** edited and **zero hand-wiring**. The orchestrator's run order, the board's pipeline view, and the prompt-injected handoff guide all derive from `src/agents/pipeline.ts`.

## Worked example: a Security Auditor

We'll insert a security auditor between the Reviewer and the QA — its job is to catch hardcoded secrets, unsafe network calls, and obviously-bad patterns before QA spends time on it.

### 1. Create the agent's config

`src/agents/security-auditor.ts`:

```ts
import { AgentRole } from '../models/types.js';

export const SECURITY_AUDITOR_CONFIG = {
  role: 'security-auditor' as AgentRole,
  name: 'Alex Stein',
  title: 'Security Auditor',
  systemPrompt: `You are Alex Stein, a security auditor.

Your job: read the diff in workspace/<project-id>/code/ and flag concrete
security risks for an iOS app. You do NOT fix code — you write a short
audit report under workspace/<project-id>/reviews/<task-id>-security.md
with severity (low / medium / high), a one-sentence description, and
the file:line reference.

What to look for:
  - Hardcoded API keys, tokens, secrets in source.
  - Network calls to non-HTTPS endpoints.
  - Storing PII in AsyncStorage / @react-native-async-storage without encryption.
  - Logging that includes user emails, tokens, or full request payloads.
  - Missing input validation on user-typed strings used in URLs or queries.

What NOT to flag:
  - Style nits, minor refactors, perf hypotheticals.
  - Anything you can't point at a specific file:line for.

When you finish:
  - If there are NO high/medium issues, set status=review_approved, assignee=qa.
  - If there are high/medium issues, set status=code_review, assignee=developer
    and post your audit file path as a comment on the task.

Be terse. The Reviewer already approved this code; you are the second pair of eyes
for a specific dimension. One paragraph + the issue list, nothing more.`,
};
```

::: tip Personality + role identity helps
Every existing agent has a first + last name (Sarah Chen, Marcus Webb…). It's not decoration — when the user says "ask the security auditor to recheck this", the board can show "Alex Stein is reviewing…" and prompts feel like coordinated work. Keep the convention.
:::

### 2. Register the role and (if you need it) a status

`src/models/types.ts`:

```ts
export type AgentRole =
  | 'manager'
  | 'pm'
  | 'critic'
  | 'designer'
  | 'developer'
  | 'gatekeeper'
  | 'reviewer'
  | 'security-auditor'  // ← new
  | 'qa';
```

For the security auditor we don't need a new `TaskStatus` — it reads `code_review` (after the Reviewer sets `review_approved` we read that) and writes one of the existing statuses on handoff. **Add a status only if your agent represents a phase that doesn't fit any existing one.** Reusing existing statuses keeps the board legible.

### 3. Slot it into the pipeline

`src/agents/pipeline.ts`:

```ts
import { SECURITY_AUDITOR_CONFIG } from './security-auditor.js';

export const PIPELINE: PipelineEntry[] = [
  // ...manager, pm, critic, designer, developer, gatekeeper unchanged...

  // Reviewer's handoff was → qa. Now → security-auditor.
  { ...REVIEWER_CONFIG,
    pickUp: ['code_review'],
    handoff: { status: 'review_approved', assignee: 'security-auditor' },  // ← changed
    mode: 'pipeline' },

  // New entry, sits between reviewer and qa
  { ...SECURITY_AUDITOR_CONFIG,
    pickUp: ['review_approved'],
    handoff: { status: 'review_approved', assignee: 'qa' },
    mode: 'pipeline' },

  // QA stays the same
  { ...QA_CONFIG,
    pickUp: ['review_approved', 'testing'],
    handoff: { status: 'done', assignee: 'qa' },
    mode: 'pipeline' },
];
```

That's the whole change. **Do not** edit the orchestrator, the board UI, or the API — they read this array.

### 4. Verify

1. `npx tsc --noEmit` should be clean.
2. `npm run dev`, open the board, your project's **Pipeline** view should now show 7 boxes instead of 6 (manager, pm, critic, designer, developer, reviewer, **security-auditor**, qa — manager is the supervisor and rendered separately).
3. Click **Run Day** on a project that has tasks ready for review. Watch the security auditor pick up a `review_approved` task.

## Conventions to follow

| Field | Rule |
|---|---|
| `role` | lowercase-kebab-case. Used as `assignee` on tasks and to look up logs. |
| `name` | Human first + last. Pick a name that doesn't collide with existing agents. |
| `title` | One short noun phrase: "Security Auditor", "i18n Localizer". |
| `systemPrompt` | First paragraph: who they are + what they do. Then bullet lists for *what to look for* and *what NOT to do*. End with the handoff rule. **Be terse.** |
| `pickUp` | Statuses this agent picks up *when assigned to it*. Reuse existing statuses unless you need a new phase. |
| `handoff` | Where finished work goes on the happy path. The orchestrator's "skip this agent" mode uses this too. |
| `mode` | `'pipeline'` for normal agents. Use `'supervisor'` only if your agent needs to see *all* tasks before the daily run (the manager is the only one today). |

## When *not* to add an agent

- **You want existing agents to do something extra.** Edit their system prompt instead — it's cheaper.
- **You want a single shell command to run.** Use a [Quality Gate check](/extending/gates) — it's faster and doesn't burn LLM tokens.
- **You want it to monitor / report only.** Read the data via the HTTP API from a separate process. Agents are for work that requires judgment.

## Tested patterns

These are the agent shapes that have shipped well:

- **A pre-PM "research" agent** that takes a vague PRD, looks up similar apps, and rewrites the PRD with concrete references before the PM starts.
- **A post-Designer "art-direction" agent** that takes the Designer's palette and generates real asset files (icons, splash screens) using a tool subagent.
- **An "i18n localizer"** that runs after the Developer and produces translation strings for a list of locales.
- **A "release-notes" agent** that runs after QA signs off and writes a CHANGELOG entry from the task history.

## What's next

- [Quality-gate checks](/extending/gates) — non-LLM checks that run before the Reviewer
- [Knowledge packs](/extending/knowledge-packs) — markdown that every agent can see
- [Architecture](/architecture) — the rest of the moving parts
