#!/usr/bin/env node

/**
 * Upbase Tasks CLI
 *
 * Usage:
 *   node tasks.mjs list [--list <id>] [--limit <n>]
 *   node tasks.mjs show <taskId>
 *   node tasks.mjs create --title "..." --list <id> [--priority low|medium|high|urgent] [--assignee <userId>] [--due <date>] [--description "..."]
 *   node tasks.mjs update <taskId> [--title "..."] [--priority ...] [--status open|closed] [--due <date>]
 *   node tasks.mjs delete <taskId>
 *   node tasks.mjs projects
 *   node tasks.mjs stages <listId>
 */

import { UpbaseAPI } from './upbase-api.mjs';
import { parseArgs } from 'node:util';

const PRIORITY_MAP = { none: '', low: 'low', medium: 'medium', high: 'high', urgent: 'urgent' };
const STATUS_MAP = { open: 1, closed: 2 };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function priorityLabel(p) {
  if (!p) return '—';
  return { low: 'Low', medium: 'Med', high: 'High', urgent: 'URGENT' }[p] || p;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`Upbase Tasks CLI

Commands:
  list [--list <id>] [--limit <n>]    List tasks (optionally filtered by list)
  show <taskId>                        Show task detail
  create --title "..." --list <id>     Create a task
    [--priority low|medium|high|urgent]
    [--assignee <userId>]
    [--due YYYY-MM-DD]
    [--start YYYY-MM-DD]
    [--description "..."]
  update <taskId> [--title "..."]      Update a task
    [--priority none|low|medium|high|urgent]
    [--status open|closed]
    [--due YYYY-MM-DD]
  delete <taskId>                      Delete a task
  projects                             List all projects/lists
  stages <listId>                      List stages/columns of a list`);
    return;
  }

  const api = new UpbaseAPI();
  await api.init();

  switch (command) {
    case 'list':
    case 'ls': {
      const { values } = parseArgs({
        args: args.slice(1),
        options: {
          list: { type: 'string', short: 'l' },
          limit: { type: 'string', short: 'n' },
        },
        strict: false,
      });
      const tasks = await api.getTasks({
        listId: values.list,
        limit: values.limit ? parseInt(values.limit) : undefined,
      });
      if (!tasks.length) {
        console.log('No tasks found.');
        return;
      }
      console.log(`${tasks.length} tasks:\n`);
      console.table(tasks.map(t => ({
        id: t.id,
        title: (t.title || '').substring(0, 55),
        priority: priorityLabel(t.priority),
        status: t.status === 2 ? 'Closed' : 'Open',
        due: formatDate(t.due_date),
      })));
      break;
    }

    case 'show':
    case 'get': {
      const taskId = args[1];
      if (!taskId) { console.error('Usage: tasks.mjs show <taskId>'); process.exit(1); }
      const task = await api.getTask(taskId);
      console.log(`
Title:       ${task.title}
ID:          ${task.id}
Status:      ${task.status === 2 ? 'Closed' : 'Open'}
Priority:    ${priorityLabel(task.priority)}
Due:         ${formatDate(task.due_date)}
Start:       ${formatDate(task.start_date)}
Created:     ${formatDate(task.created_at)}
Description: ${task.description || '(none)'}
Assignees:   ${task.users?.assignees?.map(u => `${u.first_name} ${u.last_name}`.trim() || u.email).join(', ') || '(none)'}
Tags:        ${task.tags?.map(t => t.title).join(', ') || '(none)'}
Subtasks:    ${task.children?.length || 0}
Comments:    ${task.comment_count || 0}
Attachments: ${task.attachment_count || 0}
`);
      break;
    }

    case 'create':
    case 'new': {
      const { values } = parseArgs({
        args: args.slice(1),
        options: {
          title: { type: 'string', short: 't' },
          list: { type: 'string', short: 'l' },
          priority: { type: 'string', short: 'p' },
          assignee: { type: 'string', short: 'a' },
          due: { type: 'string', short: 'd' },
          start: { type: 'string', short: 's' },
          description: { type: 'string' },
        },
        strict: false,
      });
      if (!values.title || !values.list) {
        console.error('Required: --title and --list');
        process.exit(1);
      }
      const taskData = {
        title: values.title,
        list_id: values.list,
      };
      if (values.priority) taskData.priority = PRIORITY_MAP[values.priority] ?? values.priority;
      if (values.assignee) taskData.assignee_ids = [values.assignee];
      if (values.due) taskData.due_date = new Date(values.due).toISOString();
      if (values.start) taskData.start_date = new Date(values.start).toISOString();
      if (values.description) taskData.description = values.description;

      const result = await api.createTask(taskData);
      console.log(`Task created: ${result}`);
      break;
    }

    case 'update':
    case 'edit': {
      const taskId = args[1];
      if (!taskId) { console.error('Usage: tasks.mjs update <taskId> [--title ...] [--priority ...] [--status ...]'); process.exit(1); }
      const { values } = parseArgs({
        args: args.slice(2),
        options: {
          title: { type: 'string', short: 't' },
          priority: { type: 'string', short: 'p' },
          status: { type: 'string', short: 's' },
          due: { type: 'string', short: 'd' },
          description: { type: 'string' },
        },
        strict: false,
      });
      const updates = {};
      if (values.title) updates.title = values.title;
      if (values.priority) updates.priority = PRIORITY_MAP[values.priority] ?? values.priority;
      if (values.status) updates.status = STATUS_MAP[values.status] ?? parseInt(values.status);
      if (values.due) updates.due_date = new Date(values.due).toISOString();
      if (values.description) updates.description = values.description;

      if (!Object.keys(updates).length) {
        console.error('No updates specified.');
        process.exit(1);
      }
      await api.updateTask(taskId, updates);
      console.log(`Task ${taskId} updated.`);
      break;
    }

    case 'delete':
    case 'rm': {
      const taskId = args[1];
      if (!taskId) { console.error('Usage: tasks.mjs delete <taskId>'); process.exit(1); }
      await api.deleteTask(taskId);
      console.log(`Task ${taskId} deleted.`);
      break;
    }

    case 'projects':
    case 'lists': {
      const lists = await api.getLists();
      const flat = lists.flatMap(l => {
        const items = [{ id: l.id, name: l.title, type: l.is_folder ? 'folder' : 'list' }];
        if (l.children) l.children.forEach(c => items.push({ id: c.id, name: `  └ ${c.title}`, type: 'list' }));
        return items;
      });
      console.table(flat);
      break;
    }

    case 'stages':
    case 'columns': {
      const listId = args[1];
      if (!listId) { console.error('Usage: tasks.mjs stages <listId>'); process.exit(1); }
      const stages = await api.getStages(listId);
      console.table(stages.map(s => ({ id: s.id, title: s.title, color: s.color })));
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Use --help for usage.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
