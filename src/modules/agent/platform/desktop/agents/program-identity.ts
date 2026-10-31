import type { NativeEditorFileIdentity, NativeEditorRecipe } from '../../../../../shared/native/control-wire.generated';

export interface PiArtifactLaunch {
	readonly file: string;
	readonly args: readonly string[];
	/** Complete final spawn environment. No values are inherited from this process. */
	readonly env: Readonly<Record<string, string | undefined>>;
	readonly cwd: string;
	readonly signal?: AbortSignal;
	/** Absolute performance.now() deadline in this process; capped at 15 seconds. */
	readonly deadline: number;
	readonly limits?: { readonly maxFiles?: number; readonly maxBytes?: number };
}
export type PiArtifactVerification =
	| { readonly status: 'supported'; readonly recipe: NativeEditorRecipe; readonly piArgs: readonly string[] }
	| { readonly status: 'unavailable'; readonly reason: PiArtifactUnavailableReason };
export type PiArtifactUnavailableReason =
	| 'unsupported-platform'
	| 'unsupported-launch'
	| 'loader-environment'
	| 'artifact-mismatch'
	| 'unsupported-layout'
	| 'interpreter-unavailable'
	| 'dependency-unavailable'
	| 'budget-exceeded'
	| 'cancelled'
	| 'deadline-exceeded'
	| 'io-error';

type RecordEntry = readonly [string, number, string];
/** Decoded once per process on first desktop Pi verification. */
let cachedProfiles: { profiles: (ArtifactProfile | undefined)[] } | undefined;

interface ArtifactProfile {
	readonly id: string;
	readonly pi: PackageProfile & { readonly entry: string };
	readonly jiti: PackageProfile;
	readonly jitiLoader: string;
	readonly jitiEntry: string;
}
interface PackageProfile {
	readonly records: readonly RecordEntry[];
	readonly fileCount: number;
	readonly totalFileBytes: number;
	readonly maxFileBytes: number;
	readonly fileSetSha256: string;
}
class Unavailable extends Error {
	constructor(readonly reason: PiArtifactUnavailableReason) {
		super(reason);
	}
}

/**
 * Read-only enrollment check, not Node authentication or an atomic hash-to-submit guarantee.
 * Call after final file/argv/env/cwd preparation; launch those same inputs and let native
 * recheck the returned physical identities. This does not add flags or approve extensions.
 */
export async function verifyPiArtifact(launch: PiArtifactLaunch): Promise<PiArtifactVerification> {
	try {
		return await verify(captureLaunch(launch));
	} catch (error) {
		return { status: 'unavailable', reason: error instanceof Unavailable ? error.reason : 'io-error' };
	}
}

function captureLaunch(input: PiArtifactLaunch): PiArtifactLaunch {
	const bounded = (value: unknown, max: number): value is string =>
		typeof value === 'string' && !value.includes('\0') && Buffer.byteLength(value) <= max;
	if (
		!bounded(input.file, 4096) ||
		!bounded(input.cwd, 4096) ||
		!Array.isArray(input.args) ||
		input.args.length > 256
	)
		throw new Unavailable('unsupported-launch');
	let argBytes = 0;
	const args: string[] = [];
	for (const arg of input.args as readonly unknown[]) {
		if (!bounded(arg, 4096) || (argBytes += Buffer.byteLength(arg)) > 64 * 1024)
			throw new Unavailable('budget-exceeded');
		args.push(arg);
	}
	if (!input.env || typeof input.env !== 'object') throw new Unavailable('loader-environment');
	const env: Record<string, string | undefined> = Object.create(null) as Record<string, string | undefined>;
	let envCount = 0;
	let envBytes = 0;
	for (const key in input.env) {
		if (!Object.prototype.hasOwnProperty.call(input.env, key)) continue;
		if (++envCount > 512 || !bounded(key, 256)) throw new Unavailable('budget-exceeded');
		const property = Object.getOwnPropertyDescriptor(input.env, key);
		if (!property || !('value' in property)) throw new Unavailable('loader-environment');
		const value: unknown = property.value;
		if (value !== undefined && (typeof value !== 'string' || !bounded(value, 32 * 1024)))
			throw new Unavailable('loader-environment');
		envBytes += Buffer.byteLength(key) + (typeof value === 'string' ? Buffer.byteLength(value) : 0);
		if (envBytes > 128 * 1024) throw new Unavailable('budget-exceeded');
		env[key] = value;
	}
	return {
		file: input.file,
		args,
		env,
		cwd: input.cwd,
		signal: input.signal,
		deadline: input.deadline,
		limits: input.limits && { maxFiles: input.limits.maxFiles, maxBytes: input.limits.maxBytes },
	};
}

async function verify(launch: PiArtifactLaunch): Promise<PiArtifactVerification> {
	if (process.platform !== 'linux' && process.platform !== 'darwin') throw new Unavailable('unsupported-platform');
	const end = Math.min(launch.deadline, performance.now() + 15_000);
	const check = () => {
		if (launch.signal?.aborted) throw new Unavailable('cancelled');
		if (!Number.isFinite(end) || performance.now() >= end) throw new Unavailable('deadline-exceeded');
	};
	check();
	// Loader hooks, custom resolution, dynamic-linker injection and Jiti overrides invalidate
	// the audited mechanism. In particular an empty NODE_OPTIONS is harmless, not inherited.
	if (
		!launch.env ||
		Object.entries(launch.env).some(
			([key, value]) =>
				value !== undefined &&
				value !== '' &&
				(/^(NODE_OPTIONS|NODE_PATH|NODE_COMPILE_CACHE|LD_PRELOAD|LD_LIBRARY_PATH)$/.test(key) ||
					(key.startsWith('JITI_') && !(key === 'JITI_FS_CACHE' && value === 'false')) ||
					key.startsWith('DYLD_')),
		)
	)
		throw new Unavailable('loader-environment');
	const [{ PI_ARTIFACT_PROFILES_BROTLI_BASE64 }, zlib, fs, path, crypto, childProcess, { constants }] =
		await Promise.all([
			import('./pi-artifact-profiles.generated'),
			import('node:zlib'),
			import('node:fs/promises'),
			import('node:path'),
			import('node:crypto'),
			import('node:child_process'),
			import('node:fs'),
		]);
	check();
	cachedProfiles ??= JSON.parse(
		zlib.brotliDecompressSync(Buffer.from(PI_ARTIFACT_PROFILES_BROTLI_BASE64, 'base64')).toString('utf8'),
	) as { profiles: (ArtifactProfile | undefined)[] };
	const profiles = cachedProfiles;
	const profile = profiles.profiles[0];
	if (
		!profile ||
		!path.isAbsolute(launch.cwd) ||
		!launch.file ||
		launch.args.length > 256 ||
		launch.args.some((arg) => arg.includes('\0') || Buffer.byteLength(arg) > 4096) ||
		launch.file.includes('\0')
	)
		throw new Unavailable('unsupported-launch');
	const cwd = await fs.realpath(launch.cwd);
	if (!(await fs.stat(cwd)).isDirectory()) throw new Unavailable('unsupported-launch');
	async function exists(file: string): Promise<boolean> {
		check();
		try {
			await fs.lstat(file);
			check();
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
			throw error;
		}
	}
	async function identity(file: string): Promise<NativeEditorFileIdentity> {
		check();
		const resolved = await fs.realpath(file);
		const info = await fs.stat(resolved, { bigint: true });
		check();
		if (!info.isFile() || Buffer.byteLength(resolved) > 4096) throw new Unavailable('unsupported-launch');
		return { path: resolved, dev: String(info.dev), ino: String(info.ino) };
	}
	async function executable(file: string): Promise<NativeEditorFileIdentity> {
		if (file.includes('/') || path.isAbsolute(file)) {
			const result = await identity(path.resolve(cwd, file));
			await fs.access(result.path, 1);
			return result;
		}
		const search = launch.env.PATH?.split(':');
		if (!search || search.length > 64 || search.some((part) => !path.isAbsolute(part)))
			throw new Unavailable('interpreter-unavailable');
		for (const directory of search) {
			const candidate = path.join(directory, file);
			if (!(await exists(candidate))) continue;
			try {
				await fs.access(candidate, 1);
			} catch {
				continue;
			}
			return identity(candidate);
		}
		throw new Unavailable('interpreter-unavailable');
	}
	const invoked = await executable(launch.file);
	let piArgOffset = 0;
	let node: NativeEditorFileIdentity;
	let entry: NativeEditorFileIdentity;
	if (invoked.path.endsWith('/' + profile.pi.entry)) {
		entry = invoked;
		node = await executable('node'); // Approved CLI's exact #!/usr/bin/env node.
	} else {
		if (path.basename(invoked.path) !== 'node' || !launch.args[0] || launch.args[0].startsWith('-'))
			throw new Unavailable('unsupported-launch');
		piArgOffset = 1;
		node = invoked;
		entry = await identity(path.resolve(cwd, launch.args[0]));
	}
	const interpreter = await fs.open(node.path, constants.O_RDONLY | constants.O_NOFOLLOW);
	try {
		const magic = Buffer.alloc(4);
		const read = await interpreter.read(magic, 0, 4, 0);
		const supportedMagic =
			process.platform === 'linux'
				? ['7f454c46']
				: ['feedface', 'feedfacf', 'cefaedfe', 'cffaedfe', 'cafebabe', 'bebafeca', 'cafebabf', 'bfbafeca'];
		if (read.bytesRead !== 4 || !supportedMagic.includes(magic.toString('hex')))
			throw new Unavailable('interpreter-unavailable');
	} finally {
		await interpreter.close();
	}
	if (!entry.path.endsWith('/' + profile.pi.entry)) throw new Unavailable('unsupported-launch');
	const piRoot = entry.path.slice(0, -profile.pi.entry.length - 1);
	let files = 0;
	let bytes = 0;
	const maxFiles = Math.min(profile.pi.fileCount + profile.jiti.fileCount, launch.limits?.maxFiles ?? Infinity);
	const maxBytes = Math.min(
		profile.pi.totalFileBytes + profile.jiti.totalFileBytes,
		launch.limits?.maxBytes ?? Infinity,
	);
	if (!Number.isInteger(maxFiles) || maxFiles < 0 || !Number.isInteger(maxBytes) || maxBytes < 0)
		throw new Unavailable('budget-exceeded');
	async function verifyPackage(root: string, expected: PackageProfile): Promise<void> {
		const records = new Map(expected.records.map((record) => [record[0], record]));
		const directories = new Set<string>(['']);
		for (const [file] of expected.records) {
			let parent = path.posix.dirname(file);
			while (parent !== '.') {
				directories.add(parent);
				parent = path.posix.dirname(parent);
			}
		}
		const found = new Set<string>();
		let seenDirectories = 0;
		async function walk(relative: string): Promise<void> {
			check();
			if (++seenDirectories > directories.size) throw new Unavailable('budget-exceeded');
			const directory = await fs.opendir(path.join(root, relative));
			try {
				for (;;) {
					check();
					const item = await directory.read();
					if (!item) break;
					const name = relative ? relative + '/' + item.name : item.name;
					if (root === piRoot && name === 'node_modules' && item.isDirectory()) {
						const dependencies = await fs.opendir(path.join(root, name));
						try {
							const dependency = await dependencies.read();
							if (
								!dependency ||
								dependency.name !== 'jiti' ||
								(!dependency.isDirectory() && !dependency.isSymbolicLink()) ||
								(await dependencies.read())
							)
								throw new Unavailable('unsupported-layout');
						} finally {
							await dependencies.close();
						}
						continue;
					}
					if (item.isSymbolicLink()) throw new Unavailable('unsupported-layout');
					if (item.isDirectory() && directories.has(name)) {
						await walk(name);
						continue;
					}
					const record = records.get(name);
					if (!item.isFile() || !record || found.has(name)) throw new Unavailable('artifact-mismatch');
					found.add(name);
					if (++files > maxFiles) throw new Unavailable('budget-exceeded');
					const full = path.join(root, name);
					const handle = await fs.open(full, constants.O_RDONLY | constants.O_NOFOLLOW);
					try {
						const before = await handle.stat({ bigint: true });
						if (
							!before.isFile() ||
							before.size > BigInt(expected.maxFileBytes) ||
							bytes + Number(before.size) > maxBytes
						)
							throw new Unavailable('budget-exceeded');
						if (before.size !== BigInt(record[1])) throw new Unavailable('artifact-mismatch');
						const hash = crypto.createHash('sha256');
						const buffer = Buffer.alloc(64 * 1024);
						let read = 0;
						while (read < record[1]) {
							check();
							const chunk = await handle.read(buffer, 0, Math.min(buffer.length, record[1] - read), read);
							if (!chunk.bytesRead) throw new Unavailable('artifact-mismatch');
							read += chunk.bytesRead;
							bytes += chunk.bytesRead;
							hash.update(buffer.subarray(0, chunk.bytesRead));
						}
						const after = await handle.stat({ bigint: true });
						if (
							before.dev !== after.dev ||
							before.ino !== after.ino ||
							before.size !== after.size ||
							before.mtimeNs !== after.mtimeNs ||
							before.ctimeNs !== after.ctimeNs ||
							hash.digest('hex') !== record[2]
						)
							throw new Unavailable('artifact-mismatch');
					} finally {
						await handle.close();
					}
				}
			} finally {
				await directory.close();
			}
		}
		await walk('');
		if (found.size !== expected.fileCount) throw new Unavailable('artifact-mismatch');
	}
	for (const expected of [profile.pi, profile.jiti]) {
		const digest = crypto.createHash('sha256');
		for (const record of expected.records) digest.update(JSON.stringify(record) + '\n');
		if (digest.digest('hex') !== expected.fileSetSha256) throw new Unavailable('artifact-mismatch');
	}
	await verifyPackage(piRoot, profile.pi);
	// Node walks ancestor node_modules from this exact bundled createRequire location.
	// Resolve only after the first candidate's ENTIRE package is verified: its exports
	// metadata is then bounded and trusted. Global fallback and unknown file modules fail.
	const loader = path.join(piRoot, profile.jitiLoader);
	let ancestor = path.dirname(loader);
	let jitiRoot: string | undefined;
	for (let depth = 0; depth < 64; depth++) {
		check();
		if (path.basename(ancestor) !== 'node_modules') {
			const candidate = path.join(ancestor, 'node_modules/jiti');
			for (const extension of ['.js', '.json', '.node'])
				if (await exists(candidate + extension)) throw new Unavailable('dependency-unavailable');
			if (await exists(candidate)) {
				jitiRoot = await fs.realpath(candidate);
				break;
			}
		}
		const parent = path.dirname(ancestor);
		if (parent === ancestor) break;
		ancestor = parent;
	}
	if (!jitiRoot) throw new Unavailable('dependency-unavailable');
	await verifyPackage(jitiRoot, profile.jiti);
	check();
	const probe =
		'const {createRequire}=require("node:module");const r=createRequire(process.argv[1]);process.stdout.write(JSON.stringify({name:process.release.name,version:process.versions.node,execPath:process.execPath,jiti:r.resolve("jiti")}));';
	const output = await new Promise<string>((resolve, reject) => {
		const child = childProcess.execFile(
			node.path,
			['--input-type=commonjs', '-e', probe, loader],
			{
				cwd,
				env: { ...launch.env },
				timeout: Math.max(1, Math.min(2000, end - performance.now())),
				maxBuffer: 16 * 1024,
				encoding: 'utf8',
				killSignal: 'SIGKILL',
			},
			(error, stdout, stderr) => {
				launch.signal?.removeEventListener('abort', cancel);
				if (launch.signal?.aborted) reject(new Unavailable('cancelled'));
				else if (performance.now() >= end) reject(new Unavailable('deadline-exceeded'));
				else if (error || stderr) reject(new Unavailable('interpreter-unavailable'));
				else resolve(stdout);
			},
		);
		const cancel = () => {
			child.kill('SIGKILL');
		};
		launch.signal?.addEventListener('abort', cancel, { once: true });
		if (launch.signal?.aborted) cancel();
	});
	check();
	let probed: unknown;
	try {
		probed = JSON.parse(output);
	} catch {
		throw new Unavailable('interpreter-unavailable');
	}
	if (
		!probed ||
		typeof probed !== 'object' ||
		!('name' in probed) ||
		probed.name !== 'node' ||
		!('version' in probed) ||
		typeof probed.version !== 'string' ||
		!('execPath' in probed) ||
		typeof probed.execPath !== 'string' ||
		!('jiti' in probed) ||
		typeof probed.jiti !== 'string'
	)
		throw new Unavailable('interpreter-unavailable');
	const version = probed.version.split('.').map(Number);
	if (
		(version[0] ?? 0) < 22 ||
		(version[0] === 22 && (version[1] ?? 0) < 19) ||
		(await fs.realpath(probed.execPath)) !== node.path
	)
		throw new Unavailable('interpreter-unavailable');
	if ((await fs.realpath(probed.jiti)) !== path.join(jitiRoot, profile.jitiEntry))
		throw new Unavailable('dependency-unavailable');
	const finalNode = await identity(node.path);
	const finalEntry = await identity(entry.path);
	if (JSON.stringify(finalNode) !== JSON.stringify(node) || JSON.stringify(finalEntry) !== JSON.stringify(entry))
		throw new Unavailable('artifact-mismatch');
	check();
	// Path-independent digest of the two complete approved content sets, with a domain tag.
	const artifactDigest = crypto
		.createHash('sha256')
		.update(JSON.stringify(['huhu-pi-artifact-v1', profile.pi.fileSetSha256, profile.jiti.fileSetSha256]) + '\n')
		.digest('hex');
	return {
		status: 'supported',
		piArgs: Object.freeze(launch.args.slice(piArgOffset)),
		recipe: { version: 1, profileId: profile.id, artifactDigest, executable: node, entry },
	};
}
