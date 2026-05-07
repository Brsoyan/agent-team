const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(res.ok ? text : `${res.status} — ${text.replace(/<[^>]*>/g, '').trim().substring(0, 300)}`);
  }
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function del(path: string): Promise<void> {
  await fetch(`${BASE}${path}`, { method: 'DELETE' });
}

// ── Types ──

export interface Project {
  id: string; name: string; description: string; status: string;
  created_at: string; task_count: number; done_count: number; day: number;
}

export interface Task {
  id: string; title: string; description: string; type: string; status: string;
  priority: string; assignee: string; created_by: string;
  linked_files: string[]; comments: Comment[];
  created_at: string; updated_at: string;
}

export interface Comment {
  id: string; author: string; content: string; timestamp: string;
}

export interface AgentInfo {
  role: string; name: string; title: string; pending: number; total: number;
}

export interface AgentPrompt {
  role: string; name: string; title: string; system_prompt: string;
}

export interface ProjectAgent {
  role: string; name: string; title: string; system_prompt: string;
  skills: string[]; imported_from?: string;
}

export interface SkillSource {
  projectId: string;
  agents: { role: string; name: string; skillCount: number }[];
}

export interface CommEntry {
  task_id: string; task_title: string; author: string; content: string; timestamp: string;
}

export interface Stats {
  total: number; day: number; files: number;
  by_status: Record<string, number>; by_agent: Record<string, number>;
  cost_usd?: number; tokens_in?: number; tokens_out?: number; llm_calls?: number;
}

export interface UsageAgentRow {
  role: string; name: string; calls: number;
  input_tokens: number; output_tokens: number;
  cache_read_input_tokens: number; cache_creation_input_tokens: number;
  total_cost_usd: number;
}

export interface UsageSummary {
  total: {
    calls: number; input_tokens: number; output_tokens: number;
    cache_read_input_tokens: number; cache_creation_input_tokens: number;
    total_cost_usd: number; duration_ms: number;
  };
  by_agent: UsageAgentRow[];
  by_day: { day: number; total_cost_usd: number; calls: number }[];
  recent: (UsageAgentRow & { day: number; timestamp: string; task_id?: string; model?: string })[];
}

export interface RunStatus {
  running: boolean; agent: string;
}

export interface Activity {
  time: string; agent: string; message: string;
}

export interface PipelineAgent {
  role: string; name: string; title: string;
  status: 'waiting' | 'running' | 'done' | 'skipped' | 'error';
  summary: string;
}

export interface PipelineEvent {
  time: string; type: string; agent: string; agentName: string; message: string; day?: number;
}

export interface PipelineState {
  running: boolean; currentDay: number; currentAgent: string; currentAgentName: string;
  agents: PipelineAgent[]; events: PipelineEvent[];
}

// ── API Calls ──

export const api = {
  projects: {
    list: () => get<Project[]>('/projects'),
    create: (
      name: string,
      description: string,
      features: string[],
      sdkConfig?: { appId: string; iosSecret: string; androidPkg: string },
      prd?: string,
    ) =>
      post<Project>('/projects', { name, description, features, sdkConfig, prd }),
    delete: (id: string) => del(`/projects/${id}`),
  },
  project: (id: string) => ({
    board: () => get<{ project_name: string; project_description: string; day: number; tasks: Task[] }>(`/projects/${id}/board`),
    tasks: () => get<Task[]>(`/projects/${id}/tasks`),
    task: (taskId: string) => get<Task>(`/projects/${id}/tasks/${taskId}`),
    createTask: (data: { title: string; description?: string; type?: string; status?: string; priority?: string; assignee?: string }) =>
      post<Task>(`/projects/${id}/tasks`, data),
    updateTask: (taskId: string, data: { status?: string; assignee?: string; priority?: string; description?: string }) =>
      patch<Task>(`/projects/${id}/tasks/${taskId}`, data),
    runTask: (taskId: string) => post<{ status: string; task: string; agent: string }>(`/projects/${id}/run/task/${taskId}`),
    files: () => get<string[]>(`/projects/${id}/files`),
    file: (path: string) => fetch(`${BASE}/projects/${id}/file?path=${encodeURIComponent(path)}`).then(r => r.text()),
    stats: () => get<Stats>(`/projects/${id}/stats`),
    usage: () => get<UsageSummary>(`/projects/${id}/usage`),
    agents: () => get<AgentInfo[]>(`/projects/${id}/agents`),
    communications: () => get<CommEntry[]>(`/projects/${id}/communications`),
    logs: () => get<unknown[]>(`/projects/${id}/logs`),
    runDay: () => post(`/projects/${id}/run/day`),
    runAuto: (days = 5) => post(`/projects/${id}/run/auto`, { days }),
    runAgent: (role: string) => post(`/projects/${id}/run/agent/${role}`),
    pipeline: () => get<PipelineState>(`/projects/${id}/pipeline`),
    instructions: () => get<{ role: string; message: string; time: string }[]>(`/projects/${id}/instructions`),
    sendInstruction: (role: string, message: string) => post(`/projects/${id}/instructions`, { role, message }),
    clearInstructions: () => del(`/projects/${id}/instructions`),
    agentsFull: () => get<ProjectAgent[]>(`/projects/${id}/agents/full`),
    updateAgent: (role: string, data: { name?: string; title?: string }) => post(`/projects/${id}/agents/${role}`, data),
    importSkills: (role: string, sourceProjectId: string) => post<{ imported: number }>(`/projects/${id}/agents/${role}/import`, { sourceProjectId }),
    skips: () => get<string[]>(`/projects/${id}/skips`),
    setSkips: (roles: string[]) => post(`/projects/${id}/skips`, { roles }),
    settings: () => get<{ project: any; sdkConfig: any }>(`/projects/${id}/settings`),
    updateSettings: (sdkConfig: Record<string, string>) => post(`/projects/${id}/settings`, { sdkConfig }),
    syncDesignSystem: () => post(`/projects/${id}/sync-design-system`),
    appInfo: () => get<{ path: string | null; relativePath: string | null; exists: boolean; prebuilt: boolean; hasAppJson: boolean }>(`/projects/${id}/app-info`),
    startExpo: (clear = false) => post(`/projects/${id}/start-expo`, { clear }),
    prebuild: (clean = false) => post(`/projects/${id}/prebuild`, { clean }),
    runIos: () => post(`/projects/${id}/run-ios`),
    runIosDevice: (device?: string) => post(`/projects/${id}/run-ios-device`, { device }),
    runAndroid: () => post(`/projects/${id}/run-android`),
    runAndroidDevice: (device?: string) => post(`/projects/${id}/run-android-device`, { device }),
    buildLog: () => get<{ title: string; output: string[]; running: boolean; exitCode: number | null }>(`/projects/${id}/build-log`),
    stopBuild: () => post<{ ok: boolean; killed: boolean }>(`/projects/${id}/build-log/stop`),
    clearBuildLog: () => del(`/projects/${id}/build-log`),
    signing: () => get<{ team: string; bundleId: string; androidPackage: string }>(`/projects/${id}/signing`),
    updateSigning: (team: string, bundleId: string, androidPackage?: string) => post(`/projects/${id}/signing`, { team, bundleId, androidPackage }),
    buildApk: () => post(`/projects/${id}/build-apk`),
    buildIos: () => post(`/projects/${id}/build-ios`),
    installDeps: () => post(`/projects/${id}/install-deps`),
  }),
  devices: () => get<{ id: string; name: string; platform: string; model: string; connected: boolean }[]>('/devices'),
  signingIdentities: () => get<{ id: string; name: string; team: string }[]>('/signing-identities'),
  agentPrompts: () => get<AgentPrompt[]>('/agents/prompts'),
  skillSources: () => get<SkillSource[]>('/agents/skills'),
  status: () => get<RunStatus>('/status'),
  activity: () => get<Activity[]>('/activity'),
  pipeline: () => get<PipelineState>('/pipeline'),
  stop: () => post('/stop'),
};
