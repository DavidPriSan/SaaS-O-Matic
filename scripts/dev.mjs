// Starts the API and the web dev servers together with prefixed output. No extra dependencies.
// - Preflight: refuses to start if a port is busy (clear message instead of a confusing failure).
// - Readiness: tells you when the app is usable, or which service is not responding.
// - Lifecycle: if a service exits, the other is stopped; Ctrl+C stops both; no orphans on forced kills (below).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const READY_TIMEOUT_MS = 20_000;
const USE_COLOR = process.stdout.isTTY;
const paint = (code, text) => (USE_COLOR ? `\x1b[${code}m${text}\x1b[0m` : text);

const SERVICES = [
  { name: 'api', color: 36, dir: 'apps/api', port: 3000, healthUrl: 'http://localhost:3000/health' },
  { name: 'web', color: 35, dir: 'apps/web', port: 5173, healthUrl: 'http://localhost:5173/' },
];

// On Windows a busy port can even be silently shared (wildcard vs specific address), so the servers'
// own errors are not a reliable signal: check first.
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
void reportReadiness();

/**
 * Each service runs as a DIRECT Node child (`node <tsx|vite entry>`), not through `npm run` (npm → cmd.exe → tool).
 * On Windows, Node (libuv) places its children in a kill-on-close job: when a Node process dies, even when
 * force-killed, Windows kills its direct children. That cascade holds along a chain of Node processes but breaks
 * at cmd.exe, which is what left tsx/vite orphaned before. On POSIX, Ctrl+C or closing the terminal signals the
 * whole process group.
 */
function start({ name, color, dir }) {
  const prefix = `${paint(color, `[${name}]`)} `;
  const { entry, args } = resolveDevCommand(dir);
  const child = spawn(process.execPath, [entry, ...args], {
    cwd: join(ROOT, dir),
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

/** "tsx watch src/server.ts" → node_modules/tsx/<bin entry> + ["watch", "src/server.ts"]. The workspace's own
 * `dev` script stays the single source of truth. */
function resolveDevCommand(dir) {
  const workspaceDir = join(ROOT, dir);
  const [bin, ...args] = readJson(join(workspaceDir, 'package.json')).scripts.dev.trim().split(/\s+/);
  for (let current = workspaceDir; ; current = dirname(current)) {
    const manifest = join(current, 'node_modules', bin, 'package.json');
    if (existsSync(manifest)) {
      const binField = readJson(manifest).bin;
      return { entry: join(dirname(manifest), typeof binField === 'string' ? binField : binField[bin]), args };
    }
    if (dirname(current) === current) throw new Error(`Cannot find the "${bin}" binary. Did you run npm install?`);
  }
}

async function reportReadiness() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  const pending = new Set(SERVICES);
  while (pending.size > 0 && Date.now() < deadline && !shuttingDown) {
    for (const service of pending) if (await responds(service.healthUrl)) pending.delete(service);
    if (pending.size > 0) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (shuttingDown) return;
  if (pending.size === 0) {
    console.log(paint(32, '\n✓ SaaS-O-Matic is ready → http://localhost:5173  (API on :3000) · Ctrl+C to stop\n'));
    return;
  }
  const names = [...pending].map((service) => service.name).join(', ');
  console.log(
    paint(
      33,
      `\n⚠ Not responding after ${READY_TIMEOUT_MS / 1000}s: ${names}. Check the [${names}] messages above.` +
        '\n  In watch mode it restarts automatically when you save a fix.\n',
    ),
  );
}

async function responds(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1000) })).ok;
  } catch {
    return false;
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
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

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  // Direct children: on Windows their own descendants (tsx's server process) die with them via the same job rule.
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exit(code);
}
