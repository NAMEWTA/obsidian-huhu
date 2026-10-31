import { promises as fs, type Stats } from 'node:fs';
import path from 'node:path';
import { AgentBrowserError } from '../../core/contracts';
import { atomicPrivateFile, isMissing, privateDirectory, readPrivateFile, sameFile, syncDirectory } from './persistence/private-files';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export interface ImportCleanupJob { id: string; kind: 'source' | 'runtime' }
interface CleanupOptions { root: string; assertOwner(): void | Promise<void>; reclaim(stagingId: string): Promise<void> }

/** Job records contain only owned staging IDs. They never contain source paths, URLs or secrets. */
export class DesktopImportCleanupJobs {
	private readonly jobs = new Map<string, ImportCleanupJob>();
	private tail: Promise<unknown> = Promise.resolve();
	private root = ''; private staging = ''; private metadata = ''; private closed = false;
	private rootStat?: Stats;
	private stagingStat?: Stats;
	private metadataStat?: Stats;
	private constructor(private readonly options: CleanupOptions) {}
	static async open(options: CleanupOptions): Promise<DesktopImportCleanupJobs> {
		const service = new DesktopImportCleanupJobs(options); await service.initialize(); return service;
	}
	get count(): number { return this.jobs.size; }
	list(): ImportCleanupJob[] { return [...this.jobs.values()].map((job) => ({ ...job })); }
	private enqueue<T>(work: () => Promise<T>): Promise<T> {
		if (this.closed) return Promise.reject(new AgentBrowserError('storage_closed'));
		const task = this.tail.then(work, work); this.tail = task.catch(() => undefined); return task;
	}
	private async owner(): Promise<void> {
		await this.options.assertOwner();
		for (const [directory, original] of [[this.root, this.rootStat], [this.staging, this.stagingStat], [this.metadata, this.metadataStat]] as const) {
			if (!original) throw new AgentBrowserError('storage_path_invalid');
			const current = await fs.lstat(directory);
			if (!current.isDirectory() || current.isSymbolicLink() || !sameFile(original, current) || await fs.realpath(directory) !== directory) throw new AgentBrowserError('storage_owner_lost');
		}
	}
	private file(): string { return path.join(this.metadata, 'import-staging.json'); }
	private async persist(): Promise<void> { await this.owner(); await atomicPrivateFile(this.file(), JSON.stringify({ version: 1, jobs: this.list() })); }
	private async initialize(): Promise<void> {
		await this.options.assertOwner(); this.root = await privateDirectory(this.options.root);
		this.staging = await privateDirectory(path.join(this.root, 'import-staging')); this.metadata = await privateDirectory(path.join(this.root, 'cleanup'));
		this.rootStat = await fs.lstat(this.root); this.stagingStat = await fs.lstat(this.staging); this.metadataStat = await fs.lstat(this.metadata);
		try {
			const value = JSON.parse((await readPrivateFile(this.file(), 1024 * 1024)).toString('utf8')) as { version: unknown; jobs: ImportCleanupJob[] };
			if (value.version !== 1 || !Array.isArray(value.jobs) || value.jobs.length > 256) throw new AgentBrowserError('cleanup_corrupt');
			for (const job of value.jobs) {
				if (!job || !UUID.test(job.id) || !['source', 'runtime'].includes(job.kind) || this.jobs.has(job.id) || Object.keys(job).some((key) => key !== 'id' && key !== 'kind')) throw new AgentBrowserError('cleanup_corrupt');
				this.jobs.set(job.id, { ...job });
			}
		} catch (error) { if (!isMissing(error)) throw error; }
		const names = await fs.readdir(this.staging);
		if (names.length > 256) throw new AgentBrowserError('cleanup_quota');
		for (const id of names) {
			if (!UUID.test(id)) throw new AgentBrowserError('cleanup_path_invalid');
			const stage = await this.stage(id); if (!stage) continue;
			let runtime = false;
			for (const child of ['profile', 'downloads']) {
				try { const stat = await fs.lstat(path.join(stage.path, child)); if (!stat.isDirectory() || stat.isSymbolicLink()) throw new AgentBrowserError('cleanup_path_invalid'); runtime = true; }
				catch (error) { if (!isMissing(error)) throw error; }
			}
			this.jobs.set(id, { id, kind: runtime || this.jobs.get(id)?.kind === 'runtime' ? 'runtime' : 'source' });
		}
		if (this.jobs.size > 256) throw new AgentBrowserError('cleanup_quota');
		await this.persist();
	}
	private async stage(id: string): Promise<{ path: string; stat: Stats } | undefined> {
		if (!UUID.test(id)) throw new AgentBrowserError('cleanup_path_invalid'); await this.owner();
		const directory = path.join(this.staging, id);
		try {
			const stat = await fs.lstat(directory);
			if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(directory) !== directory) throw new AgentBrowserError('cleanup_path_invalid');
			return { path: directory, stat };
		} catch (error) { if (isMissing(error)) return undefined; throw error; }
	}
	record(temporaryPath: string, kind: ImportCleanupJob['kind']): Promise<string> {
		return this.enqueue(async () => {
			await this.owner();
			const id = path.basename(temporaryPath);
			if (!path.isAbsolute(temporaryPath) || temporaryPath !== path.join(this.staging, id) || !UUID.test(id) || !['source', 'runtime'].includes(kind)) throw new AgentBrowserError('cleanup_path_invalid');
			await this.stage(id); if (!this.jobs.has(id) && this.jobs.size >= 256) throw new AgentBrowserError('cleanup_quota');
			const previous = this.jobs.get(id); this.jobs.set(id, { id, kind: previous?.kind === 'runtime' ? 'runtime' : kind });
			try { await this.persist(); } catch (error) { if (previous) this.jobs.set(id, previous); else this.jobs.delete(id); throw error; } return id;
		});
	}
	complete(id: string): Promise<void> { return this.enqueue(async () => {
		if (await this.stage(id)) throw new AgentBrowserError('cleanup_pending');
		const previous = this.jobs.get(id); this.jobs.delete(id);
		try { await this.persist(); } catch (error) { if (previous) this.jobs.set(id, previous); throw error; }
	}); }
	retry(): Promise<{ completed: string[]; pending: ImportCleanupJob[] }> {
		return this.enqueue(async () => {
			await this.owner(); const completed: string[] = [];
			for (const job of this.list()) {
				try {
					const stage = await this.stage(job.id);
					if (stage) {
						if (job.kind === 'runtime') await this.options.reclaim(job.id);
						await this.owner(); const current = await this.stage(job.id);
						if (current && !sameFile(stage.stat, current.stat)) throw new AgentBrowserError('cleanup_path_invalid');
						if (current) await fs.rm(current.path, { recursive: true, force: false });
						await syncDirectory(this.staging);
					}
					if (await this.stage(job.id)) throw new AgentBrowserError('cleanup_pending');
					this.jobs.delete(job.id);
					try { await this.persist(); } catch (error) { this.jobs.set(job.id, job); throw error; }
					completed.push(job.id);
				} catch { /* Failed reclamation, containment or removal remains visible and retryable. */ }
			}
			return { completed, pending: this.list() };
		});
	}
	async dispose(): Promise<void> { this.closed = true; await this.tail; }
}
