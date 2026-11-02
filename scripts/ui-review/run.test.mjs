import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const runner = path.join(import.meta.dirname, 'run.mjs');
test('rejects unknown matrix instead of silently dropping coverage', () => {
	const result = spawnSync(process.execPath, [runner, '--ticket', 'T-23', '--matrix', 'quick', '--out', '/unused'], { encoding: 'utf8' });
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Usage:/);
});
test('rejects fixture path traversal before writing output', () => {
	const result = spawnSync(process.execPath, [runner, '--ticket', '../T-23', '--matrix', 'standard', '--out', '/unused'], { encoding: 'utf8' });
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Usage:/);
});
test('missing fixture produces a nonpassing machine-readable result', async () => {
	const output = await mkdtemp(path.join(os.tmpdir(), 'huhu-review-cli-'));
	try {
		const run = spawnSync(process.execPath, [runner, '--ticket', 'T-999999', '--matrix', 'standard', '--out', output], { encoding: 'utf8' });
		assert.notEqual(run.status, 0);
		const result = JSON.parse(await readFile(path.join(output, 'result.json'), 'utf8'));
		assert.equal(result.status, 'failed');
		assert.deepEqual(result.cases, []);
		assert.match(result.errors[0].message, /T-999999/);
	} finally { await rm(output, { recursive: true, force: true }); }
});
