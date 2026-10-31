import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { preflight, emptyReport } from '../browser-shared-session.mjs';
import { startFixture, fixtureHtml } from './fixture.mjs';

const root = process.platform === 'win32' ? 'C:\\fixture-new' : '/tmp/huhu-fixture-new';
const executable = process.platform === 'win32' ? 'C:\\Obsidian.exe' : '/opt/Obsidian';

test('preflight rejects a missing or relative disposable root', () => {
	assert.equal(preflight({}, [], 'linux', 1000), 'new_absolute_root_required');
	assert.equal(preflight({}, ['relative-root'], 'linux', 1000), 'new_absolute_root_required');
});

test('preflight rejects a missing Obsidian executable', () => {
	assert.equal(preflight({}, [root], 'linux', 1000), 'obsidian_executable_required');
});

test('preflight never disables the sandbox to accommodate Linux root', () => {
	assert.equal(preflight({ HUHU_OBSIDIAN_EXECUTABLE: executable }, [root], 'linux', 0), 'sandbox_requires_non_root_user');
});

test('preflight accepts a configured non-root runner but does not claim the host exists', () => {
	assert.equal(preflight({ HUHU_OBSIDIAN_EXECUTABLE: executable }, [root], 'linux', 1000), null);
});

test('missing host exits nonzero with an explicit blocked report', () => {
	const env = { ...process.env }; delete env.HUHU_OBSIDIAN_EXECUTABLE;
	const result = spawnSync(process.execPath, [fileURLToPath(new URL('../browser-shared-session.mjs', import.meta.url)), root], { env, encoding: 'utf8' });
	assert.equal(result.status, 2);
	const report = JSON.parse(result.stdout);
	assert.equal(report.status, 'blocked');
	assert.equal(report.reason, 'obsidian_executable_required');
	assert.equal(report.p0Complete, false);
	assert.equal(report.productionBrowserReplaced, false);
});

test('report cannot mistake automated subset for P0 or production completion', () => {
	const report = emptyReport();
	assert.equal(report.p0Complete, false);
	assert.equal(report.productionBrowserReplaced, false);
	assert.ok(report.notCovered.some(item => item.includes('IME')));
	assert.ok(report.notCovered.some(item => item.includes('OAuth')));
	assert.ok(report.notCovered.some(item => item.includes('React')));
});

test('fixture serves synthetic data and denies all external resources', async t => {
	const fixture = await startFixture(); t.after(() => fixture.close());
	const response = await fetch(fixture.origin);
	assert.equal(response.status, 200);
	assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
	assert.equal(response.headers.get('access-control-allow-origin'), null);
	const body = await response.text();
	assert.equal(body, fixtureHtml);
	assert.match(body, /SYNTHETIC_PASSWORD_DO_NOT_LOG/);
	assert.match(body, /db.close\(\)/);
});

test('fixture rejects hostile Origin', async t => {
	const fixture = await startFixture(); t.after(() => fixture.close());
	const response = await fetch(fixture.origin, { headers: { Origin: 'https://evil.example' } });
	assert.equal(response.status, 403);
});

test('fixture rejects hostile Host', async t => {
	const fixture = await startFixture(); t.after(() => fixture.close());
	// fetch may replace Host; use the HTTP client to send the actual hostile header.
	const status = await new Promise((resolve, reject) => {
		const req = request(fixture.origin, { headers: { Host: 'evil.example' } }, res => {
			res.resume(); resolve(res.statusCode);
		});
		req.on('error', reject); req.end();
	});
	assert.equal(status, 403);
});

test('fixture rejects unknown routes and write requests', async t => {
	const fixture = await startFixture(); t.after(() => fixture.close());
	assert.equal((await fetch(`${fixture.origin}/unknown`)).status, 404);
	assert.equal((await fetch(fixture.origin, { method: 'POST', body: 'not accepted' })).status, 404);
});
