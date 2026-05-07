import fs from 'fs';
import path from 'path';
import { AgentRole } from '../models/types.js';

const GLOBAL_DIR = path.resolve('data/global-knowledge');

/**
 * Reads all .md files from data/global-knowledge/ and returns them as context.
 * Optionally filters by role relevance.
 */
export function getGlobalKnowledge(role?: AgentRole): string {
  if (!fs.existsSync(GLOBAL_DIR)) return '';

  const files = fs.readdirSync(GLOBAL_DIR).filter(f => f.endsWith('.md')).sort();
  if (files.length === 0) return '';

  const sections: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(GLOBAL_DIR, file), 'utf-8');
    sections.push(content);
  }

  return '# Global Knowledge (shared across all projects)\n\n' + sections.join('\n\n---\n\n');
}

/**
 * List available global knowledge files.
 */
export function listGlobalKnowledgeFiles(): { name: string; path: string }[] {
  if (!fs.existsSync(GLOBAL_DIR)) return [];
  return fs.readdirSync(GLOBAL_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ name: f.replace('.md', ''), path: f }));
}

/**
 * Read a single global knowledge file.
 */
export function readGlobalKnowledgeFile(filename: string): string | null {
  const p = path.join(GLOBAL_DIR, filename);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf-8');
}

/**
 * Write/update a global knowledge file.
 */
export function writeGlobalKnowledgeFile(filename: string, content: string): void {
  fs.mkdirSync(GLOBAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(GLOBAL_DIR, filename), content);
}
