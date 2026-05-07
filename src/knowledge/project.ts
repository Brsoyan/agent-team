import fs from 'fs';
import path from 'path';
import { projectBoardPath } from '../models/project.js';

/**
 * File-based knowledge store — lives INSIDE each project folder.
 *
 * data/projects/{id}/knowledge.json  — project-specific
 * data/knowledge-general.json        — shared across all projects
 */

export interface KnowledgeEntry {
  agent: string;
  topic: string;
  content: string;
  timestamp: string;
}

const GENERAL_PATH = path.resolve('data/knowledge-general.json');

function loadFile(filePath: string): KnowledgeEntry[] {
  if (!fs.existsSync(filePath)) return [];
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return []; }
}

function saveFile(filePath: string, entries: KnowledgeEntry[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
}

// Path inside project folder
function projectKnowledgePath(projectId: string): string {
  // board.json is at data/projects/{id}/board.json — knowledge goes next to it
  return path.join(path.dirname(projectBoardPath(projectId)), 'knowledge.json');
}

// ── General knowledge (shared) ──

export function getGeneralKnowledge(): KnowledgeEntry[] {
  return loadFile(GENERAL_PATH);
}

export function addGeneralKnowledge(agent: string, topic: string, content: string) {
  const entries = loadFile(GENERAL_PATH);
  entries.push({ agent, topic, content, timestamp: new Date().toISOString() });
  saveFile(GENERAL_PATH, entries.slice(-100));
}

// ── Project knowledge (inside project folder) ──

export function getProjectKnowledge(projectId: string): KnowledgeEntry[] {
  return loadFile(projectKnowledgePath(projectId));
}

export function addProjectKnowledge(projectId: string, agent: string, topic: string, content: string) {
  const entries = loadFile(projectKnowledgePath(projectId));
  entries.push({ agent, topic, content, timestamp: new Date().toISOString() });
  saveFile(projectKnowledgePath(projectId), entries.slice(-100));
}

export function getKnowledgeForAgent(projectId: string, agent: string): string {
  const general = getGeneralKnowledge().filter(e => e.agent === agent || e.agent === 'all');
  const project = getProjectKnowledge(projectId).filter(e => e.agent === agent || e.agent === 'all');
  if (general.length === 0 && project.length === 0) return '';
  let text = '';
  if (general.length > 0) {
    text += '## General Knowledge\n' + general.map(e => `- [${e.topic}]: ${e.content}`).join('\n') + '\n\n';
  }
  if (project.length > 0) {
    text += '## Project Knowledge\n' + project.map(e => `- [${e.topic}]: ${e.content}`).join('\n') + '\n';
  }
  return text;
}

export function deleteProjectKnowledge(projectId: string) {
  const p = projectKnowledgePath(projectId);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
