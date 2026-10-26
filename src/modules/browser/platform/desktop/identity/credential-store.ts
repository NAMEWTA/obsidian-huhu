import { promises as fs, type Stats } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { SecretProtector } from '../../../../../host/desktop/secret-protector';
import { IdentityError, identityIdValid, planIdentityImport, requireStrictIdentityPlan, type CredentialStorePort, type IdentityVersion } from '../../../core/identity';
import { atomicPrivateFile, isMissing, privateDirectory, readPrivateFile, sameFile, syncDirectory } from '../persistence/private-files';
import { sealPayload, openPayload } from '../persistence/sealed-payload';

export class DesktopCredentialStore implements CredentialStorePort {
	private locked = false; private generation = 0; private tail: Promise<unknown> = Promise.resolve();
	private directory = ''; private directoryIdentity?: Stats;
	constructor(private readonly options: { directory: string; vaultId: string; deviceId: string; protector: SecretProtector; assertOwner?: () => void | Promise<void> }) {}
	availability(): ReturnType<CredentialStorePort['availability']> { return this.options.protector.status(); }
	lock(): void { this.locked = true; this.generation++; }
	unlock(): void { this.locked = false; this.generation++; }
	private check(generation: number): void { if (this.locked || generation !== this.generation) throw new IdentityError('identity_locked'); }
	private async ready(generation: number): Promise<void> {
		this.check(generation); await this.options.assertOwner?.(); this.check(generation);
		const status = await this.availability(); this.check(generation);
		if (status !== 'available') throw new IdentityError(status === 'weak-provider' ? 'weak_provider' : 'key_unavailable');
		const directory = await privateDirectory(this.options.directory), stat = await fs.lstat(directory); this.check(generation);
		if (this.directoryIdentity && (directory !== this.directory || !sameFile(stat, this.directoryIdentity))) throw new IdentityError('identity_corrupt');
		this.directory = directory; this.directoryIdentity = stat;
	}
	private async binding(): Promise<void> {
		await this.options.assertOwner?.();
		const current = await fs.lstat(this.options.directory);
		if (!this.directoryIdentity || !current.isDirectory() || current.isSymbolicLink() || !sameFile(current, this.directoryIdentity) || await fs.realpath(this.options.directory) !== this.directory) throw new IdentityError('identity_corrupt');
	}
	private async capacity(bytes = 0): Promise<void> {
		await this.binding(); const names = await fs.readdir(this.directory);
		if (names.length > 512) throw new IdentityError('too_large'); let count = 0, total = bytes;
		for (const name of names) {
			if (!name.endsWith('.sealed')) continue;
			if (!identityIdValid(name.slice(0, -7))) throw new IdentityError('identity_corrupt');
			const stat = await fs.lstat(path.join(this.directory, name));
			if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new IdentityError('identity_corrupt');
			total += stat.size; count++;
		}
		if (count + (bytes ? 1 : 0) > 256 || total > 256 * 1024 * 1024) throw new IdentityError('too_large');
	}
	private purpose(id: string): string { return `huhu-browser-identity:${this.options.vaultId}:${this.options.deviceId}:${id}:v1`; }
	private file(id: string): string { if (!identityIdValid(id)) throw new IdentityError('identity_corrupt'); return path.join(this.options.directory, `${id}.sealed`); }
	private enqueue<T>(work: () => Promise<T>): Promise<T> { const task = this.tail.then(work, work); this.tail = task.catch(() => undefined); return task; }
	private validate(raw: unknown, id: string): IdentityVersion {
		if (!raw || typeof raw !== 'object') throw new IdentityError('identity_corrupt');
		const version = raw as IdentityVersion;
		if (version.id !== id || !identityIdValid(version.identityId) || typeof version.label !== 'string' || !version.label.trim() || version.label.length > 256 || !Number.isSafeInteger(version.createdAt) || !['cookie-file', 'browser-source', 'manual-login'].includes(version.source)) throw new IdentityError('identity_corrupt');
		try { const seed = requireStrictIdentityPlan(planIdentityImport(JSON.stringify(version.seed), 0)); return { ...version, seed }; }
		catch { throw new IdentityError('identity_corrupt'); }
	}
	create(input: IdentityVersion): Promise<void> {
		const version = this.validate(JSON.parse(JSON.stringify(input)), input.id), generation = this.generation;
		return this.enqueue(async () => {
			await this.ready(generation); const target = this.file(version.id), stage = path.join(this.options.directory, `${version.id}.${randomUUID()}.stage`);
			let published = false;
			try {
				const sealed = await sealPayload(this.options.protector, JSON.stringify(version), this.purpose(version.id)); this.check(generation);
				await this.capacity(Buffer.byteLength(sealed)); this.check(generation);
				await atomicPrivateFile(stage, sealed, true);
				const verified = this.validate(JSON.parse(await openPayload(this.options.protector, (await readPrivateFile(stage)).toString('utf8'), this.purpose(version.id))), version.id);
				if (JSON.stringify(verified) !== JSON.stringify(version)) throw new IdentityError('verification_failed');
				await this.binding(); this.check(generation);
				try { await fs.link(stage, target); published = true; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new IdentityError('identity_exists'); throw error; }
				await fs.unlink(stage); await syncDirectory(this.options.directory); this.check(generation);
			} catch (error) { if (published) { await this.binding(); await fs.rm(target, { force: true }); await syncDirectory(this.options.directory); } throw error; }
			finally { await this.binding(); await fs.rm(stage, { force: true }); }
		});
	}
	read(id: string): Promise<IdentityVersion> {
		const generation = this.generation;
		return this.enqueue(async () => { await this.ready(generation); let bytes: Buffer;
			try { bytes = await readPrivateFile(this.file(id)); } catch (error) { if (isMissing(error)) throw new IdentityError('identity_missing'); throw new IdentityError('identity_corrupt'); }
			try { const value = this.validate(JSON.parse(await openPayload(this.options.protector, bytes.toString('utf8'), this.purpose(id))), id); await this.binding(); this.check(generation); return value; }
			catch (error) { if (error instanceof IdentityError) throw error; throw new IdentityError('identity_corrupt'); } finally { bytes.fill(0); }
		});
	}
	listIds(): Promise<string[]> { const generation = this.generation; return this.enqueue(async () => { await this.ready(generation); await this.capacity(); const names = await fs.readdir(this.options.directory); const ids = names.filter((name) => name.endsWith('.sealed')).map((name) => name.slice(0, -7)); this.check(generation); return ids; }); }
	remove(id: string): Promise<void> { const generation = this.generation; return this.enqueue(async () => { await this.ready(generation); await fs.rm(this.file(id), { force: true }); await syncDirectory(this.options.directory); this.check(generation); }); }
}
export const createDesktopCredentialStore = (options: ConstructorParameters<typeof DesktopCredentialStore>[0]): DesktopCredentialStore => new DesktopCredentialStore(options);
