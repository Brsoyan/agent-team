import chalk from 'chalk';
import { TaskBoard } from './models/board.js';
import { Workspace } from './models/workspace.js';
import { Agent, AgentResult } from './agent.js';
import { executionOrder, handoffMap, getEntry, PipelineEntry } from './agents/index.js';
import { AgentRole, DayLog, Task } from './models/types.js';
import { runGate, formatGateComment } from './gates.js';
import { recordUsage } from './usage.js';
import { projectBoardPath, projectLogsDir, projectWorkspaceDir } from './models/project.js';
import { buildAgentContext, addProjectKnowledge } from './knowledge/index.js';
import { getProjectAgents, addAgentSkill } from './agents/factory.js';
import * as events from './events.js';
import fs from 'fs';
import path from 'path';

// ── Manual skip system ──
const PROJECTS_DIR = path.resolve('data/projects');

export function getSkippedAgents(projectId: string): AgentRole[] {
  const p = path.join(PROJECTS_DIR, projectId, 'skips.json');
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

export function setSkippedAgents(projectId: string, roles: AgentRole[]): void {
  const p = path.join(PROJECTS_DIR, projectId, 'skips.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(roles));
}

// Abort controller — allows stopping agents mid-run
let abortController: AbortController | null = null;

export function stopAgents() {
  if (abortController) {
    abortController.abort();
    events.pipelineIdle();
  }
}

export function isAborted(): boolean {
  return abortController?.signal.aborted ?? false;
}

export class Orchestrator {
  private board: TaskBoard;
  private workspace: Workspace;
  private projectId: string;
  private logsDir: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.board = new TaskBoard(projectBoardPath(projectId));
    this.workspace = new Workspace(projectWorkspaceDir(projectId));
    this.logsDir = projectLogsDir(projectId);
  }

  getBoard(): TaskBoard { return this.board; }
  getWorkspace(): Workspace { return this.workspace; }
  getProjectId(): string { return this.projectId; }

  async runDay(): Promise<DayLog> {
    abortController = new AbortController();
    const day = this.board.incrementDay();

    events.resetPipeline(day, this.projectId);
    console.log(chalk.bgBlue.white.bold(`\n  DAY ${day}  `));

    const results: AgentResult[] = [];

    for (const role of executionOrder()) {
      // Check abort
      if (abortController.signal.aborted) {
        console.log(chalk.yellow('  Stopped by user'));
        break;
      }

      // Use project-specific agents (with their accumulated skills)
      const projectAgents = getProjectAgents(this.projectId);
      const agentConfig = projectAgents.find(a => a.role === role);
      if (!agentConfig) continue;

      // Reload board to see changes from previous agent
      this.board = new TaskBoard(projectBoardPath(this.projectId));

      const pendingTasks = this.board.getPendingTasks(role);
      const hasBugs = role === 'developer'
        ? this.board.listTasks({ assignee: 'developer', type: 'bug' }).filter(t => t.status === 'todo').length > 0
        : false;

      // Supervisor agents (e.g. manager) always run if board has any live tasks;
      // pipeline agents only run when they have something assigned.
      const skipped = getSkippedAgents(this.projectId);
      const allTasks = this.board.listTasks();
      const entry = getEntry(role);
      if (entry?.mode === 'supervisor') {
        if (allTasks.length === 0 || allTasks.every(t => t.status === 'done')) {
          events.agentSkip(role, agentConfig.name);
          continue;
        }
      } else if (pendingTasks.length === 0 && !hasBugs) {
        events.agentSkip(role, agentConfig.name);
        continue;
      }

      // Manually skipped — auto-forward tasks via the declared handoff.
      if (skipped.includes(role)) {
        if (pendingTasks.length > 0) {
          const next = handoffMap()[role];
          if (next) {
            for (const t of pendingTasks) {
              this.board.updateTask(t.id, { status: next.status, assignee: next.assignee });
            }
            events.agentWorking(role, agentConfig.name, `Skipped — ${pendingTasks.length} task(s) forwarded to ${next.assignee}`);
          }
        }
        events.agentSkip(role, agentConfig.name);
        continue;
      }

      events.agentStart(role, agentConfig.name, pendingTasks.length);

      // ── Gate path: run shell checks, no Claude spawn ──
      if (entry?.mode === 'gate') {
        const gateResult = await this.runGateTurn(role, entry, agentConfig.name, pendingTasks);
        results.push(gateResult);
        continue;
      }

      const knowledge = buildAgentContext(this.projectId, role);
      const agent = new Agent({
        role: agentConfig.role,
        name: agentConfig.name,
        title: agentConfig.title,
        systemPrompt: agentConfig.system_prompt,
        board: this.board,
        workspace: this.workspace,
        projectId: this.projectId,
        knowledge,
      });

      try {
        const result = await agent.runDay();
        results.push(result);
        events.agentDone(role, agentConfig.name, result.summary);

        if (result.usage) {
          recordUsage(this.projectId, { day, role, name: agentConfig.name, usage: result.usage });
        }

        if (result.summary && result.summary.length > 50) {
          addProjectKnowledge(this.projectId, role, 'day-' + day, result.summary.substring(0, 300));
          addAgentSkill(this.projectId, role, result.summary.substring(0, 200));
        }
      } catch (error) {
        const msg = `${error}`;
        events.agentError(role, agentConfig.name, msg);
        results.push({ role, actions: [], summary: `Error: ${msg}`, fullOutput: msg });
      }
    }

    const dayLog: DayLog = {
      day,
      actions: results.flatMap(r => r.actions),
      summary: results.map(r => `${r.role}: ${r.summary}`).join('\n'),
    };

    fs.mkdirSync(this.logsDir, { recursive: true });
    fs.writeFileSync(path.join(this.logsDir, `day-${day}.json`), JSON.stringify(dayLog, null, 2));

    events.dayDone(day);
    abortController = null;

    console.log(chalk.bgGreen.white.bold(`\n  END OF DAY ${day}  `));
    return dayLog;
  }

  async runSingleAgent(role: AgentRole): Promise<AgentResult> {
    abortController = new AbortController();
    const projectAgents = getProjectAgents(this.projectId);
    const agentConfig = projectAgents.find(a => a.role === role);
    if (!agentConfig) throw new Error(`Unknown agent: ${role}`);

    this.board = new TaskBoard(projectBoardPath(this.projectId));
    const pendingTasks = this.board.getPendingTasks(role);

    events.resetPipeline(this.board.getDay(), this.projectId);
    for (const a of events.getState(this.projectId).agents) {
      if (a.role !== role) a.status = 'skipped';
    }
    events.agentStart(role, agentConfig.name, pendingTasks.length);

    const entry = getEntry(role);
    if (entry?.mode === 'gate') {
      const result = await this.runGateTurn(role, entry, agentConfig.name, pendingTasks);
      events.pipelineIdle();
      abortController = null;
      return result;
    }

    const knowledge = buildAgentContext(this.projectId, role);
    const agent = new Agent({
      role: agentConfig.role, name: agentConfig.name, title: agentConfig.title,
      systemPrompt: agentConfig.system_prompt, board: this.board,
      workspace: this.workspace, projectId: this.projectId, knowledge,
    });

    try {
      const result = await agent.runDay();
      events.agentDone(role, agentConfig.name, result.summary);

      if (result.usage) {
        recordUsage(this.projectId, { day: this.board.getDay(), role, name: agentConfig.name, usage: result.usage });
      }

      fs.mkdirSync(this.logsDir, { recursive: true });
      fs.writeFileSync(
        path.join(this.logsDir, `agent-${role}-${Date.now()}.json`),
        JSON.stringify({ day: this.board.getDay(), actions: result.actions, summary: `${role}: ${result.summary}` }, null, 2)
      );

      if (result.summary.length > 50) {
        addProjectKnowledge(this.projectId, role, 'work', result.summary.substring(0, 300));
        addAgentSkill(this.projectId, role, result.summary.substring(0, 200));
      }

      events.pipelineIdle();
      abortController = null;
      return result;
    } catch (error) {
      events.agentError(role, agentConfig.name, `${error}`);
      events.pipelineIdle();
      abortController = null;
      throw error;
    }
  }

  async runTask(taskId: string): Promise<AgentResult> {
    abortController = new AbortController();
    this.board = new TaskBoard(projectBoardPath(this.projectId));
    const task = this.board.getTask(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const role = task.assignee;
    const projectAgents = getProjectAgents(this.projectId);
    const agentConfig = projectAgents.find(a => a.role === role);
    if (!agentConfig) throw new Error(`Unknown agent: ${role}`);

    events.resetPipeline(this.board.getDay(), this.projectId);
    for (const a of events.getState(this.projectId).agents) {
      if (a.role !== role) a.status = 'skipped';
    }
    events.agentStart(role, agentConfig.name, 1);

    const entry = getEntry(role);
    if (entry?.mode === 'gate') {
      const result = await this.runGateTurn(role, entry, agentConfig.name, [task]);
      events.pipelineIdle();
      abortController = null;
      return result;
    }

    const knowledge = buildAgentContext(this.projectId, role);
    const agent = new Agent({
      role: agentConfig.role, name: agentConfig.name, title: agentConfig.title,
      systemPrompt: agentConfig.system_prompt, board: this.board,
      workspace: this.workspace, projectId: this.projectId, knowledge,
      focusTaskId: taskId,
    });

    try {
      const result = await agent.runDay();
      events.agentDone(role, agentConfig.name, result.summary);

      if (result.usage) {
        recordUsage(this.projectId, { day: this.board.getDay(), role, name: agentConfig.name, taskId, usage: result.usage });
      }

      fs.mkdirSync(this.logsDir, { recursive: true });
      fs.writeFileSync(
        path.join(this.logsDir, `task-${taskId}-${Date.now()}.json`),
        JSON.stringify({ day: this.board.getDay(), task: taskId, actions: result.actions, summary: `${role}: ${result.summary}` }, null, 2)
      );

      if (result.summary.length > 50) {
        addProjectKnowledge(this.projectId, role, 'work', result.summary.substring(0, 300));
        addAgentSkill(this.projectId, role, result.summary.substring(0, 200));
      }

      events.pipelineIdle();
      abortController = null;
      return result;
    } catch (error) {
      events.agentError(role, agentConfig.name, `${error}`);
      events.pipelineIdle();
      abortController = null;
      throw error;
    }
  }

  // ── Gate turn: run shell checks, route task via handoff/onFail ──
  private async runGateTurn(
    role: AgentRole,
    entry: PipelineEntry,
    name: string,
    tasks: Task[],
  ): Promise<AgentResult> {
    const checks = entry.checks ?? [];
    const actions: AgentResult['actions'] = [];
    let passCount = 0;
    let failCount = 0;

    for (const t of tasks) {
      if (abortController?.signal.aborted) break;
      events.agentWorking(role, name, `Checking ${t.id}…`);

      const result = await runGate(this.projectId, checks, (msg) => {
        events.agentWorking(role, name, `${t.id}: ${msg}`);
      });

      this.board.addComment(t.id, role, formatGateComment(result));
      const next = result.pass ? entry.handoff : entry.onFail;
      if (next) {
        this.board.updateTask(t.id, { status: next.status, assignee: next.assignee });
      }

      if (result.pass) passCount++; else failCount++;
      actions.push({
        agent: role,
        action: result.pass ? 'gate_pass' : 'gate_fail',
        details: `${t.id} → ${next?.assignee ?? '(no route)'} (${result.results.length} checks)`,
        timestamp: new Date().toISOString(),
      });
    }

    const summary = `${passCount} passed, ${failCount} failed, ${tasks.length} total`;
    events.agentDone(role, name, summary);

    fs.mkdirSync(this.logsDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.logsDir, `gate-${role}-${Date.now()}.json`),
      JSON.stringify({ role, summary, actions }, null, 2),
    );

    return { role, actions, summary, fullOutput: summary };
  }

  async runDays(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      if (abortController?.signal.aborted) break;
      await this.runDay();
    }
  }

  seedProject(name: string, description: string, features: string[], prd?: string): void {
    this.board.setProject(name, description);

    const prdText = prd?.trim();
    if (prdText) {
      const specsDir = path.join(projectWorkspaceDir(this.projectId), 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'PRD.md'), prdText);

      this.board.createTask({
        title: `Build ${name}`,
        description: `PRD-driven project. Full spec at workspace/specs/PRD.md. Designer starts here — read the linked PRD and produce the design doc.`,
        type: 'feature',
        status: 'spec_approved',
        priority: 'high',
        assignee: 'designer',
        created_by: 'pm',
        linked_files: ['specs/PRD.md'],
      });

      const existing = new Set(getSkippedAgents(this.projectId));
      existing.add('pm');
      existing.add('critic');
      setSkippedAgents(this.projectId, Array.from(existing) as AgentRole[]);

      console.log(chalk.green(`Project "${name}" seeded from PRD (${prdText.length} chars) — PM/Critic skipped`));
      return;
    }

    for (const feature of features) {
      this.board.createTask({
        title: feature,
        description: `Feature request: ${feature}. PM needs to write a detailed spec for this.`,
        type: 'feature', status: 'backlog', priority: 'high', assignee: 'pm', created_by: 'pm',
      });
    }
    console.log(chalk.green(`Project "${name}" seeded with ${features.length} feature(s)`));
  }

  printStatus(): void {
    const state = this.board.getState();
    console.log(chalk.bold(`\nProject: ${state.project_name}`));
    console.log(chalk.dim(`Day: ${state.day} | Tasks: ${state.tasks.length}`));
    const groups = new Map<string, typeof state.tasks>();
    for (const t of state.tasks) { const g = groups.get(t.status) || []; g.push(t); groups.set(t.status, g); }
    for (const [status, tasks] of groups) {
      console.log(chalk.yellow(`  [${status}] (${tasks.length})`));
      for (const t of tasks) console.log(`    ${t.id}: ${t.title} -> ${t.assignee}`);
    }
  }
}
