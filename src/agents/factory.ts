import fs from 'fs';
import path from 'path';
import { AgentRole } from '../models/types.js';
import { ALL_AGENTS } from './index.js';

const PROJECTS_DIR = path.resolve('data/projects');

export interface ProjectAgent {
  role: AgentRole;
  name: string;
  title: string;
  system_prompt: string;
  skills: string[];       // Learnings this agent accumulated
  imported_from?: string; // If skills were imported from another project
}

export interface ProjectAgents {
  agents: ProjectAgent[];
}

function agentsPath(projectId: string): string {
  return path.join(PROJECTS_DIR, projectId, 'agents.json');
}

/**
 * Get agents for a project. Creates fresh ones from base templates if none exist.
 * If PIPELINE was extended after the project was created (e.g. a new gate added),
 * the missing entries are merged in so old projects automatically gain them.
 */
export function getProjectAgents(projectId: string): ProjectAgent[] {
  const p = agentsPath(projectId);
  if (!fs.existsSync(p)) {
    const fresh = createFreshAgents();
    saveProjectAgents(projectId, fresh);
    return fresh;
  }

  const data: ProjectAgents = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const existingRoles = new Set(data.agents.map(a => a.role));
  const fresh = createFreshAgents();
  const missing = fresh.filter(a => !existingRoles.has(a.role));
  if (missing.length === 0) return data.agents;

  // Preserve the pipeline order from ALL_AGENTS, not the saved order.
  const byRole = new Map(data.agents.map(a => [a.role, a]));
  const merged = fresh.map(base => byRole.get(base.role) ?? base);
  saveProjectAgents(projectId, merged);
  return merged;
}

/**
 * Create fresh agent instances from base templates.
 */
export function createFreshAgents(): ProjectAgent[] {
  return ALL_AGENTS.map(a => ({
    role: a.role,
    name: a.name,
    title: a.title,
    system_prompt: a.systemPrompt,
    skills: [],
  }));
}

/**
 * Save agents for a project.
 */
export function saveProjectAgents(projectId: string, agents: ProjectAgent[]): void {
  const p = agentsPath(projectId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ agents }, null, 2));
}

/**
 * Add a skill/learning to a project agent.
 */
export function addAgentSkill(projectId: string, role: AgentRole, skill: string): void {
  const agents = getProjectAgents(projectId);
  const agent = agents.find(a => a.role === role);
  if (agent) {
    agent.skills.push(skill);
    // Keep last 50 skills
    if (agent.skills.length > 50) agent.skills = agent.skills.slice(-50);
    saveProjectAgents(projectId, agents);
  }
}

/**
 * Import skills from an agent in another project.
 * Copies that agent's skills into the target project's agent.
 */
export function importAgentSkills(
  targetProjectId: string,
  sourceProjectId: string,
  role: AgentRole
): { imported: number } {
  const sourceAgents = getProjectAgents(sourceProjectId);
  const sourceAgent = sourceAgents.find(a => a.role === role);
  if (!sourceAgent || sourceAgent.skills.length === 0) {
    return { imported: 0 };
  }

  const targetAgents = getProjectAgents(targetProjectId);
  const targetAgent = targetAgents.find(a => a.role === role);
  if (!targetAgent) return { imported: 0 };

  // Add source skills with a prefix
  const newSkills = sourceAgent.skills.map(
    s => `[from ${sourceProjectId}]: ${s}`
  );
  targetAgent.skills.push(...newSkills);
  targetAgent.imported_from = sourceProjectId;
  saveProjectAgents(targetProjectId, targetAgents);

  return { imported: newSkills.length };
}

/**
 * Update a project agent's name or title (customization).
 */
export function updateProjectAgent(
  projectId: string,
  role: AgentRole,
  updates: { name?: string; title?: string }
): void {
  const agents = getProjectAgents(projectId);
  const agent = agents.find(a => a.role === role);
  if (agent) {
    if (updates.name) agent.name = updates.name;
    if (updates.title) agent.title = updates.title;
    saveProjectAgents(projectId, agents);
  }
}

/**
 * List all projects that have agents with skills (for import picker).
 */
export function listProjectsWithSkills(): { projectId: string; agents: { role: AgentRole; name: string; skillCount: number }[] }[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  const result: { projectId: string; agents: { role: AgentRole; name: string; skillCount: number }[] }[] = [];

  for (const dir of fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const p = path.join(PROJECTS_DIR, dir.name, 'agents.json');
    if (!fs.existsSync(p)) continue;

    const data: ProjectAgents = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const agentsWithSkills = data.agents
      .filter(a => a.skills.length > 0)
      .map(a => ({ role: a.role, name: a.name, skillCount: a.skills.length }));

    if (agentsWithSkills.length > 0) {
      result.push({ projectId: dir.name, agents: agentsWithSkills });
    }
  }

  return result;
}
