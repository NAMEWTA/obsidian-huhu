import { afterEach, expect, test } from 'vitest';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ownershipKey, readManagedOwner, writeManagedOwner, type ManagedOwner } from './ownership';

const roots: string[] = [];
afterEach(async () => {
	for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});
test.skipIf(process.platform !== 'linux')(
	'private device recovery key authenticates retention and exact root/Space identity',
	async () => {
		const directory = await fs.mkdtemp(path.join(tmpdir(), 'huhu-browser-ownership-'));
		roots.push(directory);
		const userData = path.join(directory, 'host');
		await fs.mkdir(userData);
		const root = path.join(directory, 'browser');
		const first = await ownershipKey(root, userData),
			again = await ownershipKey(root, userData);
		expect(again).toEqual(first);
		const spaceId = randomUUID(),
			profile = path.join(root, 'profiles', spaceId);
		const value: ManagedOwner = {
			version: 2,
			root: first.rootHash,
			spaceId,
			runtimeId: randomUUID(),
			ephemeral: true,
			purpose: 'space',
		};
		await writeManagedOwner(profile, value, first.key);
		expect(await readManagedOwner(profile, first.key, first.rootHash, spaceId, 'space')).toEqual(value);
		const file = profile + '.huhu-owner.json',
			text = await fs.readFile(file, 'utf8');
		await fs.writeFile(file, text.replace('"ephemeral":true', '"ephemeral":false'));
		await expect(readManagedOwner(profile, first.key, first.rootHash, spaceId, 'space')).rejects.toMatchObject({
			code: 'browser_owner_authentication_failed',
		});
		await fs.writeFile(file, text);
		await expect(readManagedOwner(profile, first.key, first.rootHash, randomUUID(), 'space')).rejects.toMatchObject(
			{ code: 'browser_owner_invalid' },
		);
	},
);
