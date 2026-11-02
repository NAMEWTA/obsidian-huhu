import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { prepareProfileVersion } from './profile-version';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
async function setup() { const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-profile-version-')); roots.push(root); return { root, profile: path.join(root, 'profile') }; }
describe('profile last writer guard', () => {
	it('records before launch and permits equal or newer Chromium versions, never a downgrade', async () => {
		const { profile } = await setup(); await prepareProfileVersion(profile, '156.0.1.9'); await fs.writeFile(path.join(profile, 'Cookies'), 'existing profile data');
		await prepareProfileVersion(profile, '156.0.1.9'); await prepareProfileVersion(profile, '156.0.2.0');
		await expect(prepareProfileVersion(profile, '156.0.1.10')).rejects.toMatchObject({ code: 'profile_downgrade' });
		expect(await fs.readFile(path.join(profile, 'Cookies'), 'utf8')).toBe('existing profile data');
		expect(JSON.parse(await fs.readFile(`${profile}.huhu-version.json`, 'utf8'))).toEqual({ version: 1, chromium: '156.0.2.0' });
	});
	it('only permits missing markers on new or empty profiles, and rejects malformed markers', async () => {
		const { profile } = await setup(); await fs.mkdir(profile); await fs.writeFile(path.join(profile, 'Cookies'), 'legacy');
		await expect(prepareProfileVersion(profile, '156.0.0.1')).rejects.toMatchObject({ code: 'profile_version_missing' });
		await fs.writeFile(`${profile}.huhu-version.json`, '{}'); await expect(prepareProfileVersion(profile, '156.0.0.1')).rejects.toMatchObject({ code: 'profile_version_invalid' });
	});
	it('rejects profile and marker links and serializes racing upgrade/downgrade attempts', async () => {
		const { root, profile } = await setup(); await fs.mkdir(path.join(root, 'outside')); await fs.symlink(path.join(root, 'outside'), profile);
		await expect(prepareProfileVersion(profile, '156.0.0.1')).rejects.toMatchObject({ code: 'profile_path_invalid' }); await fs.unlink(profile);
		await fs.writeFile(path.join(root, 'marker'), JSON.stringify({ version: 1, chromium: '155.0.0.0' })); await fs.symlink(path.join(root, 'marker'), `${profile}.huhu-version.json`);
		await expect(prepareProfileVersion(profile, '156.0.0.1')).rejects.toMatchObject({ code: 'profile_version_invalid' }); await fs.unlink(`${profile}.huhu-version.json`);
		const upgraded = prepareProfileVersion(profile, '157.0.0.0'), downgraded = prepareProfileVersion(profile, '156.0.0.1'); await upgraded; await expect(downgraded).rejects.toMatchObject({ code: 'profile_downgrade' });
	});
});
