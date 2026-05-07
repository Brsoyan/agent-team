/**
 * Gate runner — executes automated checks (tsc, tests, lint) against the
 * generated Expo app and decides whether the task can advance.
 *
 * Gates are configured in agents/pipeline.ts as entries with `mode: 'gate'`.
 * The orchestrator detects those entries and calls `runGate` instead of
 * spawning a Claude Code process. The result is posted as a comment on the
 * task and the orchestrator routes via `handoff` (pass) or `onFail` (fail).
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { GateCheck } from './agents/pipeline.js';
import { projectWorkspaceDir } from './models/project.js';

export interface CheckResult {
  check: GateCheck;
  passed: boolean;
  output: string;   // tail of stdout+stderr, clipped
  skipped?: boolean;
  durationMs: number;
}

export interface GateResult {
  pass: boolean;   // true only if every REQUIRED check passed
  results: CheckResult[];
}

/**
 * Locate the scaffolded Expo app inside a project's workspace/code/ directory.
 * Kept here (not inside dashboard.ts) so the orchestrator can reuse it.
 */
export function findAppPath(projectId: string): string | null {
  const wsDir = projectWorkspaceDir(projectId);
  const codeDir = path.join(wsDir, 'code');
  if (!fs.existsSync(codeDir)) return null;
  for (const entry of fs.readdirSync(codeDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkg = path.join(codeDir, entry.name, 'package.json');
    if (fs.existsSync(pkg)) return path.join(codeDir, entry.name);
  }
  if (fs.existsSync(path.join(codeDir, 'package.json'))) return codeDir;
  return null;
}

async function runCheck(projectId: string, check: GateCheck): Promise<CheckResult> {
  const started = Date.now();
  const workspacePath = projectWorkspaceDir(projectId);
  const appPath = findAppPath(projectId);
  const cwd = check.cwd === 'app' ? appPath : workspacePath;

  if (check.cwd === 'app' && !appPath) {
    return {
      check,
      passed: false,
      skipped: true,
      output: 'No Expo app found in workspace/code/ — did the developer agent run?',
      durationMs: Date.now() - started,
    };
  }

  return new Promise((resolve) => {
    let output = '';
    // source shell profile so commands run in a realistic $PATH (nvm, brew, etc.)
    const wrapped = `source ~/.zshrc 2>/dev/null || source ~/.bash_profile 2>/dev/null || true
${check.command}`;
    const child = spawn('bash', ['-c', wrapped], {
      cwd: cwd!,
      env: { ...process.env, CI: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const append = (buf: Buffer) => { output += buf.toString(); };
    child.stdout.on('data', append);
    child.stderr.on('data', append);

    const timeoutMs = check.timeoutMs ?? 300_000;
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch { /* noop */ }
      setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* noop */ } }, 2000);
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      // Keep the tail — heads of tsc output are rarely the useful bit.
      const tail = output.length > 6000 ? '…\n' + output.slice(-6000) : output;
      resolve({
        check,
        passed: code === 0,
        output: tail.trim(),
        durationMs: Date.now() - started,
      });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        check,
        passed: false,
        output: `Spawn error: ${err.message}`,
        durationMs: Date.now() - started,
      });
    });
  });
}

export async function runGate(
  projectId: string,
  checks: GateCheck[],
  onProgress?: (msg: string) => void,
): Promise<GateResult> {
  const results: CheckResult[] = [];
  for (const check of checks) {
    onProgress?.(`Running check: ${check.name}`);
    const r = await runCheck(projectId, check);
    results.push(r);
    onProgress?.(
      `${check.name}: ${r.skipped ? 'SKIPPED' : r.passed ? 'PASSED' : 'FAILED'} (${r.durationMs}ms)`
    );
  }
  // A gate passes iff every REQUIRED check passed. Skipped required checks
  // count as failure; non-required checks never block.
  const pass = results.every(r => !r.check.required || (r.passed && !r.skipped));
  return { pass, results };
}

/** Render a gate result as a markdown comment for the task. */
export function formatGateComment(result: GateResult): string {
  const lines: string[] = [];
  lines.push(`**Automated gate: ${result.pass ? 'PASSED' : 'FAILED'}**`);
  lines.push('');
  for (const r of result.results) {
    const state = r.skipped ? 'SKIP' : r.passed ? 'PASS' : (r.check.required ? 'FAIL' : 'WARN');
    lines.push(`- [${state}] ${r.check.name} — ${(r.durationMs / 1000).toFixed(1)}s`);
  }
  lines.push('');
  const failing = result.results.filter(r => !r.passed && !r.skipped);
  for (const r of failing) {
    lines.push(`### ${r.check.name} output (tail)`);
    lines.push('```');
    lines.push(r.output.slice(-2500) || '(no output)');
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}
