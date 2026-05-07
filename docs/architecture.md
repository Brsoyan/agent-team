# Architecture

A file-by-file map. Read this once before contributing — it'll save you an hour of grepping.

## Repo layout

```
agent-team/
├── src/                       Backend: Express API + agent orchestrator
│   ├── dashboard.ts           HTTP API (127.0.0.1:3333)
│   ├── orchestrator.ts        Runs agents in pipeline order
│   ├── agent.ts               Spawns one Claude Code CLI session per agent turn
│   ├── board-cli.ts           CLI agents call via Bash to mutate the board JSON
│   ├── gates.ts               Runs the Quality Gate's shell checks
│   ├── events.ts              Server-sent events for live board updates
│   ├── usage.ts               Tracks token / time usage per agent run
│   ├── index.ts               Entry point: `tsx src/index.ts dashboard` or `tsx src/index.ts <subcommand>`
│   ├── agents/
│   │   ├── pipeline.ts        Single source of truth for the pipeline (the array)
│   │   ├── factory.ts         Materializes a PipelineEntry into a runnable agent process
│   │   ├── manager.ts         Per-role config: name, title, system prompt
│   │   ├── pm.ts
│   │   ├── critic.ts
│   │   ├── designer.ts
│   │   ├── developer.ts
│   │   ├── reviewer.ts
│   │   ├── qa.ts
│   │   └── index.ts
│   ├── models/
│   │   ├── types.ts           AgentRole, TaskStatus unions
│   │   ├── board.ts           Task / Comment shapes; board JSON I/O
│   │   ├── project.ts         Project metadata; projects.json I/O
│   │   └── workspace.ts       workspace/<project-id>/ helpers
│   └── knowledge/
│       ├── global.ts          Loads data/global-knowledge/*.md into agent context
│       ├── project.ts         Loads per-project skills + instructions
│       ├── sdk-context.ts     Injects subscription-sdk usage examples
│       └── index.ts
├── board/                     Frontend: React + Vite, port 7788
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts             Fetch wrappers for the API server
│   │   ├── pages/             ProjectList, NewProject, ProjectBoard, AgentPrompts
│   │   └── components/        PipelineView, AppTab, AgentsPanel, SettingsPanel
│   └── package.json           Separate package — has its own node_modules
├── sdk/                       @agent-team/subscription-sdk
│   └── src/                   Linked into every generated app
├── data/
│   ├── projects.json          Index of all projects
│   ├── global-knowledge/      ← contributable knowledge packs (markdown)
│   │   ├── design-system.md
│   │   ├── sdk.md
│   │   └── tech-stack.md
│   └── projects/              ← per-project state (gitignored)
│       └── <project-id>/
│           ├── board.json     Tasks + comments
│           └── logs/          Per-agent run logs
├── workspace/                 ← agent output (gitignored)
│   └── <project-id>/
│       ├── specs/  designs/  code/  tests/  reviews/  bugs/
├── docs/                      VitePress site (this docs site)
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── CONTRIBUTING.md
└── CODE_OF_CONDUCT.md
```

## Data flow

```
HTTP request                        Filesystem                 Subprocess
────────────                        ──────────                 ──────────

POST /projects/:id/run-day  ───→   data/projects/<id>/      ───→  spawn:
   (board click)                    board.json (state)              npx @anthropic-ai/claude-code
                                       │                            --dangerously-skip-permissions
                                       │                            --add-dir workspace/<id>/
                                       ↓                            (one process per agent turn)
                                    workspace/<id>/                       │
                                       └─ specs/, designs/,               │
                                          code/, tests/,                  │
                                          reviews/, bugs/                 │
                                           ↑                              │
                                           └──── written by agents ───────┘

GET  /events (SSE) ─────────────→  data/projects/<id>/        ───→  pushed to board
                                    logs/<role>.log                   in real time
```

## The orchestrator

[`src/orchestrator.ts`](https://github.com/brsoyan/agent-team/blob/main/src/orchestrator.ts) is the loop. On a "Run Day":

1. Loads `pipeline.ts`.
2. Runs every supervisor (just the manager today) in order. Each sees the full board.
3. Runs every pipeline / gate entry in array order. For each, finds tasks where `status ∈ entry.pickUp` and `assignee === entry.role`. Spawns the agent (or runs the gate checks) once per matching task.
4. After each turn, re-reads the board JSON — agents mutate it via `board-cli`, and the orchestrator picks up the changes for the next turn.

There is no fancy scheduler. The pipeline runs top-to-bottom; if work bounces back up (e.g. Reviewer → Developer), it'll be picked up on the next "Run Day" click. This keeps the loop debuggable: at any point you can read `board.json` and know exactly where things stand.

## How agents are spawned

[`src/agent.ts`](https://github.com/brsoyan/agent-team/blob/main/src/agent.ts) builds the command line. Roughly:

```bash
npx @anthropic-ai/claude-code \
  --dangerously-skip-permissions \
  --add-dir workspace/<project-id> \
  --append-system-prompt "$(cat per-role-prompt + global knowledge + handoff guide)"
```

Per-role prompt + global knowledge + handoff guide are concatenated each turn:

- **Per-role prompt** — from `src/agents/<role>.ts`.
- **Global knowledge** — every markdown file under `data/global-knowledge/`.
- **Handoff guide** — generated from `pipeline.ts` so every agent knows what status/assignee to set when it's done.

The agent process gets a fresh stdin task: "task `<id>` is assigned to you, here's the board state, do your job." It runs to completion, exits, and the orchestrator moves on.

## The Quality Gate

[`src/gates.ts`](https://github.com/brsoyan/agent-team/blob/main/src/gates.ts) is *not* an LLM. For each `mode: 'gate'` entry in `pipeline.ts`:

1. Iterates the `checks: GateCheck[]` array.
2. Runs each `command` in the configured `cwd` (`'app'` = inside the generated Expo app; `'workspace'` = the project workspace root).
3. Captures stdout/stderr (tail) and exit code.
4. If any **required** check fails, posts the failure as a comment on the task and routes to `onFail`.
5. If all required checks pass, routes to `handoff`. Non-required failures post a warning comment but don't block.

This is what stops the Reviewer from spending an LLM turn on code that doesn't even compile.

## Why one TypeScript array decides everything

The pipeline definition is data, not code. The orchestrator reads it. The board UI fetches it through the API and renders the pipeline view from it. The handoff guide injected into every agent's prompt is generated from it.

Result: **add an entry to the array → orchestrator picks it up, prompts mention it, board shows it, no other code to edit.** This is intentional and worth preserving when contributing — if your change requires touching the orchestrator, the API, *and* the board, ask whether it could be expressed as one more `PipelineEntry` field instead.

## What's next

- [Extending → New agents](/extending/agents) — concrete walk-through, copy-paste an existing agent
- [Extending → Quality-gate checks](/extending/gates) — add lint, security, a11y checks
- [Contributing](/contributing) — how to land a PR
