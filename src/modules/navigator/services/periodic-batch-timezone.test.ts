import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { expect, test } from 'vitest';

test('a separate Pacific/Apia process skips the missing local day and visits existing notes once', async () => {
	const bundled = await build({ entryPoints: ['src/modules/navigator/services/periodic-batch.ts'], bundle: true, platform: 'node', format: 'cjs', write: false });
	const probe = `
	const assert = require('node:assert/strict');
	const query = module.exports.listPeriodicNotes;
	void (async () => {
		assert.equal(Intl.DateTimeFormat().resolvedOptions().timeZone, 'Pacific/Apia');
		const key = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
		const results = [];
		for (const populated of [false, true]) {
			const visited = [];
			const journal = {
				root: () => 'Journal', weekStart: () => 1,
				inspect: (period, date) => {
					const day = key(date);
					assert.ok(!visited.includes(day), 'calendar cursor must advance, repeated ' + day);
					visited.push(day);
					return { period, date: day, path: 'Journal/' + day + '.md', title: day, active: false, status: populated ? 'existing' : 'missing' };
				},
				preview: async (period, date) => ({ period, date: key(date), path: 'Journal/' + key(date) + '.md', title: key(date), active: false, status: 'existing', summary: key(date) }),
			};
			const entries = await query(() => journal, 'day', new Date(2011, 11, 29), new Date(2011, 11, 31));
			assert.deepEqual(visited, ['2011-12-31', '2011-12-29']);
			assert.deepEqual(entries.map(entry => entry.date), populated ? ['2011-12-31', '2011-12-29'] : []);
			results.push({ populated, visited, dates: entries.map(entry => entry.date) });
		}
		process.stdout.write(JSON.stringify(results));
	})().catch(error => { console.error(error); process.exitCode = 1; });
	`;
	// The child gets TZ before Date is initialized; the duplicate assertion stops a regression without hanging the runner.
	const child = spawnSync(process.execPath, ['--input-type=commonjs', '-e', bundled.outputFiles[0]!.text + probe], {
		env: { ...process.env, TZ: 'Pacific/Apia' }, encoding: 'utf8', timeout: 2000,
	});
	expect(child.error).toBeUndefined();
	expect(child.status, child.stderr).toBe(0);
	expect(JSON.parse(child.stdout)).toEqual([
		{ populated: false, visited: ['2011-12-31', '2011-12-29'], dates: [] },
		{ populated: true, visited: ['2011-12-31', '2011-12-29'], dates: ['2011-12-31', '2011-12-29'] },
	]);
});
