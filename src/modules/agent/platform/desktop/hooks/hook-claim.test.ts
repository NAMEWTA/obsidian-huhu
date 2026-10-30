import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { test } from 'vitest';
import { HOOK_PUBLISHER_SCRIPT } from './hook-spool';

/** The publisher's slot claim, run as the real generated script with an injected fs. */
function claimer(platform: string, denied: (target: string) => boolean) {
	const injected = {
		...fs,
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
		process: { platform, env: {} },
	});
	vm.runInContext(HOOK_PUBLISHER_SCRIPT, context);
	return context.hookClaim as (parent: string, count: number) => string;
}

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
