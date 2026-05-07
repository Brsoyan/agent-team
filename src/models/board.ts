import fs from 'fs';
import path from 'path';
import { BoardState, Task, TaskStatus, TaskType, Priority, AgentRole, Comment } from './types.js';
import { pickUpMap } from '../agents/pipeline.js';

const DEFAULT_BOARD_PATH = path.resolve('data/board.json');

export class TaskBoard {
  private state: BoardState;
  private boardPath: string;

  constructor(boardPath?: string) {
    this.boardPath = boardPath || DEFAULT_BOARD_PATH;
    this.state = this.load();
  }

  private load(): BoardState {
    if (fs.existsSync(this.boardPath)) {
      return JSON.parse(fs.readFileSync(this.boardPath, 'utf-8'));
    }
    return {
      project_name: '',
      project_description: '',
      day: 0,
      tasks: [],
    };
  }

  save(): void {
    fs.mkdirSync(path.dirname(this.boardPath), { recursive: true });
    fs.writeFileSync(this.boardPath, JSON.stringify(this.state, null, 2));
  }

  getState(): BoardState {
    return this.state;
  }

  setProject(name: string, description: string): void {
    this.state.project_name = name;
    this.state.project_description = description;
    this.save();
  }

  incrementDay(): number {
    this.state.day += 1;
    this.save();
    return this.state.day;
  }

  getDay(): number {
    return this.state.day;
  }

  // ── Task CRUD ──

  private nextId(): string {
    const max = this.state.tasks.reduce((m, t) => {
      const num = parseInt(t.id.split('-')[1], 10);
      return num > m ? num : m;
    }, 0);
    return `TASK-${max + 1}`;
  }

  createTask(params: {
    title: string;
    description: string;
    type: TaskType;
    status: TaskStatus;
    priority: Priority;
    assignee: AgentRole;
    created_by: AgentRole;
    parent_task_id?: string;
    linked_files?: string[];
  }): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: this.nextId(),
      title: params.title,
      description: params.description,
      type: params.type,
      status: params.status,
      priority: params.priority,
      assignee: params.assignee,
      created_by: params.created_by,
      linked_files: params.linked_files ?? [],
      comments: [],
      parent_task_id: params.parent_task_id,
      created_at: now,
      updated_at: now,
    };
    this.state.tasks.push(task);
    this.save();
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.state.tasks.find(t => t.id === id);
  }

  updateTask(id: string, updates: Partial<Pick<Task, 'status' | 'assignee' | 'priority' | 'description' | 'linked_files'>>): Task | undefined {
    const task = this.state.tasks.find(t => t.id === id);
    if (!task) return undefined;
    Object.assign(task, updates, { updated_at: new Date().toISOString() });
    this.save();
    return task;
  }

  addComment(taskId: string, author: AgentRole, content: string): Comment | undefined {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return undefined;
    const comment: Comment = {
      id: `C-${Date.now()}`,
      author,
      content,
      timestamp: new Date().toISOString(),
    };
    task.comments.push(comment);
    task.updated_at = new Date().toISOString();
    this.save();
    return comment;
  }

  addLinkedFile(taskId: string, filePath: string): void {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (task && !task.linked_files.includes(filePath)) {
      task.linked_files.push(filePath);
      this.save();
    }
  }

  // ── Queries ──

  listTasks(filter?: {
    assignee?: AgentRole;
    status?: TaskStatus | TaskStatus[];
    type?: TaskType | TaskType[];
    created_by?: AgentRole;
  }): Task[] {
    let tasks = this.state.tasks;
    if (filter?.assignee) {
      tasks = tasks.filter(t => t.assignee === filter.assignee);
    }
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      tasks = tasks.filter(t => statuses.includes(t.status));
    }
    if (filter?.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      tasks = tasks.filter(t => types.includes(t.type));
    }
    if (filter?.created_by) {
      tasks = tasks.filter(t => t.created_by === filter.created_by);
    }
    return tasks;
  }

  getTasksForAgent(role: AgentRole): Task[] {
    return this.state.tasks.filter(t => t.assignee === role);
  }

  getPendingTasks(role: AgentRole): Task[] {
    // Statuses this role picks up are declared in PIPELINE (agents/pipeline.ts).
    // Key: when a task is sent BACK (e.g. critic → pm), the assignee changes
    // but status may stay the same — this filter matches on BOTH so nothing is missed.
    const statuses = pickUpMap()[role] ?? [];
    return this.state.tasks.filter(
      t => t.assignee === role && statuses.includes(t.status)
    );
  }

  // ── Reset ──

  reset(): void {
    this.state = {
      project_name: '',
      project_description: '',
      day: 0,
      tasks: [],
    };
    this.save();
  }
}
