/**
 * Global event bus for agent progress.
 * Dashboard reads from here to show real-time state.
 */
import { PIPELINE } from './agents/pipeline.js';

export interface AgentEvent {
  time: string;
  type: 'day_start' | 'agent_start' | 'agent_working' | 'agent_done' | 'agent_skip' | 'day_done' | 'error' | 'info';
  agent: string;    // role or 'system'
  agentName: string; // human name
  message: string;
  day?: number;
}

export interface PipelineState {
  running: boolean;
  currentDay: number;
  currentAgent: string;
  currentAgentName: string;
  agents: {
    role: string;
    name: string;
    title: string;
    status: 'waiting' | 'running' | 'done' | 'skipped' | 'error';
    summary: string;
  }[];
  events: AgentEvent[];
}

const MAX_EVENTS = 100;

// Per-project pipeline state
const projectStates = new Map<string, PipelineState>();
let activeProjectId = '';

function getOrCreate(projectId: string): PipelineState {
  if (!projectStates.has(projectId)) {
    projectStates.set(projectId, {
      running: false, currentDay: 0, currentAgent: '', currentAgentName: '',
      agents: [], events: [],
    });
  }
  return projectStates.get(projectId)!;
}

// Legacy global state — points to active project
let state: PipelineState = {
  running: false, currentDay: 0, currentAgent: '', currentAgentName: '',
  agents: [], events: [],
};

function emit(event: AgentEvent) {
  state.events.push(event);
  if (state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);
}

export function getState(projectId?: string): PipelineState {
  if (projectId) return getOrCreate(projectId);
  return state;
}

export function resetPipeline(day: number, projectId?: string) {
  const fresh: PipelineState = {
    running: true,
    currentDay: day,
    currentAgent: '',
    currentAgentName: '',
    agents: PIPELINE.map(e => ({
      role: e.role,
      name: e.name,
      title: e.title,
      status: 'waiting' as const,
      summary: '',
    })),
    events: projectId ? getOrCreate(projectId).events : state.events,
  };
  if (projectId) {
    projectStates.set(projectId, fresh);
    activeProjectId = projectId;
  }
  state = fresh;
  emit({ time: new Date().toISOString(), type: 'day_start', agent: 'system', agentName: 'System', message: `Day ${day} started`, day });
}

export function agentStart(role: string, name: string, pendingCount: number) {
  state.currentAgent = role;
  state.currentAgentName = name;
  const a = state.agents.find(x => x.role === role);
  if (a) a.status = 'running';
  emit({ time: new Date().toISOString(), type: 'agent_start', agent: role, agentName: name, message: `Starting work (${pendingCount} tasks pending)` });
}

export function agentWorking(role: string, name: string, message: string) {
  emit({ time: new Date().toISOString(), type: 'agent_working', agent: role, agentName: name, message });
}

export function agentDone(role: string, name: string, summary: string) {
  state.currentAgent = '';
  state.currentAgentName = '';
  const a = state.agents.find(x => x.role === role);
  if (a) { a.status = 'done'; a.summary = summary.substring(0, 200); }
  emit({ time: new Date().toISOString(), type: 'agent_done', agent: role, agentName: name, message: summary.substring(0, 200) });
}

export function agentSkip(role: string, name: string) {
  const a = state.agents.find(x => x.role === role);
  if (a) a.status = 'skipped';
  emit({ time: new Date().toISOString(), type: 'agent_skip', agent: role, agentName: name, message: 'No pending tasks, skipped' });
}

export function agentError(role: string, name: string, error: string) {
  const a = state.agents.find(x => x.role === role);
  if (a) { a.status = 'error'; a.summary = error; }
  emit({ time: new Date().toISOString(), type: 'error', agent: role, agentName: name, message: error });
}

export function dayDone(day: number) {
  state.running = false;
  state.currentAgent = '';
  state.currentAgentName = '';
  emit({ time: new Date().toISOString(), type: 'day_done', agent: 'system', agentName: 'System', message: `Day ${day} complete`, day });
}

export function pipelineIdle() {
  state.running = false;
  state.currentAgent = '';
  state.currentAgentName = '';
}
