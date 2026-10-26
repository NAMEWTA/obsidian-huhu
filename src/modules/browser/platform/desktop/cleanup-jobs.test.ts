import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopImportCleanupJobs } from './cleanup-jobs';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
async function root() { const directory = await fs.mkdtemp(path.join(tmpdir(), 'huhu-cleanup-')); roots.push(directory); return directory; }
describe('durable staging cleanup ownership', () => {
	it('records only IDs, retains a failed native reclaim and succeeds idempotently after restart', async () => {
		const directory = await root(), id = randomUUID(), stage = path.join(directory, 'import-staging', id), reclaim = vi.fn(async () => { throw new Error('native owner unknown'); });
		const jobs = await DesktopImportCleanupJobs.open({ root: directory, assertOwner: () => undefined, reclaim }); await jobs.record(stage, 'runtime'); await fs.mkdir(path.join(stage, 'profile'), { recursive: true }); await fs.writeFile(path.join(stage, 'profile', 'Cookies'), 'cookie-secret');
		expect((await jobs.retry()).pending).toEqual([{ id, kind: 'runtime' }]); expect(await fs.readFile(path.join(stage, 'profile', 'Cookies'), 'utf8')).toBe('cookie-secret');
		expect(await fs.readFile(path.join(directory, 'cleanup', 'import-staging.json'), 'utf8')).not.toContain('cookie-secret'); await jobs.dispose();
		const recovered = await DesktopImportCleanupJobs.open({ root: directory, assertOwner: () => undefined, reclaim: async () => undefined }); expect((await recovered.retry()).completed).toEqual([id]); expect(recovered.count).toBe(0); expect((await recovered.retry()).completed).toEqual([]);
	});
	it('adopts source and runtime orphans, invokes native reclaim only for runtime and acknowledges only absent paths', async () => {
		const directory = await root(), source = randomUUID(), runtime = randomUUID(); await fs.mkdir(path.join(directory, 'import-staging', source), { recursive: true }); await fs.mkdir(path.join(directory, 'import-staging', runtime, 'downloads'), { recursive: true });
		const reclaim = vi.fn(async () => undefined), jobs = await DesktopImportCleanupJobs.open({ root: directory, assertOwner: () => undefined, reclaim });
		expect(jobs.count).toBe(2); await expect(jobs.complete(source)).rejects.toMatchObject({ code: 'cleanup_pending' }); await jobs.retry(); expect(reclaim.mock.calls).toEqual([[runtime]]);
		const future = randomUUID(); await jobs.record(path.join(directory, 'import-staging', future), 'runtime'); await jobs.complete(future); expect(jobs.count).toBe(0);
	});
	it('rejects external paths and retains replaced or linked stages without deleting external data', async () => {
		const directory = await root(), external = await root(), id = randomUUID(); await fs.writeFile(path.join(external, 'sentinel'), 'keep');
		const jobs = await DesktopImportCleanupJobs.open({ root: directory, assertOwner: () => undefined, reclaim: async () => undefined });
		await expect(jobs.record(external, 'source')).rejects.toMatchObject({ code: 'cleanup_path_invalid' });
		const stage = path.join(directory, 'import-staging', id); await jobs.record(stage, 'runtime'); await fs.symlink(external, stage);
		expect((await jobs.retry()).pending).toEqual([{ id, kind: 'runtime' }]); expect(await fs.readFile(path.join(external, 'sentinel'), 'utf8')).toBe('keep');
	});
});
