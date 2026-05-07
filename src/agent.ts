import { spawn } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { AgentRole, TokenUsage } from './models/types.js';
import { TaskBoard } from './models/board.js';
import { Workspace } from './models/workspace.js';
import { buildHandoffGuide } from './agents/pipeline.js';

import * as events from './events.js';

export interface AgentResult {
  role: AgentRole;
  actions: { agent: AgentRole; action: string; details: string; timestamp: string }[];
  summary: string;
  fullOutput: string;
  usage?: TokenUsage | null;
}

const PROJECT_ROOT = path.resolve('.');

export class Agent {
  private role: AgentRole;
  private name: string;
  private title: string;
  private systemPrompt: string;
  private board: TaskBoard;
  private workspace: Workspace;
  private projectId: string;
  private knowledge: string;
  private focusTaskId?: string;

  constructor(params: {
    role: AgentRole; name: string; title: string; systemPrompt: string;
    board: TaskBoard; workspace: Workspace; projectId: string; knowledge: string;
    focusTaskId?: string;
  }) {
    this.role = params.role;
    this.name = params.name;
    this.title = params.title;
    this.systemPrompt = params.systemPrompt;
    this.board = params.board;
    this.workspace = params.workspace;
    this.projectId = params.projectId;
    this.knowledge = params.knowledge;
    this.focusTaskId = params.focusTaskId;
  }

  async runDay(): Promise<AgentResult> {
    let pendingTasks = this.board.getPendingTasks(this.role);
    const allTasks = this.board.listTasks();

    // If focusing on a specific task, only include that task
    if (this.focusTaskId) {
      const focusTask = this.board.getTask(this.focusTaskId);
      pendingTasks = focusTask ? [focusTask] : pendingTasks;
    }

    console.log(chalk.cyan(`\n${'═'.repeat(60)}`));
    console.log(chalk.cyan.bold(`  ${this.title}: ${this.name}`));
    console.log(chalk.cyan(`  ${this.focusTaskId ? `Focus: ${this.focusTaskId}` : `Pending tasks: ${pendingTasks.length}`}`));
    console.log(chalk.cyan(`${'═'.repeat(60)}`));

    const prompt = this.buildDayPrompt(pendingTasks, allTasks);
    const { output, usage } = await this.runClaude(prompt);

    const summary = output.substring(0, 500);
    console.log(chalk.green(`  done ${this.name}${usage ? ` — $${usage.total_cost_usd.toFixed(4)}, ${usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens}→${usage.output_tokens} tokens` : ''}`));

    return {
      role: this.role,
      actions: [{
        agent: this.role,
        action: 'day_complete',
        details: summary,
        timestamp: new Date().toISOString(),
      }],
      summary,
      fullOutput: output,
      usage,
    };
  }

  private buildDayPrompt(
    pendingTasks: ReturnType<TaskBoard['getPendingTasks']>,
    allTasks: ReturnType<TaskBoard['listTasks']>,
  ): string {
    const wsRoot = this.workspace.getRoot();
    const files = this.workspace.listFiles();
    const cli = `npx tsx src/board-cli.ts --project ${this.projectId}`;

    // Load user instructions for this agent
    const userInstructions = this.loadUserInstructions();

    return `You are ${this.name}, the ${this.title}.

PROJECT: ${this.board.getState().project_name}
${this.board.getState().project_description}
Day: ${this.board.getState().day}

${this.knowledge ? '\nYOUR KNOWLEDGE:\n' + this.knowledge : ''}
${userInstructions ? '\nUSER INSTRUCTIONS (from the project manager/human):\n' + userInstructions + '\nFollow these instructions carefully.\n' : ''}
YOUR PENDING TASKS (${pendingTasks.length}):
${pendingTasks.length > 0
  ? pendingTasks.map(t =>
`- ${t.id}: [${t.status}] "${t.title}" (${t.type}, ${t.priority})
  Description: ${t.description}
  Files: ${t.linked_files.join(', ') || 'none'}
  Comments: ${t.comments.map(c => `[${c.author}]: ${c.content}`).join(' | ') || 'none'}`
  ).join('\n')
  : 'No pending tasks.'}

FULL BOARD (${allTasks.length} tasks):
${allTasks.map(t => `${t.id} [${t.status}] "${t.title}" -> ${t.assignee} (${t.type})`).join('\n')}

WORKSPACE FILES:
${files.length > 0 ? files.join('\n') : 'Empty.'}

BOARD CLI (run via Bash):
  ${cli} list
  ${cli} get TASK-1
  ${cli} create --title "..." --desc "..." --type feature --status backlog --priority high --assignee pm --created-by ${this.role}
  ${cli} update TASK-1 --status spec_review --assignee critic
  ${cli} comment TASK-1 --author ${this.role} --content "..."
  ${cli} link TASK-1 --file specs/myfile.md

WORKSPACE: Write files under ${wsRoot}/ using the Write tool.
Working directory: ${PROJECT_ROOT}

INSTRUCTIONS:
Process your pending tasks. For each task:
1. Read task details and linked files
2. ESTIMATE the task size. If it has more than 2-3 files to create or covers multiple concerns:
   - FIRST: Create subtasks using the board CLI: --parent TASK-X --assignee ${this.role} --status in_progress
   - Each subtask should be small (1 file, 1 concern, completable in under 3 minutes)
   - Example: instead of "Build entire screen", create: "Create data model", "Create main component", "Create styles", "Create tests"
   - Work on ONE subtask at a time. Complete it fully, link the file, mark it done.
   - When ALL subtasks are done, update the PARENT task status and assign to next agent
3. For small tasks: just do the work directly, write files, link them
4. Update task status and assign to next person in the pipeline
5. Link every file you create to its task

${buildHandoffGuide(this.role)}
- Reviewer/Critic rejecting work: keep status, assign back to the previous agent.
- QA finding bugs: create new bug-type tasks assigned to developer.
${this.focusTaskId ? `\n**FOCUS: Work ONLY on task ${this.focusTaskId}. Complete this specific task, then stop.**` : ''}
${pendingTasks.length === 0 ? '\nNo pending tasks. Output "No work today." and stop.' : ''}
When done, output a brief summary.`;
  }

  private loadUserInstructions(): string {
    const instrPath = path.join(PROJECT_ROOT, 'data/projects', this.projectId, 'instructions.json');
    if (!fs.existsSync(instrPath)) return '';
    try {
      const all: { role: string; message: string; time: string }[] = JSON.parse(fs.readFileSync(instrPath, 'utf-8'));
      const mine = all.filter(i => i.role === this.role || i.role === 'all');
      if (mine.length === 0) return '';
      return mine.map(i => `- ${i.message}`).join('\n');
    } catch { return ''; }
  }

  private runClaude(prompt: string): Promise<{ output: string; usage: TokenUsage | null }> {
    return new Promise((resolve) => {
      console.log(chalk.dim(`  Spawning Claude Code for ${this.name}...`));
      events.agentWorking(this.role, this.name, 'Starting Claude Code...');

      const wsRoot = this.workspace.getRoot();

      // Write prompt + system prompt to temp files to avoid E2BIG
      const tmpDir = path.join(PROJECT_ROOT, 'data', '.tmp');
      fs.mkdirSync(tmpDir, { recursive: true });
      const ts = Date.now();
      const promptFile = path.join(tmpDir, `prompt-${this.role}-${ts}.md`);
      const sysFile = path.join(tmpDir, `sys-${this.role}-${ts}.md`);
      fs.writeFileSync(promptFile, prompt);
      fs.writeFileSync(sysFile, this.systemPrompt);

      // stream-json gives us per-turn tool calls + a final `result` event with
      // total_cost_usd and usage (input/output/cache tokens + model).
      const child = spawn('bash', ['-c',
        `cat "${promptFile}" | npx @anthropic-ai/claude-code --print --output-format stream-json --verbose --system-prompt-file "${sysFile}" --allowed-tools Bash Read Write Glob Grep Edit --dangerously-skip-permissions --add-dir "${wsRoot}"`
      ], {
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Cleanup temp files when done
      child.on('close', () => {
        try { fs.unlinkSync(promptFile); fs.unlinkSync(sysFile); } catch {}
      });

      let stdoutBuffer = '';  // accumulates partial lines across data events
      let output = '';        // concatenated assistant text
      let usage: TokenUsage | null = null;

      const emit = (msg: string) => {
        events.agentWorking(this.role, this.name, msg.substring(0, 200));
        console.log(chalk.gray(`  ${this.name}: ${msg.substring(0, 120)}`));
      };

      const handleEvent = (event: any) => {
        if (!event || typeof event !== 'object') return;

        if (event.type === 'assistant' && event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === 'text' && typeof block.text === 'string') {
              output += block.text;
              const trimmed = block.text.trim();
              if (trimmed && (
                trimmed.includes('Created TASK-') || trimmed.includes('Updated TASK-') ||
                trimmed.includes('Comment added') || trimmed.includes('File written') ||
                trimmed.includes('Linked ')
              )) {
                emit(trimmed);
              }
            } else if (block.type === 'tool_use' && block.name) {
              const input = block.input ?? {};
              const hint =
                block.name === 'Bash'  ? `$ ${String(input.command ?? '').substring(0, 100)}` :
                block.name === 'Write' ? `writing ${input.file_path ?? '?'}` :
                block.name === 'Edit'  ? `editing ${input.file_path ?? '?'}` :
                block.name === 'Read'  ? `reading ${input.file_path ?? '?'}` :
                block.name === 'Glob'  ? `glob ${input.pattern ?? '?'}` :
                block.name === 'Grep'  ? `grep ${input.pattern ?? '?'}` :
                String(block.name);
              emit(hint);
            }
          }
        } else if (event.type === 'result') {
          const u = event.usage ?? {};
          const model = event.modelUsage && typeof event.modelUsage === 'object'
            ? Object.keys(event.modelUsage)[0]
            : undefined;
          usage = {
            input_tokens: u.input_tokens ?? 0,
            output_tokens: u.output_tokens ?? 0,
            cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
            cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
            total_cost_usd: event.total_cost_usd ?? 0,
            duration_ms: event.duration_ms ?? 0,
            model,
          };
        }
        // 'system', 'rate_limit_event', 'user' (tool results) — ignored
      };

      child.stdout.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() ?? '';  // keep trailing partial
        for (const line of lines) {
          if (!line.trim()) continue;
          try { handleEvent(JSON.parse(line)); } catch { /* ignore malformed */ }
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const err = data.toString().trim();
        if (err && !err.includes('npm warn')) {
          console.log(chalk.dim(`  ${this.name} stderr: ${err.substring(0, 100)}`));
        }
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        events.agentWorking(this.role, this.name, 'Timed out (5min)');
        resolve({ output: output || 'Agent timed out.', usage });
      }, 5 * 60 * 1000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        // Flush any remaining buffer (shouldn't happen — stream-json lines end with \n)
        if (stdoutBuffer.trim()) {
          try { handleEvent(JSON.parse(stdoutBuffer)); } catch { /* noop */ }
        }
        if (code !== 0 && !output) {
          resolve({ output: 'Agent error: exit code ' + code, usage });
        } else {
          resolve({ output: output || 'No output.', usage });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ output: `Agent spawn error: ${err.message}`, usage });
      });
    });
  }
}
