/**
 * Per-project token + cost tracking.
 *
 * Each agent turn writes one JSON line to data/projects/<id>/usage.jsonl.
 * Using append-only JSONL (not JSON array) keeps concurrent writes safe and
 * makes the file cheap to tail, while still trivial to parse.
 */
import fs from 'fs';
import path from 'path';
import { AgentRole, UsageEntry, TokenUsage } from './models/types.js';

const PROJECTS_DIR = path.resolve('data/projects');

function usagePath(projectId: string): string {
  return path.join(PROJECTS_DIR, projectId, 'usage.jsonl');
}

export function recordUsage(
  projectId: string,
  params: {
    day: number;
    role: AgentRole;
    name: string;
    taskId?: string;
    usage: TokenUsage;
  },
): void {
  const entry: UsageEntry = {
    project_id: projectId,
    day: params.day,
    role: params.role,
    name: params.name,
    task_id: params.taskId,
    timestamp: new Date().toISOString(),
    ...params.usage,
  };
  const p = usagePath(projectId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(entry) + '\n');
}

export function readUsage(projectId: string): UsageEntry[] {
  const p = usagePath(projectId);
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, 'utf-8').split('\n');
  const entries: UsageEntry[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try { entries.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return entries;
}

export interface UsageSummary {
  total: TokenUsage & { calls: number };
  by_agent: Array<{
    role: AgentRole;
    name: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
    total_cost_usd: number;
  }>;
  by_day: Array<{ day: number; total_cost_usd: number; calls: number }>;
  recent: UsageEntry[];
}

export function summarizeUsage(projectId: string): UsageSummary {
  const entries = readUsage(projectId);
  const total = {
    calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    total_cost_usd: 0,
    duration_ms: 0,
  };

  const byAgentMap = new Map<AgentRole, UsageSummary['by_agent'][number]>();
  const byDayMap = new Map<number, { day: number; total_cost_usd: number; calls: number }>();

  for (const e of entries) {
    total.calls += 1;
    total.input_tokens += e.input_tokens;
    total.output_tokens += e.output_tokens;
    total.cache_creation_input_tokens += e.cache_creation_input_tokens;
    total.cache_read_input_tokens += e.cache_read_input_tokens;
    total.total_cost_usd += e.total_cost_usd;
    total.duration_ms += e.duration_ms;

    let agent = byAgentMap.get(e.role);
    if (!agent) {
      agent = {
        role: e.role,
        name: e.name,
        calls: 0,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        total_cost_usd: 0,
      };
      byAgentMap.set(e.role, agent);
    }
    agent.calls += 1;
    agent.input_tokens += e.input_tokens;
    agent.output_tokens += e.output_tokens;
    agent.cache_read_input_tokens += e.cache_read_input_tokens;
    agent.cache_creation_input_tokens += e.cache_creation_input_tokens;
    agent.total_cost_usd += e.total_cost_usd;

    let day = byDayMap.get(e.day);
    if (!day) {
      day = { day: e.day, total_cost_usd: 0, calls: 0 };
      byDayMap.set(e.day, day);
    }
    day.total_cost_usd += e.total_cost_usd;
    day.calls += 1;
  }

  return {
    total,
    by_agent: [...byAgentMap.values()].sort((a, b) => b.total_cost_usd - a.total_cost_usd),
    by_day: [...byDayMap.values()].sort((a, b) => a.day - b.day),
    recent: entries.slice(-20).reverse(),
  };
}
