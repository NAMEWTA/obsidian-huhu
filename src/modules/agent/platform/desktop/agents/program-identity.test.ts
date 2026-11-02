import { cp, mkdtemp, realpath, stat, mkdir, symlink, readFile, writeFile, unlink, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { expect, onTestFinished, test } from 'vitest';
import { verifyPiArtifact, type PiArtifactLaunch } from './program-identity';

const official = process.env.HUHU_PI_ARTIFACT_TEST_ROOT;
const officialTest = test.skipIf(!official);

async function installation() {
	if (!official) throw new Error('HUHU_PI_ARTIFACT_TEST_ROOT must contain the unmodified official artifacts');
	const root = await mkdtemp(join(tmpdir(), 'huhu-t08-profile-case-'));
	onTestFinished(() => rm(root, { recursive: true, force: true }));
	await cp(join(official, 'artifact/package'), join(root, 'pi'), { recursive: true });
	await cp(join(official, 'node_modules/jiti'), join(root, 'node_modules/jiti'), { recursive: true });
	const entry = join(root, 'pi/dist/bundle/cli.js');
	const launch: PiArtifactLaunch = {
		file: process.execPath,
		args: [entry, '-ne'],
		env: { PATH: '/usr/bin:/bin' },
		cwd: root,
		deadline: performance.now() + 15_000,
	};
	return { root, entry, launch };
}

officialTest(
	'accepts the complete official Pi and actually resolved official Jiti with final Node and entry identities',
	async () => {
		const { entry, launch } = await installation();
		const result = await verifyPiArtifact(launch);
		expect(result.status).toBe('supported');
		if (result.status !== 'supported') throw new Error(result.reason);
		const node = await realpath(process.execPath);
		const identity = await stat(node, { bigint: true });
		expect(result.recipe.executable).toEqual({ path: node, dev: String(identity.dev), ino: String(identity.ino) });
		const entryStat = await stat(entry, { bigint: true });
		expect(result.recipe.entry).toEqual({ path: entry, dev: String(entryStat.dev), ino: String(entryStat.ino) });
		expect(result.recipe.profileId).toBe('pi-1.4.0-jiti-2.7.0');
		expect('piArgs' in result ? result.piArgs : undefined).toEqual(['-ne']);
		expect(result.recipe.artifactDigest).toBe('0b61d2d5fb74fef2e4c6d7df4f9e3788c7ecd74cb6e82addff1160a4bd2b33a3');
	},
	30_000,
);

// A package-manager link is admitted only at the explicitly audited independent
// package boundary; sources inside either package must still be ordinary files.
officialTest(
	'supports an independent Jiti package link at Pi root node_modules',
	async () => {
		const { root, launch } = await installation();
		await mkdir(join(root, 'pi/node_modules'));
		await symlink(join(root, 'node_modules/jiti'), join(root, 'pi/node_modules/jiti'));
		expect((await verifyPiArtifact(launch)).status).toBe('supported');
	},
	30_000,
);

async function overwriteSameSize(file: string) {
	const bytes = await readFile(file);
	bytes[bytes.length - 1] = bytes[bytes.length - 1] === 10 ? 32 : 10;
	await writeFile(file, bytes);
}

for (const [label, relative] of [
	['internal Pi code with unchanged thin CLI', 'pi/dist/bundle/chunks/jiti-static-loader-2RCDI6B4.js'],
	['actually resolved Jiti internals', 'node_modules/jiti/dist/jiti.cjs'],
] as const) {
	officialTest(
		'rejects changed ' + label,
		async () => {
			const { root, entry, launch } = await installation();
			const originalEntry = await readFile(entry);
			await overwriteSameSize(join(root, relative));
			expect(await readFile(entry)).toEqual(originalEntry);
			expect(await verifyPiArtifact(launch)).toEqual({ status: 'unavailable', reason: 'artifact-mismatch' });
		},
		30_000,
	);
}

for (const [label, alter, reason] of [
	['missing file', (root: string) => unlink(join(root, 'pi/README.md')), 'artifact-mismatch'],
	['extra source', (root: string) => writeFile(join(root, 'pi/unknown.js'), 'export {};'), 'artifact-mismatch'],
	[
		'symlinked source',
		async (root: string) => {
			await unlink(join(root, 'pi/README.md'));
			await cp(join(official!, 'artifact/package/README.md'), join(root, 'original-readme'));
			await symlink(join(root, 'original-readme'), join(root, 'pi/README.md'));
		},
		'unsupported-layout',
	],
	[
		'oversized source',
		(root: string) => writeFile(join(root, 'pi/README.md'), Buffer.alloc(3_536_720)),
		'budget-exceeded',
	],
	[
		'shadow dependency',
		async (root: string) => {
			await mkdir(join(root, 'pi/dist/bundle/chunks/node_modules'), { recursive: true });
			await writeFile(join(root, 'pi/dist/bundle/chunks/node_modules/jiti.js'), 'module.exports = {};');
		},
		'artifact-mismatch',
	],
	[
		'unknown executable package at independent boundary',
		async (root: string) => {
			await mkdir(join(root, 'pi/node_modules/other'), { recursive: true });
		},
		'unsupported-layout',
	],
	[
		'missing actual Jiti',
		(root: string) => unlink(join(root, 'node_modules/jiti/lib/jiti.cjs')),
		'artifact-mismatch',
	],
	[
		'external file module before valid Jiti',
		(root: string) => writeFile(join(root, 'node_modules/jiti.js'), 'module.exports = {};'),
		'dependency-unavailable',
	],
] as const) {
	officialTest(
		'rejects ' + label,
		async () => {
			const { root, launch } = await installation();
			await alter(root);
			expect(await verifyPiArtifact(launch)).toEqual({ status: 'unavailable', reason });
		},
		30_000,
	);
}

officialTest(
	'uses the final PATH and realpath for a direct installed CLI symlink',
	async () => {
		const { root, entry, launch } = await installation();
		await mkdir(join(root, 'bin'));
		await symlink(entry, join(root, 'bin/pi'));
		await symlink(process.execPath, join(root, 'bin/node'));
		const result = await verifyPiArtifact({
			...launch,
			file: 'pi',
			args: ['-ne'],
			env: { PATH: join(root, 'bin') },
		});
		expect(result.status).toBe('supported');
		if (result.status === 'supported') expect(result.recipe.entry.path).toBe(entry);
	},
	30_000,
);

officialTest(
	'rejects a PATH Node wrapper without running it',
	async () => {
		const { root, entry, launch } = await installation();
		await mkdir(join(root, 'bin'));
		await symlink(entry, join(root, 'bin/pi'));
		const marker = join(root, 'executed');
		await writeFile(join(root, 'bin/node'), '#!/bin/sh\n: > "' + marker + '"\n');
		await chmod(join(root, 'bin/node'), 0o700);
		const originalPath = process.env.PATH;
		try {
			process.env.PATH = dirname(process.execPath);
			const result = await verifyPiArtifact({
				...launch,
				file: entry,
				args: ['-ne'],
				env: { PATH: join(root, 'bin') },
			});
			await expect(stat(marker)).rejects.toThrow();
			expect(result).toEqual({ status: 'unavailable', reason: 'interpreter-unavailable' });
		} finally {
			process.env.PATH = originalPath;
		}
	},
	30_000,
);

for (const [label, adjust, reason] of [
	['file budget', (l: PiArtifactLaunch) => ({ ...l, limits: { maxFiles: 1294 } }), 'budget-exceeded'],
	['byte budget', (l: PiArtifactLaunch) => ({ ...l, limits: { maxBytes: 1 } }), 'budget-exceeded'],
	['expired deadline', (l: PiArtifactLaunch) => ({ ...l, deadline: performance.now() - 1 }), 'deadline-exceeded'],
	['deadline during IO', (l: PiArtifactLaunch) => ({ ...l, deadline: performance.now() + 1 }), 'deadline-exceeded'],
	[
		'cancelled',
		(l: PiArtifactLaunch) => {
			const c = new AbortController();
			c.abort();
			return { ...l, signal: c.signal };
		},
		'cancelled',
	],
	[
		'cancel during IO',
		(l: PiArtifactLaunch) => {
			const c = new AbortController();
			setTimeout(() => c.abort(), 1);
			return { ...l, signal: c.signal };
		},
		'cancelled',
	],
	[
		'Node preload flags',
		(l: PiArtifactLaunch) => ({ ...l, args: ['--import', 'unknown.js', ...l.args] }),
		'unsupported-launch',
	],
	['shell wrapper', (l: PiArtifactLaunch) => ({ ...l, file: '/bin/sh', args: ['-c', 'pi'] }), 'unsupported-launch'],
	[
		'missing final environment',
		(l: PiArtifactLaunch) => ({ ...l, env: undefined as unknown as PiArtifactLaunch['env'] }),
		'loader-environment',
	],
	[
		'Node loader environment',
		(l: PiArtifactLaunch) => ({ ...l, env: { NODE_OPTIONS: '--import x' } }),
		'loader-environment',
	],
	[
		'custom Node module path',
		(l: PiArtifactLaunch) => ({ ...l, env: { NODE_PATH: '/unknown' } }),
		'loader-environment',
	],
	['Jiti override', (l: PiArtifactLaunch) => ({ ...l, env: { JITI_NATIVE_MODULES: '["x"]' } }), 'loader-environment'],
	[
		'compile cache override',
		(l: PiArtifactLaunch) => ({ ...l, env: { NODE_COMPILE_CACHE: join(l.cwd, 'compile-cache') } }),
		'loader-environment',
	],
] as const) {
	officialTest(
		'rejects ' + label,
		async () => {
			const { launch } = await installation();
			expect(await verifyPiArtifact(adjust(launch))).toEqual({ status: 'unavailable', reason });
		},
		30_000,
	);
}

officialTest(
	'rejects the nearest changed Jiti instead of selecting a farther approved copy',
	async () => {
		const { root, launch } = await installation();
		await cp(join(root, 'node_modules/jiti'), join(root, 'pi/node_modules/jiti'), { recursive: true });
		await overwriteSameSize(join(root, 'pi/node_modules/jiti/dist/jiti.cjs'));
		expect(await verifyPiArtifact(launch)).toEqual({ status: 'unavailable', reason: 'artifact-mismatch' });
	},
	30_000,
);

officialTest(
	'captures final launch inputs before the first async boundary',
	async () => {
		const { launch } = await installation();
		const args = [...launch.args];
		const env: Record<string, string | undefined> = { ...launch.env };
		const mutable = { ...launch, args, env };
		const pending = verifyPiArtifact(mutable);
		mutable.file = '/bin/sh';
		mutable.cwd = '/does-not-exist';
		args.splice(0, args.length, '--import', 'untrusted.js');
		env.NODE_OPTIONS = '--import untrusted.js';
		expect((await pending).status).toBe('supported');
	},
	30_000,
);

officialTest(
	'accepts the audited explicit JITI_FS_CACHE=false without rewriting final environment',
	async () => {
		const { launch } = await installation();
		const env = { ...launch.env, JITI_FS_CACHE: 'false' };
		expect((await verifyPiArtifact({ ...launch, env })).status).toBe('supported');
		expect(env.JITI_FS_CACHE).toBe('false');
	},
	30_000,
);

const invalidLaunch: PiArtifactLaunch = { file: '/unselected/pi', args: [], env: {}, cwd: '/unselected', deadline: 0 };

test('rejects unbounded environment before touching an installation', async () => {
	const env = Object.fromEntries(Array.from({ length: 513 }, (_, index) => ['KEY' + index, 'value']));
	expect(await verifyPiArtifact({ ...invalidLaunch, env })).toEqual({
		status: 'unavailable',
		reason: 'budget-exceeded',
	});
});

test('rejects oversized arguments before touching an installation', async () => {
	expect(
		await verifyPiArtifact({ ...invalidLaunch, args: Array.from({ length: 32 }, () => 'a'.repeat(4096)) }),
	).toEqual({ status: 'unavailable', reason: 'budget-exceeded' });
});

test('does not invoke environment accessors while capturing final inputs', async () => {
	const env = Object.defineProperty({}, 'NODE_OPTIONS', {
		enumerable: true,
		get: () => {
			throw new Error('must never execute');
		},
	});
	expect(await verifyPiArtifact({ ...invalidLaunch, env })).toEqual({
		status: 'unavailable',
		reason: 'loader-environment',
	});
});
