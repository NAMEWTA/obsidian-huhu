import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AgentBrowserError } from '../../../core/contracts';
import { atomicPrivateFile, isMissing, privateDirectory, readPrivateFile, sameFile } from '../persistence/private-files';

const active = new Map<string, Promise<void>>();
function parse(version: unknown): number[] {
	if (typeof version !== 'string' || !/^\d{1,9}\.\d{1,9}\.\d{1,9}\.\d{1,9}$/.test(version)) throw new AgentBrowserError('profile_version_invalid');
	return version.split('.').map(Number);
}
function older(current: number[], last: number[]): boolean {
	for (let index = 0; index < 4; index++) { if (current[index]! !== last[index]!) return current[index]! < last[index]!; } return false;
}
/** Called with exclusive root ownership, after native reclamation and before launch. No profile rollback. */
export function prepareProfileVersion(profilePath: string, chromiumVersion: string): Promise<void> {
	let intended: number[];
	try { intended = parse(chromiumVersion); if (!path.isAbsolute(profilePath) || path.resolve(profilePath) !== profilePath || path.dirname(profilePath) === profilePath) throw new AgentBrowserError('profile_path_invalid'); }
	catch (error) { return Promise.reject(error instanceof Error ? error : new AgentBrowserError('profile_path_invalid')); }
	const previous = active.get(profilePath) ?? Promise.resolve();
	const task = previous.catch(() => undefined).then(async () => {
		const parent = await privateDirectory(path.dirname(profilePath)), parentStat = await fs.lstat(parent);
		const profile = path.join(parent, path.basename(profilePath)), marker = `${profile}.huhu-version.json`;
		let exists = false;
		try { const stat = await fs.lstat(profile); if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(profile) !== profile) throw new AgentBrowserError('profile_path_invalid'); exists = true; }
		catch (error) { if (!isMissing(error)) throw error; }
		let last: number[] | undefined;
		try {
			const data = JSON.parse((await readPrivateFile(marker, 1024)).toString('utf8')) as { version: unknown; chromium: unknown };
			if (data.version !== 1 || Object.keys(data).some((key) => key !== 'version' && key !== 'chromium')) throw new AgentBrowserError('profile_version_invalid');
			last = parse(data.chromium);
		} catch (error) { if (!isMissing(error)) throw new AgentBrowserError('profile_version_invalid'); }
		if (!last && exists && (await fs.readdir(profile)).length) throw new AgentBrowserError('profile_version_missing');
		if (last && older(intended, last)) throw new AgentBrowserError('profile_downgrade');
		if (!sameFile(parentStat, await fs.lstat(parent)) || await fs.realpath(path.dirname(profilePath)) !== parent) throw new AgentBrowserError('profile_path_invalid');
		if (!exists) await fs.mkdir(profile, { mode: 0o700 });
		const profileStat = await fs.lstat(profile);
		if (!profileStat.isDirectory() || profileStat.isSymbolicLink()) throw new AgentBrowserError('profile_path_invalid');
		await atomicPrivateFile(marker, JSON.stringify({ version: 1, chromium: chromiumVersion }));
		if (!sameFile(profileStat, await fs.lstat(profile)) || await fs.realpath(profile) !== profile) throw new AgentBrowserError('profile_path_invalid');
	});
	active.set(profilePath, task);
	void task.finally(() => { if (active.get(profilePath) === task) active.delete(profilePath); }).catch(() => undefined);
	return task;
}
