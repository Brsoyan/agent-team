#!/usr/bin/env tsx
/**
 * Board CLI — Agents call this from Bash to interact with the task board.
 *
 * Usage:
 *   npx tsx src/board-cli.ts list [--assignee pm] [--status backlog,todo]
 *   npx tsx src/board-cli.ts get TASK-1
 *   npx tsx src/board-cli.ts create --title "..." --desc "..." --type feature --status backlog --priority high --assignee pm
 *   npx tsx src/board-cli.ts update TASK-1 --status spec_review --assignee critic
 *   npx tsx src/board-cli.ts comment TASK-1 --author pm --content "..."
 *   npx tsx src/board-cli.ts link TASK-1 --file specs/subscription.md
 *   npx tsx src/board-cli.ts info
 */
import { TaskBoard } from './models/board.js';
import { AgentRole, TaskStatus, TaskType, Priority } from './models/types.js';
import { projectBoardPath } from './models/project.js';

const args = process.argv.slice(2);

// Extract --project flag
const projIdx = args.indexOf('--project');
let boardPath: string | undefined;
if (projIdx !== -1 && projIdx + 1 < args.length) {
  boardPath = projectBoardPath(args[projIdx + 1]);
  args.splice(projIdx, 2); // remove --project and its value
}

const board = new TaskBoard(boardPath);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

switch (command) {
  case 'list': {
    const filter: Record<string, unknown> = {};
    const assignee = getFlag('assignee');
    const status = getFlag('status');
    const type = getFlag('type');
    const created_by = getFlag('created-by');

    if (assignee) filter.assignee = assignee;
    if (status) {
      const s = status.split(',');
      filter.status = s.length === 1 ? s[0] : s;
    }
    if (type) {
      const t = type.split(',');
      filter.type = t.length === 1 ? t[0] : t;
    }
    if (created_by) filter.created_by = created_by;

    const tasks = board.listTasks(filter as any);
    if (tasks.length === 0) {
      console.log('No tasks found.');
    } else {
      for (const t of tasks) {
        console.log(`${t.id} | ${t.status} | ${t.type} | ${t.priority} | ${t.assignee} | ${t.title}`);
        if (t.linked_files.length > 0) {
          console.log(`  Files: ${t.linked_files.join(', ')}`);
        }
        if (t.comments.length > 0) {
          console.log(`  Comments: ${t.comments.length}`);
        }
      }
    }
    break;
  }

  case 'get': {
    const taskId = args[1];
    const task = board.getTask(taskId);
    if (!task) {
      console.log(`Task ${taskId} not found.`);
    } else {
      console.log(JSON.stringify(task, null, 2));
    }
    break;
  }

  case 'create': {
    const title = getFlag('title');
    const desc = getFlag('desc') || getFlag('description') || '';
    const type = (getFlag('type') || 'feature') as TaskType;
    const status = (getFlag('status') || 'backlog') as TaskStatus;
    const priority = (getFlag('priority') || 'medium') as Priority;
    const assignee = (getFlag('assignee') || 'pm') as AgentRole;
    const created_by = (getFlag('created-by') || assignee) as AgentRole;
    const parent = getFlag('parent');

    if (!title) {
      console.error('Error: --title is required');
      process.exit(1);
    }

    const task = board.createTask({
      title,
      description: desc,
      type,
      status,
      priority,
      assignee,
      created_by,
      parent_task_id: parent,
    });
    console.log(`Created ${task.id}: ${task.title}`);
    break;
  }

  case 'update': {
    const taskId = args[1];
    if (!taskId) {
      console.error('Error: task ID is required');
      process.exit(1);
    }
    const updates: Record<string, unknown> = {};
    const status = getFlag('status');
    const assignee = getFlag('assignee');
    const priority = getFlag('priority');
    if (status) updates.status = status;
    if (assignee) updates.assignee = assignee;
    if (priority) updates.priority = priority;

    const task = board.updateTask(taskId, updates as any);
    if (!task) {
      console.log(`Task ${taskId} not found.`);
    } else {
      console.log(`Updated ${task.id}: status=${task.status}, assignee=${task.assignee}`);
    }
    break;
  }

  case 'comment': {
    const taskId = args[1];
    const author = (getFlag('author') || 'pm') as AgentRole;
    const content = getFlag('content');
    if (!taskId || !content) {
      console.error('Error: task ID and --content are required');
      process.exit(1);
    }
    const comment = board.addComment(taskId, author, content);
    if (!comment) {
      console.log(`Task ${taskId} not found.`);
    } else {
      console.log(`Comment added to ${taskId} by ${author}.`);
    }
    break;
  }

  case 'link': {
    const taskId = args[1];
    const file = getFlag('file');
    if (!taskId || !file) {
      console.error('Error: task ID and --file are required');
      process.exit(1);
    }
    board.addLinkedFile(taskId, file);
    console.log(`Linked ${file} to ${taskId}.`);
    break;
  }

  case 'info': {
    const state = board.getState();
    console.log(`Project: ${state.project_name}`);
    console.log(`Description: ${state.project_description}`);
    console.log(`Day: ${state.day}`);
    console.log(`Total tasks: ${state.tasks.length}`);
    break;
  }

  default:
    console.log('Usage: board-cli.ts <list|get|create|update|comment|link|info> [args]');
}
