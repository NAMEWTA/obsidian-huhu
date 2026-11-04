import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { test } from 'vitest';
import { HOOK_PUBLISHER_SCRIPT } from './hook-spool';

/** The publisher's slot claim, run as the real generated script with an injected fs. */
function publisher(platform: string, denied: (target: string) => boolean, root?: string, lstats?: string[]) {
	const injected = {
		...fs,
		lstatSync(target: string) {
			lstats?.push(target);
			return fs.lstatSync(target);
		},
		mkdirSync(target: string, options: fs.MakeDirectoryOptions) {
			if (denied(target))
				throw Object.assign(new Error(`EPERM: operation not permitted, mkdir '${target}'`), { code: 'EPERM' });
			return fs.mkdirSync(target, options);
		},
	};
	const context = vm.createContext({
		fs: injected,
		path,
		crypto,
		Buffer,
		process: { platform, env: root ? { HUHU_HOOK_ROOT: root } : {} },
	});
	vm.runInContext(HOOK_PUBLISHER_SCRIPT, context);
	return context as unknown as { hookClaim(parent: string, count: number, start?: number): string; hookPath(file: string): void };
}
const claimer = (platform: string, denied: (target: string) => boolean) => publisher(platform, denied).hookClaim;

test('a slot directory still being deleted on Windows is treated as occupied, not as a publication failure', () => {
	const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'huhu-hook-claim-'));
	try {
		// Windows reports EPERM for mkdir of a name whose previous directory is delete-pending.
		const claim = claimer('win32', (target) => path.basename(target) === '0');
		assert.equal(claim(parent, 4), path.join(parent, '1'));
		// Occupied and delete-pending slots together are ordinary capacity, which callers retry.
		assert.throws(() => claimer('win32', (target) => path.basename(target) !== '1')(parent, 4), /hookCapacity/);
		// Every slot denied and none occupied is a real permission failure and stays reported.
		const other = fs.mkdtempSync(path.join(os.tmpdir(), 'huhu-hook-claim-'));
		try {
			assert.throws(() => claimer('win32', () => true)(other, 4), { code: 'EPERM' });
		} finally {
			fs.rmSync(other, { recursive: true, force: true });
		}
		// Elsewhere EPERM has no delete-pending meaning and is never masked.
		assert.throws(() => claimer('linux', (target) => path.basename(target) === '0')(parent, 4), { code: 'EPERM' });
	} finally {
		fs.rmSync(parent, { recursive: true, force: true });
	}
});

test('a claim can start at an offset and wraps, so a busy pool is not scanned from slot 0 on every publication', () => {
	const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'huhu-hook-claim-'));
	try {
		const claim = publisher(process.platform, () => false).hookClaim;
		for (let i = 1; i < 6; i++) fs.mkdirSync(path.join(parent, String(i)));
		// Slot 0 is free, but a claim starting at 6 takes 6 on its first attempt instead of scanning from 0.
		assert.equal(claim(parent, 8, 6), path.join(parent, '6'));
		// From 7: 7 is free.
		assert.equal(claim(parent, 8, 7), path.join(parent, '7'));
		// From 7 again: 7 and then nothing up to the end, so it wraps to 0.
		assert.equal(claim(parent, 8, 7), path.join(parent, '0'));
		// Every slot taken is ordinary capacity.
		assert.throws(() => claim(parent, 8, 3), /hookCapacity/);
	} finally {
		fs.rmSync(parent, { recursive: true, force: true });
	}
});

test('the spool root and its ancestors are checked once per publisher; paths below it on every call', () => {
	const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'huhu-hook-path-')));
	try {
		const root = path.join(base, 'resource-v1');
		fs.mkdirSync(path.join(root, 'scopes', '0', 'small'), { recursive: true });
		const lstats: string[] = [];
		const { hookPath } = publisher(process.platform, () => false, root, lstats);
		const file = path.join(root, 'scopes', '0', 'small', 'ref.json');
		hookPath(file);
		const first = lstats.length;
		lstats.length = 0;
		hookPath(file);
		// Second call: only the components below the root (ref.json, small, 0, scopes).
		assert.equal(lstats.length, 4);
		assert.ok(first > lstats.length);
		assert.ok(lstats.every((target) => target.startsWith(root + path.sep)));
		// A symlink below the root is still refused after the root was cached.
		if (process.platform !== 'win32') {
			fs.symlinkSync(path.join(root, 'scopes', '0'), path.join(root, 'scopes', '1'));
			assert.throws(() => hookPath(path.join(root, 'scopes', '1', 'small')), /hookSpoolSymlink/);
			// And a symlinked root itself is refused by a fresh publisher.
			fs.symlinkSync(root, path.join(base, 'linked'));
			assert.throws(
				() =>
					publisher(process.platform, () => false, path.join(base, 'linked')).hookPath(
						path.join(base, 'linked', 'scopes'),
					),
				/hookSpoolSymlink/,
			);
		}
	} finally {
		fs.rmSync(base, { recursive: true, force: true });
	}
});
