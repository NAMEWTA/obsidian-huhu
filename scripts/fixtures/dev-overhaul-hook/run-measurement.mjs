// T12 evidence driver. Uses the repository's installed Vitest and exact production-process test.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import os from 'node:os';
const rounds = Number(process.env.HUHU_HOOK_ROUNDS ?? '20');
const expectedPlatform = process.env.HUHU_HOOK_EXPECT_PLATFORM ?? 'win32';
const output = process.env.HUHU_TEST_HOOK_EVIDENCE ?? 'temp/dev-overhaul/hook/windows-run';
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100) throw new Error('Rounds must be an integer from 1 to 100');
if (process.platform !== expectedPlatform) throw new Error(`Expected ${expectedPlatform}; observed ${process.platform}`);
const name = '32 scopes accept three ordered short events each through the shared bounded collector and fair reader';
const test = 'src/modules/agent/platform/desktop/hooks/hook-spool.test.ts';
const inputs = [test, 'src/modules/agent/platform/desktop/hooks/hook-spool.ts', 'src/modules/agent/platform/desktop/hooks/spool-guard.ts', 'src/modules/agent/platform/desktop/hooks/automation-hooks.ts', 'package.json', 'pnpm-lock.yaml', 'vitest.config.ts'];
mkdirSync(output, { recursive: true });
const summary = {
  schemaVersion: 1, expectedPlatform, platform: process.platform, arch: process.arch, node: process.version,
  osRelease: os.release(), cpus: os.availableParallelism(), packageManager: JSON.parse(readFileSync('package.json', 'utf8')).packageManager,
  requestedRounds: rounds, targetName: name, inputs: Object.fromEntries(inputs.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])), rounds: [],
};
for (let round = 1; round <= rounds; round++) {
  const directory = join(output, `round-${String(round).padStart(3, '0')}`);
  mkdirSync(directory, { recursive: true });
  const args = ['node_modules/vitest/vitest.mjs', 'run', test, '-t', `^${name}$`, '--reporter=verbose', '--reporter=json', `--outputFile.json=${join(directory, 'vitest.json')}`];
  const started = performance.now();
  const result = spawnSync(process.execPath, args, { env: { ...process.env, HUHU_TEST_HOOK_TIMING: '1', HUHU_TEST_HOOK_EVIDENCE: directory }, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true, timeout: 60000 });
  writeFileSync(join(directory, 'command.json'), JSON.stringify({ executable: 'current Node', args, containmentTimeoutMs: 60000 }, null, 2) + '\n');
  writeFileSync(join(directory, 'command.log'), (result.stdout ?? '') + (result.stderr ?? ''));
  writeFileSync(join(directory, 'command.exit'), String(result.status ?? `signal:${result.signal ?? 'spawn-error'}`) + '\n');
  let reached = false, timing, verificationError;
  try {
    const report = JSON.parse(readFileSync(join(directory, 'vitest.json'), 'utf8'));
    const cases = report.testResults.flatMap(file => file.assertionResults).filter(row => row.title === name);
    reached = cases.length === 1 && cases[0].status === 'passed';
    timing = JSON.parse(readFileSync(join(directory, 'timing-sample.json'), 'utf8'));
    if (timing.platform !== expectedPlatform || timing.plannedEvents !== 96 || timing.startedPublishers !== 96 || timing.receivedEvents !== 96 || !timing.bodyPassed || !timing.cleanupPassed || timing.unreclaimedObservations !== 0 || timing.consumeReclaim.calls !== 96 || Object.values(timing.failures).some(count => count !== 0)) throw new Error('Target timing/count/order/cleanup verification failed');
    for (const key of ['collectorWait', 'collectorHeld', 'publish']) if (timing.segments[key].calls !== 96) throw new Error(`Incomplete ${key} observations`);
  } catch (error) { verificationError = error instanceof SyntaxError ? 'Invalid result JSON' : error?.code === 'ENOENT' ? 'Missing target result artifact' : String(error.message); }
  const row = { round, exitCode: result.status, signal: result.signal, wallMs: performance.now() - started, reached, received: timing?.receivedEvents ?? 0, passed: result.status === 0 && reached && !verificationError, verificationError,
    // Diagnostic split only: which failure counters fired and which scopes broke 0,1,2 delivery order. Pass/fail rules above are unchanged.
    failureCounts: timing ? Object.fromEntries(Object.entries(timing.failures).filter(([, count]) => count !== 0)) : undefined, orderViolations: timing?.orderFailures?.map(item => `${item.scope}:${item.events.map(event => event.split(':')[1]).join('')}`) };
  summary.rounds.push(row);
  summary.failedRounds = summary.rounds.filter(row => !row.passed).length;
  summary.completedRounds = summary.rounds.length;
  writeFileSync(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(row));
}
process.exitCode = summary.failedRounds ? 1 : 0;
