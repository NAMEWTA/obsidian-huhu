import { expect, test, vi } from 'vitest';
import { serviceKey } from '../../../app/contracts/module';
import { memoryVault } from '../../../../scripts/fixtures/memory-vault';
import { HealthScanService, type HealthScanPorts } from './scanner';
import type { HealthCheck, HealthProvider } from '../api';

const options = () => ({ concurrency: 2, batchSize: 2, maxItems: 20, maxIssues: 10, freshnessMinutes: 5 });
const provider = (id: string): HealthProvider => ({ id, scope: 'archives', service: serviceKey<HealthCheck>('archives', id) });
const ports = (checks: Record<string, HealthCheck>): HealthScanPorts => ({
	providers: async () => Object.keys(checks).map(provider),
	acquire: async row => checks[row.id] ? { value: checks[row.id]!, revoked: new AbortController().signal } : undefined,
	now: () => 100, id: () => 'scan-one', yieldControl: async () => {},
});

test('manual cancellation keeps checked progress and never publishes late slices as a successful report', async () => {
	let resume!: () => void, entered!: () => void;
	const paused = new Promise<void>(resolve => { resume = resolve; });
	const reached = new Promise<void>(resolve => { entered = resolve; });
	const check: HealthCheck = { permission: async () => 'allowed', scan: async function* () { yield { checked: 1, total: 2 }; yield { checked: 1, total: 2 }; } };
	const scanner = new HealthScanService({ ...ports({ 'test.cancel': check }), yieldControl: async () => { entered(); await paused; } }, options);
	try {
		const running = scanner.scan();
		await reached;
		scanner.cancel(); resume();
		const report = await running;
		expect(report.status).toBe('cancelled');
		expect(report.complete).toBe(false);
		expect(report.sections[0]).toMatchObject({ status: 'cancelled', checked: 1, complete: false });
		expect(scanner.snapshot.running).toBe(false);
	} finally { resume(); await scanner.dispose(); }
});

test('reports expire and owner invalidation makes cached reports stale without another scan', async () => {
	let now = 100;
	const check: HealthCheck = { permission: async () => 'allowed', scan: async function* () { yield { checked: 1 }; } };
	const scanner = new HealthScanService({ ...ports({ 'test.fresh': check }), now: () => now }, options);
	try {
		await scanner.scan();
		expect(scanner.snapshot.report?.stale).toBe(false);
		scanner.invalidate();
		expect(scanner.snapshot.report?.stale).toBe(true);
		await scanner.scan();
		expect(scanner.snapshot.report?.stale).toBe(false);
		now += 300000;
		expect(scanner.snapshot.report?.stale).toBe(true);
	} finally { await scanner.dispose(); }
});

test('one throwing provider does not stop others; locked and unavailable providers never scan', async () => {
	const scanned: string[] = [], acquired: string[] = [];
	const checks: Record<string, HealthCheck> = {
		'test.error': { permission: async () => 'allowed', scan: async function* () { throw new Error('SENSITIVE_ACCOUNT'); } },
		'test.good': { permission: async () => 'allowed', scan: async function* () { scanned.push('good'); yield { checked: 2, total: 2 }; } },
		'test.locked': { permission: async () => 'locked', scan: async function* () { scanned.push('locked'); yield { checked: 1 }; } },
		'test.unselected': { permission: async () => 'allowed', scan: async function* () { scanned.push('unselected'); yield { checked: 1 }; } },
	};
	const boundary = ports(checks);
	const scanner = new HealthScanService({ ...boundary, acquire: async (row, signal) => { acquired.push(row.id); return boundary.acquire(row, signal); } }, options);
	try {
		const report = await scanner.scan({ providerIds: ['test.error', 'test.good', 'test.locked', 'test.disabled'] });
		expect(report.sections.map(row => row.status)).toEqual(['error', 'pass', 'locked', 'unavailable']);
		expect(report.complete).toBe(false);
		expect(scanned).toEqual(['good']);
		expect(acquired.sort()).toEqual(['test.error', 'test.good', 'test.locked']);
		expect(JSON.stringify(report)).not.toContain('SENSITIVE_ACCOUNT');
		expect(report.sections[0]?.issues).toEqual([{ code: 'check-failed', severity: 'error', count: 1 }]);
	} finally { await scanner.dispose(); }
});

test('lease revocation and an external signal abort pending reads and ignore a late provider result', async () => {
	let entered!: () => void, finish!: () => void;
	const reached = new Promise<void>(resolve => { entered = resolve; });
	const pending = new Promise<void>(resolve => { finish = resolve; });
	const lease = new AbortController();
	let returned = false;
	const check: HealthCheck = { permission: async () => 'allowed', scan: async function* () { try { entered(); await pending; yield { checked: 2 }; } finally { returned = true; } } };
	const scanner = new HealthScanService({ ...ports({ 'test.late': check }), acquire: async () => ({ value: check, revoked: lease.signal }) }, options);
	try {
		const run = scanner.scan(); await reached;
		lease.abort();
		const report = await run;
		expect(report.sections[0]).toMatchObject({ status: 'unavailable', checked: 0, complete: false });
		finish();
		await vi.waitFor(() => expect(returned).toBe(true));
		expect(scanner.snapshot.report).toEqual(report);
		const cancelled = new AbortController(); cancelled.abort();
		expect((await scanner.scan({ providerIds: ['test.late'], signal: cancelled.signal })).status).toBe('cancelled');
	} finally { finish(); await scanner.dispose(); }
});

test('bounded concurrent workers yield between slices and reject overlapping admission', async () => {
	let entered!: () => void, resume!: () => void;
	const reached = new Promise<void>(resolve => { entered = resolve; });
	const paused = new Promise<void>(resolve => { resume = resolve; });
	let running = 0, maximum = 0, starts = 0, yields = 0;
	const check = (): HealthCheck => ({ permission: async () => 'allowed', scan: async function* () {
		running++; maximum = Math.max(maximum, running); starts++;
		try { if (starts === 2) entered(); await paused; yield { checked: 1, total: 2 }; yield { checked: 1, total: 2 }; }
		finally { running--; }
	} });
	const scanner = new HealthScanService({ ...ports({ 'test.one': check(), 'test.two': check(), 'test.three': check() }), yieldControl: async () => { yields++; } }, options);
	try {
		const run = scanner.scan(); await reached;
		expect(starts).toBe(2);
		await expect(scanner.scan()).rejects.toThrow('health-busy');
		resume();
		const report = await run;
		expect(maximum).toBe(2); expect(running).toBe(0); expect(yields).toBe(6);
		expect(report.complete).toBe(true);
		expect(report.sections.map(row => row.checked)).toEqual([2, 2, 2]);
	} finally { resume(); await scanner.dispose(); }
});

test('budgets and incomplete coverage cannot produce an all-green report; arbitrary fields are removed', async () => {
	const check: HealthCheck = { permission: async () => 'allowed', scan: async function* () {
		yield { checked: 1, total: 5, issues: [{ code: 'missing', severity: 'warning', count: 1, reference: 'SENSITIVE_ACCOUNT', detail: 'SENSITIVE_BODY' } as never] };
		yield { checked: 2, total: 5 };
	} };
	const scanner = new HealthScanService(ports({ 'test.budget': check }), () => ({ ...options(), maxItems: 2 }));
	try {
		const report = await scanner.scan();
		expect(report.complete).toBe(false);
		expect(report.sections[0]).toMatchObject({ status: 'incomplete', checked: 1 });
		expect(report.sections[0]?.issues.map(row => row.code)).toEqual(['missing', 'budget-exceeded']);
		expect(JSON.stringify(report)).not.toContain('SENSITIVE');
	} finally { await scanner.dispose(); }
});

test.each([
	{ maxItems: 2, batchSize: 2, slices: [2] },
	{ maxItems: 3, batchSize: 2, slices: [2, 1] },
	{ maxItems: 1, batchSize: 2, slices: [1] },
])('actual reads stop at maxItems=$maxItems with batchSize=$batchSize, including a partial final slice', async ({ maxItems, batchSize, slices }) => {
	const initial = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`${index}.json`, '{}']));
	const vault = memoryVault(initial);
	const chunks: number[] = [];
	let cleaned = false, pulls = 0;
	const check: HealthCheck = {
		permission: async () => 'allowed',
		scan: async function* (context) {
			let index = 0;
			try {
				while (index < 10) {
					context.signal.throwIfAborted();
					pulls++;
					const size = Math.min(context.batchSize, 10 - index);
					for (let offset = 0; offset < size; offset++) await vault.adapter.read(`${index++}.json`);
					chunks.push(size);
					yield { checked: size, total: 10 };
				}
			} finally { cleaned = true; }
		},
	};
	const scanner = new HealthScanService(ports({ 'test.read-budget': check }), () => ({ ...options(), maxItems, batchSize }));
	try {
		const report = await scanner.scan();
		expect(vault.reads).toBe(maxItems);
		expect(vault.writes).toBe(0);
		expect(chunks).toEqual(slices);
		expect(pulls).toBe(slices.length);
		expect(cleaned).toBe(true);
		expect(report).toMatchObject({ status: 'incomplete', complete: false });
		expect(report.sections[0]).toMatchObject({ checked: maxItems, status: 'incomplete', complete: false, issues: [{ code: 'budget-exceeded', severity: 'warning', count: 1 }] });
		expect(scanner.snapshot.progress?.sections[0]?.checked).toBe(maxItems);
		expect(Object.fromEntries(vault.contents)).toEqual(initial);
	} finally { await scanner.dispose(); }
});

test('discovery failure is an explicit incomplete error, never an empty successful scan', async () => {
	const scanner = new HealthScanService({ ...ports({}), providers: async () => { throw new Error('SENSITIVE_DISCOVERY'); } }, options);
	try {
		const report = await scanner.scan();
		expect(report.status).toBe('error');
		expect(report.complete).toBe(false);
		expect(JSON.stringify(report)).not.toContain('SENSITIVE_DISCOVERY');
	} finally { await scanner.dispose(); }
});

test.each(['external', 'dispose'] as const)('%s cancellation settles while a provider is waiting and suppresses its late results', async mode => {
	let entered!: () => void, resume!: () => void;
	const reached = new Promise<void>(resolve => { entered = resolve; });
	const pending = new Promise<void>(resolve => { resume = resolve; });
	const check: HealthCheck = { permission: async () => 'allowed', scan: async function* () { entered(); await pending; yield { checked: 1 }; } };
	const scanner = new HealthScanService(ports({ 'test.pending': check }), options);
	const controller = new AbortController();
	try {
		const run = scanner.scan({ signal: controller.signal }); await reached;
		if (mode === 'external') controller.abort(); else await scanner.dispose();
		const report = await run;
		expect(report).toMatchObject({ status: 'cancelled', complete: false });
		expect(report.sections[0]?.checked).toBe(0);
		resume();
		await Promise.resolve(); await Promise.resolve();
		expect(scanner.snapshot.report).toEqual(report);
	} finally { resume(); await scanner.dispose(); }
});

test('an invalidation during scanning marks the resulting report stale and snapshots cannot mutate owner state', async () => {
	let scanner!: HealthScanService;
	const check: HealthCheck = { permission: async () => 'allowed', scan: async function* () { scanner.invalidate(); yield { checked: 1 }; } };
	scanner = new HealthScanService(ports({ 'test.changing': check }), options);
	try {
		const report = await scanner.scan();
		expect(report.stale).toBe(true);
		(report as { stale: boolean }).stale = false;
		expect(scanner.snapshot.report?.stale).toBe(true);
	} finally { await scanner.dispose(); }
});

test('a provider cleanup failure remains isolated and cannot prevent a different provider from finishing', async () => {
	const bad: HealthCheck = { permission: async () => 'allowed', scan: () => ({ [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true, value: undefined }), return: () => { throw new Error('PRIVATE_CLEANUP'); } }) }) };
	const good: HealthCheck = { permission: async () => 'allowed', scan: async function* () { yield { checked: 1 }; } };
	const scanner = new HealthScanService(ports({ 'test.cleanup': bad, 'test.good': good }), options);
	try {
		const report = await scanner.scan();
		expect(report.sections.map(row => row.status)).toEqual(['error', 'pass']);
		expect(report.complete).toBe(false);
		expect(JSON.stringify(report)).not.toContain('PRIVATE_CLEANUP');
	} finally { await scanner.dispose(); }
});

test('a full scan of corrupt, missing and future-version files makes zero Vault or adapter writes', async () => {
	const initial = { 'bad.json': '{bad', 'bad.md': '---\na: [\n---\nSENSITIVE_BODY', 'future.json': '{"version":999}' };
	const vault = memoryVault(initial);
	const mutations = ['write', 'writeBinary', 'mkdir', 'remove', 'copy', 'rename', 'process'] as const;
	const spies = [...mutations.map(method => vi.spyOn(vault.adapter, method)), vi.spyOn(vault.app.vault, 'create'), vi.spyOn(vault.app.vault, 'createFolder'), vi.spyOn(vault.app.vault, 'process')];
	const reads: string[] = [];
	const check: HealthCheck = {
		permission: async () => 'allowed',
		scan: async function* ({ signal, batchSize }) {
			expect(batchSize).toBe(2);
			for (const path of [...Object.keys(initial), 'missing.json']) {
				signal.throwIfAborted(); reads.push(path);
				const exists = await vault.adapter.exists(path);
				if (exists) await vault.adapter.read(path);
				yield { checked: 1, total: 4, status: 'warning', issues: [{ code: exists ? path === 'future.json' ? 'unsupported-version' : 'unparseable' : 'missing', severity: 'warning', count: 1 }] };
			}
		},
	};
	const scanner = new HealthScanService(ports({ 'fixture.check': check }), options);
	try {
		const report = await scanner.scan();
		expect(report.sections).toMatchObject([{ providerId: 'fixture.check', status: 'warning', checked: 4, total: 4 }]);
		expect(report.complete).toBe(true);
		expect(reads).toEqual(['bad.json', 'bad.md', 'future.json', 'missing.json']);
		for (const spy of spies) expect(spy).not.toHaveBeenCalled();
		expect(Object.fromEntries(vault.contents)).toEqual(initial);
		expect(JSON.stringify(report)).not.toContain('SENSITIVE_BODY');
	} finally { await scanner.dispose(); vi.restoreAllMocks(); }
});
