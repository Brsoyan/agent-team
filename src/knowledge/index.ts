import { AgentRole } from '../models/types.js';
import { getGlobalKnowledge } from './global.js';
import { getProjectKnowledge } from './project.js';
import { getSDKContext } from './sdk-context.js';
import { getProjectAgents } from '../agents/factory.js';

// Re-export for backwards compat
export { getProjectKnowledge, addProjectKnowledge, deleteProjectKnowledge } from './project.js';
export { getGlobalKnowledge, listGlobalKnowledgeFiles, readGlobalKnowledgeFile, writeGlobalKnowledgeFile } from './global.js';
export { getSDKContext } from './sdk-context.js';

/**
 * Build the full knowledge context for an agent in a project.
 * Combines: global knowledge + SDK context + project knowledge + agent skills.
 */
export function buildAgentContext(projectId: string, role: AgentRole): string {
  const parts: string[] = [];

  // 1. Global knowledge (design system, tech stack, etc.)
  const global = getGlobalKnowledge(role);
  if (global) parts.push(global);

  // 2. SDK-specific context for this role
  const sdk = getSDKContext(role);
  if (sdk) parts.push(sdk);

  // 3. Project-specific knowledge
  const projectKnowledge = getProjectKnowledge(projectId);
  const myKnowledge = projectKnowledge.filter(e => e.agent === role || e.agent === 'all');
  if (myKnowledge.length > 0) {
    parts.push(
      '# Project Knowledge\n' +
      myKnowledge.map(e => `- [${e.topic}]: ${e.content}`).join('\n')
    );
  }

  // 4. Agent skills (accumulated learnings + any imported skills)
  const agents = getProjectAgents(projectId);
  const agent = agents.find(a => a.role === role);
  if (agent && agent.skills.length > 0) {
    parts.push(
      '# Your Skills & Learnings\n' +
      agent.skills.map(s => `- ${s}`).join('\n')
    );
  }

  return parts.join('\n\n---\n\n');
}
