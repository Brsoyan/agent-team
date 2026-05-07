import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const WORKSPACE_ROOT = path.resolve('workspace');

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  created_at: string;
}

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

function loadList(): ProjectInfo[] {
  ensureDirs();
  if (!fs.existsSync(PROJECTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
}

function saveList(list: ProjectInfo[]) {
  ensureDirs();
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(list, null, 2));
}

function makeId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 30);
  return slug + '-' + Date.now().toString(36).slice(-4);
}

export function listProjects(): ProjectInfo[] {
  return loadList();
}

export function getProject(id: string): ProjectInfo | undefined {
  return loadList().find(p => p.id === id);
}

export function createProject(name: string, description: string, sdkConfig?: Record<string, string>): ProjectInfo {
  const list = loadList();
  const project: ProjectInfo = {
    id: makeId(name),
    name,
    description,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  list.push(project);
  saveList(list);

  // Create project dirs
  const projData = path.join(PROJECTS_DIR, project.id);
  fs.mkdirSync(projData, { recursive: true });
  fs.mkdirSync(path.join(projData, 'logs'), { recursive: true });

  // Save SDK config if provided
  if (sdkConfig && Object.values(sdkConfig).some(v => v)) {
    fs.writeFileSync(path.join(projData, 'sdk-config.json'), JSON.stringify(sdkConfig, null, 2));
  }

  const projWorkspace = path.join(WORKSPACE_ROOT, project.id);
  for (const dir of ['specs', 'designs', 'code', 'tests', 'reviews', 'bugs']) {
    fs.mkdirSync(path.join(projWorkspace, dir), { recursive: true });
  }

  return project;
}

export function deleteProject(id: string): void {
  const list = loadList().filter(p => p.id !== id);
  saveList(list);

  const projData = path.join(PROJECTS_DIR, id);
  if (fs.existsSync(projData)) fs.rmSync(projData, { recursive: true });

  const projWorkspace = path.join(WORKSPACE_ROOT, id);
  if (fs.existsSync(projWorkspace)) fs.rmSync(projWorkspace, { recursive: true });
}

// ── Paths for a specific project ──

export function projectBoardPath(id: string): string {
  return path.join(PROJECTS_DIR, id, 'board.json');
}

export function projectLogsDir(id: string): string {
  return path.join(PROJECTS_DIR, id, 'logs');
}

export function projectWorkspaceDir(id: string): string {
  return path.join(WORKSPACE_ROOT, id);
}
