#!/usr/bin/env node

/**
 * Upbase API Client
 *
 * Wraps the internal REST API at api.upbase.io/v1/.
 * Auth via JWT Bearer token extracted from storage state (Playwright login).
 *
 * WARNING: Uses undocumented internal API. May break with Upbase updates.
 *
 * @version 0.1.0
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCRIPT_DIR = import.meta.dirname;
const DEFAULT_STORAGE_PATH = resolve(SCRIPT_DIR, 'upbase-storage-state.json');
const BASE_URL = 'https://api.upbase.io/v1';

export class UpbaseAPI {
  #token;
  #orgId;

  /**
   * @param {object} opts
   * @param {string} [opts.storageStatePath] — path to Playwright storage state JSON
   * @param {string} [opts.token] — JWT token (alternative to storage state)
   * @param {string} [opts.orgId] — organization ID (auto-detected if not provided)
   */
  constructor(opts = {}) {
    if (opts.token) {
      this.#token = opts.token;
    } else {
      const ssPath = opts.storageStatePath || DEFAULT_STORAGE_PATH;
      const ss = JSON.parse(readFileSync(ssPath, 'utf-8'));
      const entry = ss.origins?.[0]?.localStorage?.find(i => i.name === 'access_token');
      if (!entry) throw new Error('No access_token in storage state. Run auth-setup.mjs first.');
      this.#token = entry.value;
    }
    this.#orgId = opts.orgId || null;
  }

  // =========================================================================
  // HTTP helpers
  // =========================================================================

  async #request(method, path, body = null) {
    const url = `${BASE_URL}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.#token}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upbase API ${method} ${path}: ${res.status} ${res.statusText} — ${text}`);
    }

    const json = await res.json();
    if (json.code && json.code !== 200) {
      throw new Error(`Upbase API error: code=${json.code} — ${JSON.stringify(json)}`);
    }
    return json.data;
  }

  #get(path) { return this.#request('GET', path); }
  #post(path, body) { return this.#request('POST', path, body); }
  #put(path, body) { return this.#request('PUT', path, body); }
  #delete(path) { return this.#request('DELETE', path); }

  #orgPath(suffix = '') {
    if (!this.#orgId) throw new Error('orgId not set. Call init() or pass orgId to constructor.');
    return `/organizations/${this.#orgId}${suffix}`;
  }

  // =========================================================================
  // Init — auto-detect org ID
  // =========================================================================

  async init() {
    if (this.#orgId) return this;
    const orgs = await this.#get('/organizations');
    if (!orgs?.length) throw new Error('No organizations found');
    this.#orgId = orgs[0].id;
    return this;
  }

  get orgId() { return this.#orgId; }

  // =========================================================================
  // Organizations
  // =========================================================================

  async getOrganizations() {
    return this.#get('/organizations');
  }

  async getProfile() {
    return this.#get('/profile');
  }

  // =========================================================================
  // Lists (Projects)
  // =========================================================================

  async getLists() {
    return this.#get(this.#orgPath('/lists'));
  }

  async getList(listId) {
    const lists = await this.getLists();
    const find = (items) => {
      for (const l of items) {
        if (l.id === listId) return l;
        if (l.children) {
          const found = find(l.children);
          if (found) return found;
        }
      }
      return null;
    };
    return find(lists);
  }

  // =========================================================================
  // Tasks
  // =========================================================================

  /**
   * List all tasks in the org (or filter by list_id)
   * @param {object} [opts]
   * @param {string} [opts.listId] — filter by list
   * @param {number} [opts.limit] — max results
   */
  async getTasks(opts = {}) {
    let path = this.#orgPath('/tasks?v=2');
    if (opts.listId) path += `&list_id=${opts.listId}`;
    if (opts.limit) path += `&limit=${opts.limit}`;
    return this.#get(path);
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId) {
    return this.#get(this.#orgPath(`/tasks/${taskId}`));
  }

  /**
   * Create a task
   * @param {object} taskData
   * @param {string} taskData.title — required
   * @param {string} taskData.list_id — required
   * @param {string} [taskData.description]
   * @param {string} [taskData.priority] — '', 'low', 'medium', 'high', 'urgent'
   * @param {string} [taskData.due_date] — ISO date string
   * @param {string} [taskData.start_date] — ISO date string
   * @param {string[]} [taskData.assignee_ids] — array of user IDs
   * @param {string[]} [taskData.tag_ids] — array of tag IDs
   * @returns {string} — created task ID
   */
  async createTask(taskData) {
    if (!taskData.title) throw new Error('title is required');
    if (!taskData.list_id) throw new Error('list_id is required');
    return this.#post(this.#orgPath('/tasks'), taskData);
  }

  /**
   * Update a task
   * @param {string} taskId
   * @param {object} updates — fields to update (title, description, priority, etc.)
   */
  async updateTask(taskId, updates) {
    return this.#put(this.#orgPath(`/tasks/${taskId}`), updates);
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    return this.#delete(this.#orgPath(`/tasks/${taskId}`));
  }

  // =========================================================================
  // Users
  // =========================================================================

  async getUsers() {
    return this.#get(this.#orgPath('/users'));
  }

  // =========================================================================
  // Tags
  // =========================================================================

  async getTags() {
    return this.#get(this.#orgPath('/tags'));
  }

  // =========================================================================
  // Custom Fields
  // =========================================================================

  async getCustomFields() {
    return this.#get(this.#orgPath('/cfields'));
  }

  // =========================================================================
  // Sections (stages/columns in a list)
  // =========================================================================

  async getStages(listId) {
    return this.#get(this.#orgPath(`/lists/${listId}/stages`));
  }

  async getListDetail(listId) {
    return this.#get(this.#orgPath(`/lists/${listId}`));
  }
}

// ============================================================================
// CLI mode — quick test
// ============================================================================

if (process.argv[1] === import.meta.filename) {
  const api = new UpbaseAPI();
  await api.init();
  console.log(`Org: ${api.orgId}`);

  const cmd = process.argv[2] || 'lists';

  switch (cmd) {
    case 'lists': {
      const lists = await api.getLists();
      const flat = lists.flatMap(l => {
        const items = [{ id: l.id, title: l.title, folder: l.is_folder }];
        if (l.children) l.children.forEach(c => items.push({ id: c.id, title: `  ${c.title}`, folder: false }));
        return items;
      });
      console.table(flat);
      break;
    }
    case 'tasks': {
      const listId = process.argv[3];
      const tasks = await api.getTasks(listId ? { listId } : {});
      console.log(`Total: ${tasks.length} tasks`);
      console.table(tasks.slice(0, 20).map(t => ({
        id: t.id,
        title: t.title?.substring(0, 50),
        priority: t.priority,
        status: t.status,
      })));
      break;
    }
    case 'users': {
      const users = await api.getUsers();
      console.table(users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, email: u.email })));
      break;
    }
    case 'tags': {
      const tags = await api.getTags();
      console.table(tags.map(t => ({ id: t.id, title: t.title, color: t.color })));
      break;
    }
    default:
      console.log('Usage: node upbase-api.mjs [lists|tasks|users|tags] [listId]');
  }
}
