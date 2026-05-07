# How it works

A 5-minute mental model. Once this clicks, the rest of the docs are just specifics.

## The team

Six LLM agents + one supervisor + one non-LLM gate:

| Order | Role | Name | Job |
|---|---|---|---|
| supervisor | Manager | Elena Ruiz | Runs *before* the pipeline each day. Sees every task. Unblocks anything stuck. |
| 1 | PM | Sarah Chen | Writes a spec from the user's PRD. Maintains the backlog. |
| 2 | Critic | Marcus Webb | Reviews the spec. Surfaces gaps, edge cases, missing requirements. |
| 3 | Designer | Ava Moretti | Picks the palette, defines screens, flows, and states. Outputs design docs. |
| 4 | Developer | James Park | Scaffolds the Expo app (`npx create-expo-app`), writes screens + unit tests. |
| — | Quality Gate | *(automation)* | Runs `tsc --noEmit` and `jest` against the generated app. Bounces failures back. |
| 5 | Reviewer | Diana Okafor | Reads the diff against the spec + design. Approves or sends back. |
| 6 | QA | Raj Patel | Writes E2E tests, runs them, files bugs, signs off. |

## The communication channel

Agents do not call each other directly. They communicate through a **shared task board** stored as a JSON file (`data/projects/<project-id>/board.json`).

Each task has:
- A **status** (`backlog`, `spec_review`, `design_done`, `code_review`, `review_approved`, `done`, etc.)
- An **assignee** (one of the agent role identifiers)
- A list of **comments** added by agents and humans
- A pointer to the **artifact** the task produced (a spec file, a design doc, a code path, a bug report)

When an agent finishes, it changes the task's status and assignee. The next agent picks it up on the next pipeline run.

## The pipeline as one array

The whole thing is declared in one file: [`src/agents/pipeline.ts`](https://github.com/brsoyan/agent-team/blob/main/src/agents/pipeline.ts).

```ts
export const PIPELINE: PipelineEntry[] = [
  { ...MANAGER_CONFIG,    pickUp: [],                                   mode: 'supervisor' },
  { ...PM_CONFIG,         pickUp: ['backlog', 'spec_review', ...],     handoff: { status: 'spec_review',     assignee: 'critic'    }, mode: 'pipeline' },
  { ...CRITIC_CONFIG,     pickUp: ['spec_review'],                      handoff: { status: 'spec_approved',   assignee: 'designer'  }, mode: 'pipeline' },
  { ...DESIGNER_CONFIG,   pickUp: ['spec_approved', 'designing', ...],  handoff: { status: 'design_done',     assignee: 'developer' }, mode: 'pipeline' },
  { ...DEVELOPER_CONFIG,  pickUp: ['todo', 'in_progress', ...],         handoff: { status: 'code_review',     assignee: 'gatekeeper'}, mode: 'pipeline' },
  { role: 'gatekeeper', /* ... */ checks: [/* tsc, jest */],            mode: 'gate' },
  { ...REVIEWER_CONFIG,   pickUp: ['code_review'],                      handoff: { status: 'review_approved', assignee: 'qa'        }, mode: 'pipeline' },
  { ...QA_CONFIG,         pickUp: ['review_approved', 'testing'],       handoff: { status: 'done',            assignee: 'qa'        }, mode: 'pipeline' },
];
```

The orchestrator's execution order, the board's "which statuses does this agent pick up" filter, the pipeline diagram shown to every agent in its prompt, and the board UI's pipeline view are **all derived from this array**. Insert an entry → everything updates.

## A pipeline run, end-to-end

Click **Run Day** in the board. Here's what happens:

```
1. Manager (supervisor) runs first. Reads every task. If anything is
   blocked or assigned to someone who shouldn't have it, fixes it.

2. PM picks up tasks in `backlog`. Writes a spec to specs/<task>.md.
   Sets task status=spec_review, assignee=critic.

3. Critic picks up `spec_review` tasks. Reads the spec. Either approves
   (status=spec_approved, assignee=designer) or comments and bounces
   back to PM.

4. Designer picks up `spec_approved` tasks. Writes designs/<task>.md
   with palette, screens, states. Status=design_done, assignee=developer.

5. Developer picks up `design_done` tasks. If no Expo app exists,
   scaffolds one in code/. Writes screens, components, unit tests.
   Status=code_review, assignee=gatekeeper.

6. Quality Gate runs `tsc --noEmit` (required) and `jest` (warn-only).
   Pass → status=code_review, assignee=reviewer.
   Fail → status=code_review, assignee=developer + comment with the
   tail of stderr. Developer tries again next run.

7. Reviewer picks up `code_review` tasks. Reads the diff against the
   spec and design. Approves (status=review_approved, assignee=qa) or
   bounces (status=code_review, assignee=developer).

8. QA picks up `review_approved` tasks. Writes E2E tests under tests/.
   Files bugs as new tasks. Status=done when satisfied.
```

You can also click an individual agent in the board to run just that one — useful when you want the Designer to take another pass at a task without re-running the whole pipeline.

## Where files live

Agents write to a sandboxed directory:

```
workspace/<project-id>/
├── specs/      ← PM + Critic
├── designs/    ← Designer
├── code/       ← Developer (the Expo app)
├── tests/      ← Developer + QA
├── reviews/    ← Reviewer
└── bugs/       ← QA
```

Agents are scoped to this directory via `--add-dir`. They can `npm install` arbitrary packages, run `xcodebuild`, etc. — but only inside `workspace/<project-id>/`. See the [security FAQ](/faq#security) for what this means.

## Why agents talk through files, not message-passing

Two reasons:

1. **Inspection.** Every agent's output is a file you can `cat`, every comment is a JSON entry you can grep. There's no opaque in-memory state.
2. **Resumability.** Kill the orchestrator, restart it, the board picks up exactly where it was. The next agent run reads the same JSON.

This is the same idea as a Kanban board with humans, just with the cards being shell-accessible files. The agent prompts know how to call `tsx src/board-cli.ts` to mutate the board, so they don't need a special protocol.

## What's next

- **Architecture** — the file-by-file map: [Architecture](/architecture)
- **Extend the team** — start with [adding an agent](/extending/agents)
- **Common questions** — [FAQ](/faq)
