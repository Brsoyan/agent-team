import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync, spawn } from 'child_process';
import os from 'os';
import chalk from 'chalk';
import { TaskBoard } from './models/board.js';
import { Workspace } from './models/workspace.js';
import { Orchestrator, stopAgents, getSkippedAgents, setSkippedAgents } from './orchestrator.js';
import * as pipelineEvents from './events.js';
import { ALL_AGENTS } from './agents/index.js';
import { AgentRole } from './models/types.js';
import * as Projects from './models/project.js';
import * as Knowledge from './knowledge/index.js';
import * as AgentFactory from './agents/factory.js';
import { summarizeUsage } from './usage.js';

const PORT = 3333;

let isRunning = false;
let runningAgent = '';
let activityLog: { time: string; agent: string; message: string }[] = [];

function log(agent: string, msg: string) {
  activityLog.push({ time: new Date().toISOString(), agent, message: msg });
  if (activityLog.length > 200) activityLog = activityLog.slice(-200);
}

export function startDashboard(): void {
  const app = express();
  app.use(express.json());

  // Project IDs are used in path joins all over this file; reject anything
  // that could escape the expected directory.
  const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
  app.param('id', (req, res, next, id) => {
    if (!SAFE_ID.test(id)) return res.status(400).json({ error: 'invalid project id' });
    next();
  });

  // The Vite dev server proxies /api to this server, so browsers never make
  // cross-origin requests. No CORS headers needed, and sending
  // `Access-Control-Allow-Origin: *` would let arbitrary sites the user visits
  // talk to this API (which can spawn Claude Code agents on their machine).

  const getBoard = (pid: string) => new TaskBoard(Projects.projectBoardPath(pid));
  const getWorkspace = (pid: string) => new Workspace(Projects.projectWorkspaceDir(pid));
  const getLogsDir = (pid: string) => Projects.projectLogsDir(pid);

  // ══════ Projects ══════

  app.get('/api/projects', (_req, res) => {
    const projects = Projects.listProjects();
    // Enrich with task counts
    const enriched = projects.map(p => {
      const board = getBoard(p.id);
      const tasks = board.getState().tasks;
      const done = tasks.filter(t => t.status === 'done').length;
      return { ...p, task_count: tasks.length, done_count: done, day: board.getDay() };
    });
    res.json(enriched);
  });

  app.post('/api/projects', (req, res) => {
    const { name, description, features, sdkConfig, prd } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const project = Projects.createProject(name, description || '', sdkConfig);
    const prdText = typeof prd === 'string' ? prd.trim() : '';
    if (prdText) {
      new Orchestrator(project.id).seedProject(name, description || '', [], prdText);
    } else if (features?.length) {
      new Orchestrator(project.id).seedProject(name, description || '', features);
    }
    log('system', `Project created: ${name}${prdText ? ' (PRD mode)' : ''}`);
    res.json(project);
  });

  app.delete('/api/projects/:id', (req, res) => {
    Projects.deleteProject(req.params.id);
    Knowledge.deleteProjectKnowledge(req.params.id);
    log('system', `Project deleted`);
    res.json({ ok: true });
  });

  // ══════ Project Settings ══════

  app.get('/api/projects/:id/settings', (req, res) => {
    const pid = req.params.id;
    const sdkConfigPath = path.join(path.resolve('data/projects'), pid, 'sdk-config.json');
    const sdkConfig = fs.existsSync(sdkConfigPath) ? JSON.parse(fs.readFileSync(sdkConfigPath, 'utf-8')) : {};
    const project = Projects.getProject(pid);
    res.json({ project, sdkConfig });
  });

  app.post('/api/projects/:id/settings', (req, res) => {
    const pid = req.params.id;
    const { sdkConfig } = req.body;
    if (sdkConfig) {
      const sdkConfigPath = path.join(path.resolve('data/projects'), pid, 'sdk-config.json');
      fs.mkdirSync(path.dirname(sdkConfigPath), { recursive: true });
      fs.writeFileSync(sdkConfigPath, JSON.stringify(sdkConfig, null, 2));
    }
    log('system', 'Project settings updated');
    res.json({ ok: true });
  });

  app.post('/api/projects/:id/sync-design-system', (req, res) => {
    const board = getBoard(req.params.id);
    board.createTask({
      title: 'Update SDKs — sync design system + subscription SDK to latest',
      description: `SDKs have been updated. Developer MUST update the app to use the latest SDK features:

## Design System SDK
1. Replace ALL raw React Native components with SDK components:
   - View → Box, SafeAreaView → Screen, Text → Text (SDK), TouchableOpacity → Button
   - TextInput → Input, ScrollView stays but content uses SDK components
2. Wrap app root: <ThemeProvider palette="ocean">
3. Use useAppTheme() hook for dynamic theme access
4. NavigationContainer must use theme.navigation: <NavigationContainer theme={theme.navigation}>
5. Navigation headers: headerStyle={{ backgroundColor: theme.colors.navBg }}, headerTintColor: theme.colors.navText
6. All screens root: <Screen> component
7. Remove ALL hardcoded colors — use theme.colors.* only
8. Add <SettingsScreen> to navigation (lets users switch palette + dark/light mode)
9. StatusBar: <StatusBar barStyle={theme.colors.statusBarStyle} />

SDK UI Components:
ThemeProvider, Screen, Box, Card, Text, Button, Input, Divider, Badge, Avatar, IconButton, Row, Column, Spacer, Loading, EmptyState, Toast, ListItem, SettingsScreen

## Subscription SDK
10. Verify initSubscriptionSDK() is called in App.tsx with correct plans
11. Verify <PlanPicker />, <SubscriptionStatus />, useSubscription() are used
12. Check package.json has: "@agent-team/subscription-sdk": "file:../../../../sdk"
13. Check metro.config.js has watchFolders and nodeModulesPaths for SDK

Import everything from: import { ... } from '@agent-team/subscription-sdk';`,
      type: 'feature',
      status: 'todo',
      priority: 'high',
      assignee: 'developer',
      created_by: 'pm',
    });
    log('system', 'Update SDKs task created');
    res.json({ ok: true });
  });

  // ══════ Project Board ══════

  app.get('/api/projects/:id/board', (req, res) => {
    res.json(getBoard(req.params.id).getState());
  });

  app.get('/api/projects/:id/tasks', (req, res) => {
    res.json(getBoard(req.params.id).getState().tasks);
  });

  app.get('/api/projects/:id/tasks/:taskId', (req, res) => {
    const task = getBoard(req.params.id).getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json(task);
  });

  // Create a task from the dashboard
  app.post('/api/projects/:id/tasks', (req, res) => {
    const { title, description, type, status, priority, assignee } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const board = getBoard(req.params.id);
    const task = board.createTask({
      title,
      description: description || '',
      type: type || 'feature',
      status: status || 'backlog',
      priority: priority || 'medium',
      assignee: assignee || 'pm',
      created_by: 'pm',
    });
    log('system', `Task created from dashboard: ${task.id} "${title}"`);
    res.json(task);
  });

  // Update a task from the dashboard
  app.patch('/api/projects/:id/tasks/:taskId', (req, res) => {
    const { status, assignee, priority, description } = req.body;
    const board = getBoard(req.params.id);
    const task = board.updateTask(req.params.taskId, {
      ...(status && { status }),
      ...(assignee && { assignee }),
      ...(priority && { priority }),
      ...(description !== undefined && { description }),
    });
    if (!task) return res.status(404).json({ error: 'Not found' });
    log('system', `Task ${task.id} updated from dashboard`);
    res.json(task);
  });

  app.get('/api/projects/:id/files', (req, res) => {
    res.json(getWorkspace(req.params.id).listFiles());
  });

  app.get('/api/projects/:id/file', (req, res) => {
    const fp = (req.query.path as string) || '';
    if (!fp) return res.status(400).json({ error: 'path required' });
    const content = getWorkspace(req.params.id).readFile(fp);
    if (content === null) return res.status(404).json({ error: 'Not found' });
    res.type('text/plain').send(content);
  });

  app.get('/api/projects/:id/usage', (req, res) => {
    res.json(summarizeUsage(req.params.id));
  });

  app.get('/api/projects/:id/stats', (req, res) => {
    const pid = req.params.id;
    const state = getBoard(pid).getState();
    const byStatus: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    for (const t of state.tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byAgent[t.assignee] = (byAgent[t.assignee] || 0) + 1;
    }
    const u = summarizeUsage(pid).total;
    res.json({
      total: state.tasks.length,
      day: state.day,
      files: getWorkspace(pid).listFiles().length,
      by_status: byStatus,
      by_agent: byAgent,
      cost_usd: u.total_cost_usd,
      tokens_in: u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens,
      tokens_out: u.output_tokens,
      llm_calls: u.calls,
    });
  });

  // ══════ Agents Info + Prompts ══════

  app.get('/api/projects/:id/agents', (req, res) => {
    const board = getBoard(req.params.id);
    const tasks = board.getState().tasks;
    res.json(ALL_AGENTS.map(a => ({
      role: a.role,
      name: a.name,
      title: a.title,
      pending: board.getPendingTasks(a.role).length,
      total: tasks.filter(t => t.assignee === a.role).length,
    })));
  });

  // Base agent prompts (templates)
  app.get('/api/agents/prompts', (_req, res) => {
    res.json(ALL_AGENTS.map(a => ({
      role: a.role, name: a.name, title: a.title, system_prompt: a.systemPrompt,
    })));
  });

  // ══════ Project Agents (per-project instances with skills) ══════

  // Get this project's agents (with skills)
  app.get('/api/projects/:id/agents/full', (req, res) => {
    res.json(AgentFactory.getProjectAgents(req.params.id));
  });

  // Update a project agent (rename, customize)
  app.post('/api/projects/:id/agents/:role', (req, res) => {
    const { name, title } = req.body;
    AgentFactory.updateProjectAgent(req.params.id, req.params.role as any, { name, title });
    res.json({ ok: true });
  });

  // Import skills from another project's agent
  app.post('/api/projects/:id/agents/:role/import', (req, res) => {
    const { sourceProjectId } = req.body;
    if (!sourceProjectId) return res.status(400).json({ error: 'sourceProjectId required' });
    const result = AgentFactory.importAgentSkills(req.params.id, sourceProjectId, req.params.role as any);
    log('system', `Imported ${result.imported} skills for ${req.params.role} from ${sourceProjectId}`);
    res.json(result);
  });

  // List projects with agents that have skills (for import picker)
  app.get('/api/agents/skills', (_req, res) => {
    res.json(AgentFactory.listProjectsWithSkills());
  });

  // ══════ Communication Log ══════

  app.get('/api/projects/:id/communications', (req, res) => {
    const tasks = getBoard(req.params.id).getState().tasks;
    const comms: { task_id: string; task_title: string; author: string; content: string; timestamp: string }[] = [];
    for (const t of tasks) {
      for (const c of t.comments) {
        comms.push({ task_id: t.id, task_title: t.title, author: c.author, content: c.content, timestamp: c.timestamp });
      }
    }
    comms.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    res.json(comms);
  });

  // ══════ User Instructions to Agents ══════

  app.get('/api/projects/:id/instructions', (req, res) => {
    const p = path.join(path.resolve('data/projects'), req.params.id, 'instructions.json');
    if (!fs.existsSync(p)) return res.json([]);
    res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
  });

  app.post('/api/projects/:id/instructions', (req, res) => {
    const { role, message } = req.body;
    if (!role || !message) return res.status(400).json({ error: 'role and message required' });
    const p = path.join(path.resolve('data/projects'), req.params.id, 'instructions.json');
    const existing = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : [];
    existing.push({ role, message, time: new Date().toISOString() });
    fs.writeFileSync(p, JSON.stringify(existing, null, 2));
    log('user', `Instruction to ${role}: ${message.substring(0, 80)}`);
    res.json({ ok: true });
  });

  app.delete('/api/projects/:id/instructions', (req, res) => {
    const p = path.join(path.resolve('data/projects'), req.params.id, 'instructions.json');
    if (fs.existsSync(p)) fs.unlinkSync(p);
    res.json({ ok: true });
  });

  // ══════ Knowledge ══════

  app.get('/api/projects/:id/knowledge', (req, res) => {
    res.json({
      general: Knowledge.getGlobalKnowledge(),
      project: Knowledge.getProjectKnowledge(req.params.id),
    });
  });

  // ══════ Logs ══════

  app.get('/api/projects/:id/logs', (req, res) => {
    const dir = getLogsDir(req.params.id);
    if (!fs.existsSync(dir)) return res.json([]);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
    res.json(files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))));
  });

  app.get('/api/activity', (_req, res) => res.json(activityLog));

  // ══════ Pipeline State (real-time) ══════

  app.get('/api/pipeline', (_req, res) => {
    res.json(pipelineEvents.getState());
  });

  app.get('/api/projects/:id/pipeline', (req, res) => {
    res.json(pipelineEvents.getState(req.params.id));
  });

  app.get('/api/status', (_req, res) => {
    const ps = pipelineEvents.getState();
    res.json({ running: isRunning, agent: ps.currentAgentName || runningAgent });
  });

  // ══════ Agent Skip Controls ══════

  // ══════ Build & Run ══════

  // Find the Expo app path inside a project's workspace
  function findAppPath(projectId: string): string | null {
    const wsDir = Projects.projectWorkspaceDir(projectId);
    const codeDir = path.join(wsDir, 'code');
    if (!fs.existsSync(codeDir)) return null;
    // Look for the first subdirectory containing a package.json
    for (const entry of fs.readdirSync(codeDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const pkg = path.join(codeDir, entry.name, 'package.json');
        if (fs.existsSync(pkg)) return path.join(codeDir, entry.name);
      }
    }
    // Maybe code/ itself is the project
    if (fs.existsSync(path.join(codeDir, 'package.json'))) return codeDir;
    return null;
  }

  app.get('/api/projects/:id/app-info', (req, res) => {
    const appPath = findAppPath(req.params.id);
    const projectRoot = path.resolve('.');
    const relPath = appPath ? path.relative(projectRoot, appPath) : null;
    res.json({
      path: appPath,         // absolute — for Terminal commands
      relativePath: relPath, // relative — for display
      exists: !!appPath,
      // Whether `npx expo prebuild` has been run (native dirs present).
      prebuilt: !!appPath && fs.existsSync(path.join(appPath, 'ios')) && fs.existsSync(path.join(appPath, 'android')),
      hasAppJson: !!appPath && fs.existsSync(path.join(appPath, 'app.json')),
    });
  });

  // ══════ Build Log (captured output) ══════

  interface BuildLog {
    title: string;
    output: string[];
    running: boolean;
    exitCode: number | null;
    startedAt: string;
  }

  const buildLogs = new Map<string, BuildLog>();
  const buildProcesses = new Map<string, import('child_process').ChildProcess>();

  function runCommand(projectId: string, command: string, title: string): void {
    const logEntry: BuildLog = { title, output: [], running: true, exitCode: null, startedAt: new Date().toISOString() };
    buildLogs.set(projectId, logEntry);

    const tmpScript = path.join(os.tmpdir(), `agent-team-${Date.now()}.sh`);
    fs.writeFileSync(tmpScript, `#!/bin/bash
source ~/.zshrc 2>/dev/null || source ~/.bash_profile 2>/dev/null || true
set -o pipefail
echo "=== ${title} ==="
${command}
`, { mode: 0o755 });

    // detached + process-group so we can kill the whole tree (expo spawns metro + sub-processes)
    const child = spawn('bash', [tmpScript], { env: { ...process.env }, detached: true });
    buildProcesses.set(projectId, child);

    const appendLine = (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line) logEntry.output.push(line);
        if (logEntry.output.length > 500) logEntry.output.shift();
      }
    };

    child.stdout?.on('data', appendLine);
    child.stderr?.on('data', appendLine);
    child.on('close', (code) => {
      logEntry.running = false;
      logEntry.exitCode = code;
      buildProcesses.delete(projectId);
      log('system', `${title} finished with code ${code}`);
    });
  }

  function stopBuild(projectId: string): boolean {
    const child = buildProcesses.get(projectId);
    if (!child?.pid) return false;
    try {
      // Kill the entire process group (negative PID) so metro / subprocesses go down too.
      process.kill(-child.pid, 'SIGTERM');
      setTimeout(() => {
        if (buildProcesses.has(projectId)) {
          try { process.kill(-child.pid!, 'SIGKILL'); } catch { /* ignore */ }
        }
      }, 2000);
      return true;
    } catch {
      try { child.kill('SIGKILL'); return true; } catch { return false; }
    }
  }

  app.get('/api/projects/:id/build-log', (req, res) => {
    const entry = buildLogs.get(req.params.id);
    if (!entry) return res.json({ title: '', output: [], running: false, exitCode: null });
    res.json(entry);
  });

  app.post('/api/projects/:id/build-log/stop', (req, res) => {
    const killed = stopBuild(req.params.id);
    res.json({ ok: true, killed });
  });

  app.delete('/api/projects/:id/build-log', (req, res) => {
    stopBuild(req.params.id); // if still running, tear it down first
    buildLogs.delete(req.params.id);
    res.json({ ok: true });
  });

  // Helper: install deps (Expo-only)
  const installCmd = () =>
    `echo "Installing dependencies..." && npm install --silent && echo "Dependencies ready"`;

  // ══════ Connected Devices ══════

  app.get('/api/devices', (_req, res) => {
    const byId = new Map<string, { id: string; name: string; platform: string; model: string; connected: boolean }>();

    // iOS — try devicectl first (modern Xcode), then xctrace (broader coverage).
    try {
      const output = execSync('xcrun devicectl list devices --filter "state == \'connected\'" -v 2>/dev/null', { encoding: 'utf-8', timeout: 15000 });
      const lines = output.split('\n');
      let currentName = '';
      let currentModel = '';

      for (const line of lines) {
        const headerMatch = line.match(/^\s+▿\s+(.+?)\s+-\s+(iPhone\S+|iPad\S+)\s+-\s+\S+\s+-\s+\S+/);
        if (headerMatch) { currentName = headerMatch[1].trim(); currentModel = ''; }
        const marketingMatch = line.match(/marketingName:.*?"(.+?)"/);
        if (marketingMatch) currentModel = marketingMatch[1];
        const udidMatch = line.match(/udid:.*?"([0-9A-Fa-f-]+)"/);
        if (udidMatch && currentModel) {
          const id = udidMatch[1];
          byId.set(id, { id, name: currentName || 'Device', platform: 'ios', model: currentModel, connected: true });
        }
      }
    } catch { /* ignore */ }

    try {
      const output = execSync('xcrun xctrace list devices 2>&1', { encoding: 'utf-8', timeout: 10000 });
      // Only look at the "== Devices ==" section (connected); stop at "Devices Offline" or "Simulators".
      let inConnected = false;
      for (const raw of output.split('\n')) {
        const line = raw.trim();
        if (/^==\s*Devices\s*==$/.test(line)) { inConnected = true; continue; }
        if (/^==\s*(Devices Offline|Simulators)\s*==$/.test(line)) { inConnected = false; continue; }
        if (!inConnected || !line) continue;

        // Expected format: "Name (OS version) (UDID)"
        const match = line.match(/^(.+?)\s+\(([\d.]+)\)\s+\(([0-9A-Fa-f-]{20,})\)\s*$/);
        if (!match) continue;
        const [, name, , udid] = match;
        // Skip Mac (4-dash UUID) and simulators (checked by section, but belt-and-braces on name).
        if ((udid.match(/-/g) || []).length >= 4) continue;
        if (/MacBook|iMac|Mac Pro|Mac mini|Mac Studio/i.test(name)) continue;

        if (!byId.has(udid)) {
          byId.set(udid, { id: udid, name: name.trim(), platform: 'ios', model: '', connected: true });
        }
      }
    } catch { /* ignore */ }

    // Android devices via adb
    try {
      const adbOutput = execSync('adb devices -l 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
      for (const line of adbOutput.split('\n')) {
        const match = line.match(/^(\S+)\s+device\s+.*model:(\S+)/);
        if (match) {
          const id = match[1];
          byId.set(id, { id, name: match[2].replace(/_/g, ' '), platform: 'android', model: '', connected: true });
        }
      }
    } catch { /* no adb */ }

    res.json(Array.from(byId.values()));
  });

  // ══════ Signing Identities ══════

  app.get('/api/signing-identities', (_req, res) => {
    try {
      const output = execSync('security find-identity -v -p codesigning', { encoding: 'utf-8' });
      const identities: { id: string; name: string; team: string }[] = [];
      for (const line of output.split('\n')) {
        const match = line.match(/^\s*\d+\)\s+([A-F0-9]+)\s+"(.+?)"\s*$/);
        if (match) {
          const teamMatch = match[2].match(/\(([A-Z0-9]{10})\)$/);
          identities.push({ id: match[1], name: match[2], team: teamMatch?.[1] || '' });
        }
      }
      // Deduplicate by team
      const seen = new Set<string>();
      const unique = identities.filter(i => {
        if (!i.team || seen.has(i.team)) return false;
        seen.add(i.team);
        return true;
      });
      res.json(unique);
    } catch {
      res.json([]);
    }
  });

  // Expo-only: signing lives in app.json (expo.ios.{bundleIdentifier,appleTeamId}, expo.android.package)
  app.get('/api/projects/:id/signing', (req, res) => {
    const appPath = findAppPath(req.params.id);
    if (!appPath) return res.json({ team: '', bundleId: '', androidPackage: '' });
    const appJsonPath = path.join(appPath, 'app.json');
    if (!fs.existsSync(appJsonPath)) return res.json({ team: '', bundleId: '', androidPackage: '' });
    try {
      const cfg = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
      res.json({
        team: cfg.expo?.ios?.appleTeamId || '',
        bundleId: cfg.expo?.ios?.bundleIdentifier || '',
        androidPackage: cfg.expo?.android?.package || '',
      });
    } catch {
      res.json({ team: '', bundleId: '', androidPackage: '' });
    }
  });

  app.post('/api/projects/:id/signing', (req, res) => {
    const { team, bundleId, androidPackage } = req.body;
    const appPath = findAppPath(req.params.id);
    if (!appPath) return res.status(404).json({ error: 'No app found' });
    const appJsonPath = path.join(appPath, 'app.json');
    if (!fs.existsSync(appJsonPath)) return res.status(404).json({ error: 'No app.json' });

    const cfg = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    cfg.expo = cfg.expo || {};
    cfg.expo.ios = cfg.expo.ios || {};
    cfg.expo.android = cfg.expo.android || {};

    if (bundleId) cfg.expo.ios.bundleIdentifier = bundleId;
    if (team) cfg.expo.ios.appleTeamId = team;
    else if (team === '') delete cfg.expo.ios.appleTeamId;
    if (androidPackage) cfg.expo.android.package = androidPackage;

    fs.writeFileSync(appJsonPath, JSON.stringify(cfg, null, 2) + '\n');
    log('system', `Expo signing updated: team=${team || '(cleared)'}, bundle=${bundleId || '(unchanged)'}, androidPackage=${androidPackage || '(unchanged)'}`);
    res.json({ ok: true, note: 'Native project regenerates on next Run iOS / Run Android (or click Prebuild --clean).' });
  });

  function runTerminalAction(req: any, res: any, command: string, title: string) {
    const appPath = findAppPath(req.params.id);
    if (!appPath) return res.status(404).json({ error: 'No app found in workspace' });
    const existing = buildLogs.get(req.params.id);
    if (existing?.running) return res.status(409).json({ error: 'A build is already running' });
    runCommand(req.params.id, command.replace(/\{APP\}/g, appPath), title);
    res.json({ ok: true });
  }

  app.post('/api/projects/:id/run-ios', (req, res) => {
    runTerminalAction(req, res,
      `cd "{APP}" && ${installCmd()}
echo "🚀 Expo: building & running iOS simulator..."
npx expo run:ios`,
      'Run iOS');
  });

  app.post('/api/projects/:id/run-ios-device', (req, res) => {
    const deviceId = req.body.device || '';
    runTerminalAction(req, res,
      `cd "{APP}" && ${installCmd()}
echo "📱 Expo: building & running iOS device${deviceId ? ' (' + deviceId + ')' : ''}..."
npx expo run:ios ${deviceId ? `--device "${deviceId}"` : '--device'}`,
      'Run iOS Device');
  });

  app.post('/api/projects/:id/run-android', (req, res) => {
    runTerminalAction(req, res,
      `cd "{APP}" && ${installCmd()}
echo "🚀 Expo: building & running Android emulator..."
npx expo run:android`,
      'Run Android');
  });

  app.post('/api/projects/:id/run-android-device', (req, res) => {
    const deviceId = req.body.device || '';
    runTerminalAction(req, res,
      `cd "{APP}" && ${installCmd()}
echo "📱 Expo: building & running Android device${deviceId ? ': ' + deviceId : ''}..."
npx expo run:android ${deviceId ? `--device "${deviceId}"` : '--device'}`,
      'Run Android Device');
  });

  // Release-mode builds via Expo
  app.post('/api/projects/:id/build-apk', (req, res) => {
    runTerminalAction(req, res,
      `cd "{APP}" && ${installCmd()}
echo "🔨 Expo: building Android release APK..."
npx expo run:android --variant release
echo
echo "✅ APK: android/app/build/outputs/apk/release/app-release.apk"`,
      'Build Android APK');
  });

  app.post('/api/projects/:id/build-ios', (req, res) => {
    runTerminalAction(req, res,
      `cd "{APP}" && ${installCmd()}
echo "🔨 Expo: building iOS release..."
npx expo run:ios --configuration Release`,
      'Build iOS Release');
  });

  app.post('/api/projects/:id/install-deps', (req, res) => {
    runTerminalAction(req, res,
      `cd "{APP}" && ${installCmd()}`,
      'Install Dependencies');
  });

  // Start the Expo dev server (JS-only, no native rebuild — pair with Expo Go or a dev client)
  app.post('/api/projects/:id/start-expo', (req, res) => {
    const clear = req.body?.clear ? ' --clear' : '';
    runTerminalAction(req, res,
      `cd "{APP}" && ${installCmd()}
echo "📡 Starting Expo dev server..."
npx expo start${clear}`,
      'Start Expo');
  });

  // One-shot prebuild: generates native ios/ and android/ from app.json
  app.post('/api/projects/:id/prebuild', (req, res) => {
    const clean = req.body?.clean ? ' --clean' : '';
    runTerminalAction(req, res,
      `cd "{APP}" && ${installCmd()}
echo "🏗️  Running npx expo prebuild${clean}..."
npx expo prebuild${clean}`,
      'Expo Prebuild');
  });

  app.get('/api/projects/:id/skips', (req, res) => {
    res.json(getSkippedAgents(req.params.id));
  });

  app.post('/api/projects/:id/skips', (req, res) => {
    setSkippedAgents(req.params.id, req.body.roles || []);
    res.json({ ok: true });
  });

  // ══════ Run Controls ══════

  app.post('/api/stop', (_req, res) => {
    stopAgents();
    isRunning = false;
    runningAgent = '';
    log('system', 'Stopped by user');
    res.json({ status: 'stopped' });
  });

  app.post('/api/projects/:id/run/day', async (req, res) => {
    if (isRunning) return res.status(409).json({ error: 'busy' });
    isRunning = true; runningAgent = 'all';
    log('system', 'Day cycle started');
    res.json({ status: 'started' });
    try { await new Orchestrator(req.params.id).runDay(); log('system', 'Day done'); }
    catch (e) { log('system', `Error: ${e}`); }
    finally { isRunning = false; runningAgent = ''; }
  });

  app.post('/api/projects/:id/run/auto', async (req, res) => {
    if (isRunning) return res.status(409).json({ error: 'busy' });
    const days = Math.min(parseInt(req.body.days || '5', 10), 10);
    isRunning = true; runningAgent = 'auto';
    log('system', `Auto-run ${days} days`);
    res.json({ status: 'started', days });
    try {
      const o = new Orchestrator(req.params.id);
      for (let i = 0; i < days; i++) { runningAgent = `day ${i+1}/${days}`; await o.runDay(); }
      log('system', 'Auto-run done');
    } catch (e) { log('system', `Error: ${e}`); }
    finally { isRunning = false; runningAgent = ''; }
  });

  app.post('/api/projects/:id/run/task/:taskId', async (req, res) => {
    if (isRunning) return res.status(409).json({ error: 'busy' });
    const taskId = req.params.taskId;
    const board = getBoard(req.params.id);
    const task = board.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const config = ALL_AGENTS.find(a => a.role === task.assignee);
    if (!config) return res.status(400).json({ error: `Unknown agent: ${task.assignee}` });
    isRunning = true; runningAgent = config.name;
    log(task.assignee, `${config.name} working on ${taskId}`);
    res.json({ status: 'started', task: taskId, agent: task.assignee });
    try {
      await new Orchestrator(req.params.id).runTask(taskId);
      log(task.assignee, `${config.name} finished ${taskId}`);
    } catch (e) { log(task.assignee, `Error on ${taskId}: ${e}`); }
    finally { isRunning = false; runningAgent = ''; }
  });

  app.post('/api/projects/:id/run/agent/:role', async (req, res) => {
    if (isRunning) return res.status(409).json({ error: 'busy' });
    const role = req.params.role as AgentRole;
    const config = ALL_AGENTS.find(a => a.role === role);
    if (!config) return res.status(404).json({ error: 'Unknown agent' });
    isRunning = true; runningAgent = config.name;
    log(role, `${config.name} started`);
    res.json({ status: 'started' });
    try { await new Orchestrator(req.params.id).runSingleAgent(role); log(role, `${config.name} done`); }
    catch (e) { log(role, `Error: ${e}`); }
    finally { isRunning = false; runningAgent = ''; }
  });

  // Bind to loopback only. The agents run with --dangerously-skip-permissions,
  // so exposing this API to the network would let anyone on the same Wi-Fi
  // spawn Claude Code agents and execute arbitrary shell commands here.
  app.listen(PORT, '127.0.0.1', () => {
    console.log(chalk.bold(`  API server: http://localhost:${PORT}`));
    console.log(chalk.dim(`  Board UI:   http://localhost:7788  (run: cd board && npm run dev)`));
  });
}
