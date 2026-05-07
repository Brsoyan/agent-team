import { AgentRole, TaskStatus } from '../models/types.js';
import { MANAGER_CONFIG } from './manager.js';
import { PM_CONFIG } from './pm.js';
import { CRITIC_CONFIG } from './critic.js';
import { DESIGNER_CONFIG } from './designer.js';
import { DEVELOPER_CONFIG } from './developer.js';
import { REVIEWER_CONFIG } from './reviewer.js';
import { QA_CONFIG } from './qa.js';

/**
 * Single source of truth for the agent pipeline.
 *
 * To add a new agent:
 *   1. Create src/agents/<name>.ts with a config object.
 *   2. (Optional) Add a new role string to AgentRole and/or new status to TaskStatus in models/types.ts.
 *   3. Add one entry to the PIPELINE array below, in the position you want it to run.
 *   4. Update the `handoff` of the agent that should precede it so tasks flow into it.
 *
 * Everything else — orchestrator execution order, skip-forward, which statuses an
 * agent picks up, the "pipeline guide" text in prompts, the UI's pipeline view —
 * is derived from this array at runtime.
 */

export interface GateCheck {
  /** Human-readable name shown in comments / logs. */
  name: string;
  /** Shell command to run. Non-zero exit = fail. */
  command: string;
  /** Where to run the command: the generated Expo app, or the project workspace root. */
  cwd: 'app' | 'workspace';
  /** Required checks block the pipeline on failure; non-required ones post a warning and pass. */
  required: boolean;
  /** Per-check timeout in ms. Default 5 minutes. */
  timeoutMs?: number;
}

export interface PipelineEntry {
  role: AgentRole;
  name: string;
  title: string;
  systemPrompt: string;

  /** Task statuses this agent picks up when assigned to it. */
  pickUp: TaskStatus[];

  /**
   * Happy-path handoff when this agent finishes. Used by the orchestrator's
   * "skip this agent" mode and by the prompt guide so agents know where to
   * forward completed tasks. A supervisor (e.g. manager) omits this.
   * For gates, this is the on-pass destination.
   */
  handoff?: { status: TaskStatus; assignee: AgentRole };

  /** Gate-only: where to send a task if any required check fails. */
  onFail?: { status: TaskStatus; assignee: AgentRole };

  /** Gate-only: the list of shell checks to run. */
  checks?: GateCheck[];

  /**
   * 'pipeline' agents run in array order on every task that matches their pickUp.
   * 'supervisor' agents run BEFORE the pipeline each day and see all tasks
   *   (used by the manager to unblock stuck work).
   * 'gate' entries are NOT LLMs — they run the configured `checks` via shell
   *   and route tasks to `handoff` (on pass) or `onFail` (on failure).
   *   `systemPrompt` should be the empty string for gates.
   */
  mode: 'pipeline' | 'supervisor' | 'gate';
}

export const PIPELINE: PipelineEntry[] = [
  {
    ...MANAGER_CONFIG,
    systemPrompt: MANAGER_CONFIG.systemPrompt,
    pickUp: [],
    mode: 'supervisor',
  },
  {
    ...PM_CONFIG,
    systemPrompt: PM_CONFIG.systemPrompt,
    pickUp: ['backlog', 'spec_review', 'spec_approved'],
    handoff: { status: 'spec_review', assignee: 'critic' },
    mode: 'pipeline',
  },
  {
    ...CRITIC_CONFIG,
    systemPrompt: CRITIC_CONFIG.systemPrompt,
    pickUp: ['spec_review'],
    handoff: { status: 'spec_approved', assignee: 'designer' },
    mode: 'pipeline',
  },
  {
    ...DESIGNER_CONFIG,
    systemPrompt: DESIGNER_CONFIG.systemPrompt,
    pickUp: ['spec_approved', 'designing', 'design_done'],
    handoff: { status: 'design_done', assignee: 'developer' },
    mode: 'pipeline',
  },
  {
    ...DEVELOPER_CONFIG,
    systemPrompt: DEVELOPER_CONFIG.systemPrompt,
    pickUp: ['todo', 'in_progress', 'design_done', 'code_review'],
    handoff: { status: 'code_review', assignee: 'gatekeeper' },
    mode: 'pipeline',
  },
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
      {
        name: 'TypeScript',
        command: 'npm install --silent && npx tsc --noEmit',
        cwd: 'app',
        required: true,
        timeoutMs: 180000,
      },
      {
        name: 'Unit tests',
        command: 'npx jest --passWithNoTests --watchAll=false --ci',
        cwd: 'app',
        required: false, // warn-only until the project actually has tests
        timeoutMs: 240000,
      },
    ],
  },
  {
    ...REVIEWER_CONFIG,
    systemPrompt: REVIEWER_CONFIG.systemPrompt,
    pickUp: ['code_review'],
    handoff: { status: 'review_approved', assignee: 'qa' },
    mode: 'pipeline',
  },
  {
    ...QA_CONFIG,
    systemPrompt: QA_CONFIG.systemPrompt,
    pickUp: ['review_approved', 'testing'],
    handoff: { status: 'done', assignee: 'qa' },
    mode: 'pipeline',
  },
];

// ── Derived helpers (pure functions over PIPELINE) ──────────────────────────

export function getEntry(role: AgentRole): PipelineEntry | undefined {
  return PIPELINE.find(e => e.role === role);
}

/** Execution order: supervisors first, then pipeline & gate entries in array order. */
export function executionOrder(): AgentRole[] {
  return [
    ...PIPELINE.filter(e => e.mode === 'supervisor').map(e => e.role),
    ...PIPELINE.filter(e => e.mode !== 'supervisor').map(e => e.role),
  ];
}

/** Map of agent → statuses they pick up. Used by the board to filter. */
export function pickUpMap(): Record<AgentRole, TaskStatus[]> {
  const map = {} as Record<AgentRole, TaskStatus[]>;
  for (const e of PIPELINE) map[e.role] = e.pickUp;
  return map;
}

/** Map of agent → happy-path handoff. Used by orchestrator's auto-skip. */
export function handoffMap(): Partial<Record<AgentRole, { status: TaskStatus; assignee: AgentRole }>> {
  const map: Partial<Record<AgentRole, { status: TaskStatus; assignee: AgentRole }>> = {};
  for (const e of PIPELINE) if (e.handoff) map[e.role] = e.handoff;
  return map;
}

/** Human-readable pipeline flow string, e.g. "pm → critic → designer → …" */
export function pipelineFlow(): string {
  return PIPELINE.filter(e => e.mode !== 'supervisor').map(e => e.role).join(' → ');
}

/** Per-role guide text injected into every agent's prompt. */
export function buildHandoffGuide(role: AgentRole): string {
  const entry = getEntry(role);
  if (!entry) return '';
  if (entry.mode === 'gate') return ''; // gates don't run LLMs; no prompt is generated
  if (entry.mode === 'supervisor') {
    return `PIPELINE: ${pipelineFlow()}\nYou run BEFORE the pipeline each day — review all tasks, unblock anything stuck.`;
  }
  if (!entry.handoff) {
    return `PIPELINE: ${pipelineFlow()}\nThis agent has no fixed handoff.`;
  }
  const lines = [
    `PIPELINE: ${pipelineFlow()}`,
    `Your handoff when done: set status=${entry.handoff.status}, assign to ${entry.handoff.assignee}.`,
  ];
  // Show every handoff so agents understand the full flow (useful when prompts
  // reference "the next agent" or when a reviewer bounces work back).
  const lookup = PIPELINE
    .filter(e => e.mode === 'pipeline' && e.handoff)
    .map(e => `  - ${e.role}: → ${e.handoff!.assignee} (status=${e.handoff!.status})`);
  lines.push('All handoffs:', ...lookup);
  return lines.join('\n');
}
