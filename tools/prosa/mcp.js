#!/usr/bin/env node
// mcp.js : the MCP surface of Prosa. It serves the court to AI tools over stdio (JSON-RPC 2.0, one message per line).
// Three tools: prosa_check, prosa_brief and prosa_measure. Each runs the prosa command and returns what it prints.
//   claude mcp add prosa -- node D:/GitHub/prosa/tools/prosa/mcp.js
'use strict';
const cp = require('child_process'), path = require('path'), readline = require('readline');
const P = require('./prosa.js'); const CLI = path.join(__dirname, 'cli.js');

const TOOLS = [
  { name: 'prosa_check', description: 'Judge a .proz declaration, a governed text or a folder with the Prosa court. Returns the findings: each names its code, its rule, the written form and the ruling it comes from. An empty list of diagnostics means the court is silent.',
    inputSchema: { type: 'object', required: ['path'], properties: {
      path: { type: 'string', description: 'A .proz file, a Markdown or HTML text, or a folder' },
      proz: { type: 'string', description: 'A .proz file to load when path is a text that no PIECE names' },
      style: { type: 'string', description: 'The style to judge a text against, with proz' },
      form: { type: 'string' }, subject: { type: 'string' }, lang: { type: 'string' },
      level: { type: 'integer', minimum: 1, maximum: 5, description: 'Default 4' },
      json: { type: 'boolean', description: 'Return the C2 envelope instead of the report' } } } },
  { name: 'prosa_brief', description: 'Return the writing contract of a piece or a style: what to write, stated before drafting. Read it before writing a governed text.',
    inputSchema: { type: 'object', required: ['proz'], properties: { proz: { type: 'string' }, piece: { type: 'string' }, style: { type: 'string' }, form: { type: 'string' }, lang: { type: 'string' }, subject: { type: 'string' } } } },
  { name: 'prosa_measure', description: 'Measure the voice of a text or a corpus: sentence median, long and short sentences, colons, dashes, exclamations and questions per thousand words. Returns a PROFILE declaration.',
    inputSchema: { type: 'object', required: ['path'], properties: { path: { type: 'string' }, as: { type: 'string', description: 'The name of the PROFILE' }, json: { type: 'boolean' } } } },
];
function run(args) {
  const r = cp.spawnSync(process.execPath, [CLI].concat(args), { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return { text: (r.stdout || '') + (r.stderr || ''), code: r.status };
}
function call(name, a) {
  a = a || {}; const opt = (k, flag) => (a[k] !== undefined && a[k] !== '' ? [flag || '--' + k, String(a[k])] : []);
  if (name === 'prosa_check') return run(['check', a.path].concat(opt('proz'), opt('style'), opt('form'), opt('subject'), opt('lang'), opt('level'), a.json ? ['--json'] : []));
  if (name === 'prosa_brief') return run(['brief', a.proz].concat(opt('piece'), opt('style'), opt('form'), opt('lang'), opt('subject')));
  if (name === 'prosa_measure') return run(['measure', a.path].concat(opt('as'), a.json ? ['--json'] : []));
  return null;
}
function handle(msg) {
  const reply = result => ({ jsonrpc: '2.0', id: msg.id, result });
  if (msg.method === 'initialize') return reply({ protocolVersion: (msg.params && msg.params.protocolVersion) || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'prosa', version: P.VERSION.court } });
  if (msg.method === 'ping') return reply({});
  if (msg.method === 'tools/list') return reply({ tools: TOOLS });
  if (msg.method === 'tools/call') {
    const r = call(msg.params && msg.params.name, msg.params && msg.params.arguments);
    if (!r) return { jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'unknown tool' } };
    return reply({ content: [{ type: 'text', text: r.text || '(no output)' }], isError: r.code === 2 });
  }
  if (msg.id === undefined) return null; // a notification
  return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'method not found' } };
}
if (require.main === module) {
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', line => {
    if (!line.trim()) return; let msg; try { msg = JSON.parse(line); } catch (e) { return; }
    const out = handle(msg); if (out) process.stdout.write(JSON.stringify(out) + '\n');
  });
}
module.exports = { handle, TOOLS };
