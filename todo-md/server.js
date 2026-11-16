#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const FILE = process.env.TODO_FILE || path.join(__dirname, 'todos.md');
const PORT = Number(process.env.TODO_PORT || 4321);

/* ---------- markdown <-> state ---------- */

// # Project
// - [ ] task
// # Archive
// - [x] task <!-- Project | 2026-02-10 -->

function parse(md) {
  const projects = [];
  const archive = [];
  let cur = null;
  let inArchive = false;

  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const head = line.match(/^#{1,6}\s+(.*)$/);
    if (head) {
      const name = head[1].trim();
      if (name.toLowerCase() === 'archive') {
        inArchive = true;
        cur = null;
      } else {
        inArchive = false;
        cur = { name, todos: [] };
        projects.push(cur);
      }
      continue;
    }

    const item = line.match(/^[-*]\s+\[( |x|X)\]\s*(.*)$/);
    if (!item) continue;
    let text = item[2].trim();

    if (inArchive) {
      let project = 'General';
      let date = '';
      const meta = text.match(/<!--\s*(.*?)\s*-->\s*$/);
      if (meta) {
        text = text.slice(0, meta.index).trim();
        const parts = meta[1].split('|').map((s) => s.trim());
        project = parts[0] || project;
        date = parts[1] || '';
      }
      archive.push({ text, project, date });
    } else if (cur) {
      cur.todos.push({ text, done: item[1].toLowerCase() === 'x' });
    }
  }

  if (!projects.length) projects.push({ name: 'General', todos: [] });
  return { projects, archive };
}

function serialize(state) {
  const out = [];
  for (const p of state.projects || []) {
    out.push(`# ${p.name}`, '');
    for (const t of p.todos || []) {
      out.push(`- [${t.done ? 'x' : ' '}] ${t.text}`);
    }
    out.push('');
  }
  out.push('# Archive', '');
  for (const a of state.archive || []) {
    out.push(`- [x] ${a.text} <!-- ${a.project} | ${a.date || ''} -->`);
  }
  out.push('');
  return out.join('\n');
}

function load() {
  try {
    return parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { projects: [{ name: 'General', todos: [] }], archive: [] };
  }
}

function save(state) {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, serialize(state));
  fs.renameSync(tmp, FILE);
}

/* ---------- server ---------- */

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/data' && req.method === 'GET') {
    const state = load();
    state.file = FILE;
    return json(res, state);
  }

  if (url === '/api/data' && req.method === 'PUT') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        save(JSON.parse(body));
        json(res, { ok: true });
      } catch (e) {
        json(res, { ok: false, error: String(e) }, 400);
      }
    });
    return;
  }

  if (url === '/' || url === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  res.writeHead(404);
  res.end('not found');
});

function json(res, obj, code = 200) {
  const b = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': b.length });
  res.end(b);
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`todo-md → http://127.0.0.1:${PORT}`);
  console.log(`file    → ${FILE}`);
});
