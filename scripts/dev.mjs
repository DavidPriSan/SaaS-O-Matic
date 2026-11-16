// Starts the API and the web dev servers together with prefixed output.
// If one of them exits, the other is stopped too; Ctrl+C stops both. No extra dependencies.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

const IS_WINDOWS = process.platform === 'win32';
const USE_COLOR = process.stdout.isTTY;

// Run through npm's own CLI with the current Node binary: no shell, identical on every OS.
const NPM_CLI = process.env.npm_execpath;
if (!NPM_CLI) {
  console.error('Run this script through npm: `npm run dev`.');
  process.exit(1);
}

const SERVICES = [
  { name: 'api', color: 36, workspace: '@saas/api', port: 3000 },
  { name: 'web', color: 35, workspace: '@saas/web', port: 5173 },
];

// Fail fast with a clear message. On Windows a busy port can even be silently shared (wildcard vs
// specific address), so the servers' own errors are not a reliable signal.
const busy = [];
for (const { name, port } of SERVICES) {
  if (!(await isPortFree(port))) busy.push(`${port} (${name})`);
}
if (busy.length > 0) {
  console.error(`Port(s) already in use: ${busy.join(', ')}. Stop the process using them and try again.`);
  process.exit(1);
}

let shuttingDown = false;
const children = SERVICES.map(start);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function start({ name, color, workspace }) {
  const prefix = USE_COLOR ? `\x1b[${color}m[${name}]\x1b[0m ` : `[${name}] `;
  const child = spawn(process.execPath, [NPM_CLI, 'run', 'dev', '-w', workspace], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: USE_COLOR ? '1' : '0' },
  });
  pipeWithPrefix(child.stdout, prefix);
  pipeWithPrefix(child.stderr, prefix);
  child.on('exit', (code) => {
    if (shuttingDown) return;
    process.stdout.write(`${prefix}exited with code ${code ?? 'null'}, stopping the other service\n`);
    shutdown(code || 1);
  });
  return child;
}

function pipeWithPrefix(stream, prefix) {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    const lines = (pending + chunk).split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const line of lines) process.stdout.write(`${prefix}${line}\n`);
  });
  stream.on('end', () => pending && process.stdout.write(`${prefix}${pending}\n`));
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const probe = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => probe.close(() => resolve(true)))
      .listen(port, 'localhost');
  });
}

// On Windows, killing npm does not kill its children (tsx, vite): terminate the whole tree.
function stop(child) {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (IS_WINDOWS) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach(stop);
  process.exit(code);
}
