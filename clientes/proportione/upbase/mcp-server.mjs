#!/usr/bin/env node

/**
 * Upbase MCP Server
 *
 * Exposes Upbase.io CRUD operations as MCP tools for Claude Code and Cowork.
 * Wraps the UpbaseAPI client using the internal REST API.
 *
 * Register in Claude Code:
 *   claude mcp add upbase -- node /path/to/mcp-server.mjs
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { UpbaseAPI } from './upbase-api.mjs';

const server = new McpServer({
  name: 'upbase',
  version: '0.1.0',
});

let api;
async function getApi() {
  if (!api) {
    api = new UpbaseAPI();
    await api.init();
  }
  return api;
}

// ============================================================================
// Tool: upbase_list_projects
// ============================================================================

server.tool(
  'upbase_list_projects',
  'List all projects/lists in the Upbase workspace. Returns ID, name, and type (folder or list) for each.',
  {},
  async () => {
    const client = await getApi();
    const lists = await client.getLists();
    const flat = lists.flatMap(l => {
      const items = [{ id: l.id, name: l.title, type: l.is_folder ? 'folder' : 'list' }];
      if (l.children) l.children.forEach(c => items.push({ id: c.id, name: c.title, parent: l.title, type: 'list' }));
      return items;
    });
    return { content: [{ type: 'text', text: JSON.stringify(flat, null, 2) }] };
  }
);

// ============================================================================
// Tool: upbase_list_tasks
// ============================================================================

server.tool(
  'upbase_list_tasks',
  'List tasks in Upbase. Optionally filter by project/list ID. Returns task ID, title, priority, status, and due date.',
  {
    list_id: z.string().optional().describe('Filter by project/list ID. Use upbase_list_projects to find IDs.'),
    limit: z.number().optional().describe('Max number of tasks to return'),
  },
  async ({ list_id, limit }) => {
    const client = await getApi();
    const tasks = await client.getTasks({ listId: list_id, limit });
    const summary = tasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority || 'none',
      status: t.status === 2 ? 'closed' : 'open',
      due_date: t.due_date || null,
      list_id: t.list_id,
    }));
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  }
);

// ============================================================================
// Tool: upbase_get_task
// ============================================================================

server.tool(
  'upbase_get_task',
  'Get full details of a single Upbase task by ID. Includes description, assignees, tags, subtasks, and comments count.',
  {
    task_id: z.string().describe('The task ID'),
  },
  async ({ task_id }) => {
    const client = await getApi();
    const task = await client.getTask(task_id);
    const detail = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'none',
      status: task.status === 2 ? 'closed' : 'open',
      due_date: task.due_date || null,
      start_date: task.start_date || null,
      assignees: task.users?.assignees?.map(u => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), email: u.email })) || [],
      tags: task.tags?.map(t => ({ id: t.id, title: t.title })) || [],
      subtasks: task.children?.length || 0,
      comment_count: task.comment_count || 0,
      attachment_count: task.attachment_count || 0,
      created_at: task.created_at,
    };
    return { content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }] };
  }
);

// ============================================================================
// Tool: upbase_create_task
// ============================================================================

server.tool(
  'upbase_create_task',
  'Create a new task in Upbase. Requires title and list_id. Returns the created task ID.',
  {
    title: z.string().describe('Task title (required)'),
    list_id: z.string().describe('Project/list ID where the task will be created. Use upbase_list_projects to find IDs.'),
    description: z.string().optional().describe('Task description'),
    priority: z.enum(['', 'low', 'medium', 'high', 'urgent']).optional().describe('Task priority'),
    due_date: z.string().optional().describe('Due date in YYYY-MM-DD format'),
    start_date: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    assignee_ids: z.array(z.string()).optional().describe('Array of user IDs to assign. Use upbase_list_users to find IDs.'),
  },
  async ({ title, list_id, description, priority, due_date, start_date, assignee_ids }) => {
    const client = await getApi();
    const taskData = { title, list_id };
    if (description) taskData.description = description;
    if (priority) taskData.priority = priority;
    if (due_date) taskData.due_date = new Date(due_date).toISOString();
    if (start_date) taskData.start_date = new Date(start_date).toISOString();
    if (assignee_ids) taskData.assignee_ids = assignee_ids;

    const result = await client.createTask(taskData);
    return { content: [{ type: 'text', text: `Task created successfully. ID: ${result}` }] };
  }
);

// ============================================================================
// Tool: upbase_update_task
// ============================================================================

server.tool(
  'upbase_update_task',
  'Update an existing Upbase task. Specify only the fields you want to change.',
  {
    task_id: z.string().describe('The task ID to update'),
    title: z.string().optional().describe('New title'),
    description: z.string().optional().describe('New description'),
    priority: z.enum(['', 'low', 'medium', 'high', 'urgent']).optional().describe('New priority'),
    status: z.enum(['open', 'closed']).optional().describe('Set status: open (1) or closed (2)'),
    due_date: z.string().optional().describe('New due date in YYYY-MM-DD format, or "null" to remove'),
    start_date: z.string().optional().describe('New start date in YYYY-MM-DD format, or "null" to remove'),
    assignee_ids: z.array(z.string()).optional().describe('New assignee IDs (replaces current)'),
  },
  async ({ task_id, title, description, priority, status, due_date, start_date, assignee_ids }) => {
    const client = await getApi();
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status === 'closed' ? 2 : 1;
    if (due_date !== undefined) updates.due_date = due_date === 'null' ? null : new Date(due_date).toISOString();
    if (start_date !== undefined) updates.start_date = start_date === 'null' ? null : new Date(start_date).toISOString();
    if (assignee_ids !== undefined) updates.assignee_ids = assignee_ids;

    await client.updateTask(task_id, updates);
    return { content: [{ type: 'text', text: `Task ${task_id} updated successfully.` }] };
  }
);

// ============================================================================
// Tool: upbase_delete_task
// ============================================================================

server.tool(
  'upbase_delete_task',
  'Delete a task from Upbase. This action cannot be undone.',
  {
    task_id: z.string().describe('The task ID to delete'),
  },
  async ({ task_id }) => {
    const client = await getApi();
    await client.deleteTask(task_id);
    return { content: [{ type: 'text', text: `Task ${task_id} deleted successfully.` }] };
  }
);

// ============================================================================
// Tool: upbase_list_users
// ============================================================================

server.tool(
  'upbase_list_users',
  'List all users in the Upbase organization. Returns user IDs, names, and emails.',
  {},
  async () => {
    const client = await getApi();
    const users = await client.getUsers();
    const summary = users.map(u => ({
      id: u.id,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || '(unnamed)',
      email: u.email,
    }));
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  }
);

// ============================================================================
// Tool: upbase_list_tags
// ============================================================================

server.tool(
  'upbase_list_tags',
  'List all tags in the Upbase organization.',
  {},
  async () => {
    const client = await getApi();
    const tags = await client.getTags();
    const summary = tags.map(t => ({ id: t.id, title: t.title, color: t.color }));
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  }
);

// ============================================================================
// Tool: upbase_list_stages
// ============================================================================

server.tool(
  'upbase_list_stages',
  'List stages (Kanban columns) for a project/list. Returns stage IDs, titles, and colors.',
  {
    list_id: z.string().describe('The project/list ID'),
  },
  async ({ list_id }) => {
    const client = await getApi();
    const stages = await client.getStages(list_id);
    const summary = stages.map(s => ({ id: s.id, title: s.title, color: s.color }));
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  }
);

// ============================================================================
// Start server
// ============================================================================

const transport = new StdioServerTransport();
await server.connect(transport);
