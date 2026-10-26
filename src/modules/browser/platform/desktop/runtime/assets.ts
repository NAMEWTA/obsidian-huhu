import { constants, createReadStream, promises as fs } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { AgentBrowserError } from '../../../core/contracts';
import { isMissing, privateDirectory, readPrivateFile, sameFile, syncDirectory } from '../persistence/private-files';

export const CHROMIUM_VERSION = '156.0.8078.47';
export interface RuntimeManifest {
	version: 2;
	platform: 'linux-x64';
	chromiumVersion: string;
	executable: string;
	helper: string;
	worker: string;
	files: Record<string, string>;
	links: Record<string, string>;
}
export interface RuntimeAssets {
	root: string;
	manifest: RuntimeManifest;
	executable: string;
	helper: string;
	worker: string;
}
function relative(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length > 0 &&
		value.length <= 512 &&
		!value.includes('\\') &&
		!value.includes('\0') &&
		!path.posix.isAbsolute(value) &&
		value.split('/').every((part) => part && part !== '.' && part !== '..')
	);
}
function parse(value: unknown, workerHash: string): RuntimeManifest {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new AgentBrowserError('browser_assets_invalid');
	const manifest = value as RuntimeManifest;
	if (
		manifest.version !== 2 ||
		manifest.platform !== 'linux-x64' ||
		manifest.chromiumVersion !== CHROMIUM_VERSION ||
		manifest.executable !== 'chromium/chrome' ||
		manifest.helper !== 'huhu-browser-runtime' ||
		manifest.worker !== 'browser-worker.cjs' ||
		!manifest.files ||
		typeof manifest.files !== 'object' ||
		Array.isArray(manifest.files) ||
		!manifest.links ||
		typeof manifest.links !== 'object' ||
		Array.isArray(manifest.links)
	)
		throw new AgentBrowserError('browser_assets_invalid');
	const names = [...Object.keys(manifest.files), ...Object.keys(manifest.links)];
	if (
		names.length > 10000 ||
		names.some((name) => !relative(name) || name === 'manifest.json') ||
		new Set(names).size !== names.length ||
		Object.values(manifest.files).some((hash) => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) ||
		Object.values(manifest.links).some(
			(link) =>
				typeof link !== 'string' ||
				!link ||
				link.includes('\0') ||
				link.includes('\\') ||
				path.posix.isAbsolute(link),
		) ||
		manifest.files[manifest.worker] !== workerHash ||
		!manifest.files[manifest.helper] ||
		!manifest.files[manifest.executable] ||
		['LICENSE', 'NOTICE', 'THIRD-PARTY-NOTICES.md'].some((name) => !manifest.files[name])
	)
		throw new AgentBrowserError('browser_assets_invalid');
	return manifest;
}
async function hashFile(file: string): Promise<string> {
	const before = await fs.lstat(file);
	if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > 1024 * 1024 * 1024)
		throw new AgentBrowserError('browser_assets_invalid');
	const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
	try {
		if (!sameFile(before, await handle.stat())) throw new AgentBrowserError('browser_assets_changed');
		const hash = createHash('sha256');
		const stream = createReadStream(file, { fd: handle.fd, autoClose: false });
		for await (const chunk of stream) hash.update(chunk as Buffer);
		const after = await handle.stat();
		if (
			!sameFile(before, after) ||
			before.size !== after.size ||
			before.mtimeMs !== after.mtimeMs ||
			before.ctimeMs !== after.ctimeMs ||
			!sameFile(after, await fs.lstat(file))
		)
			throw new AgentBrowserError('browser_assets_changed');
		return hash.digest('hex');
	} finally {
		await handle.close();
	}
}
/** Every file and link is authenticated. Unlisted libraries/executables are never tolerated. */
export async function verifyRuntimeAssets(directory: string, workerHash: string): Promise<RuntimeAssets> {
	if (process.platform !== 'linux' || process.arch !== 'x64')
		throw new AgentBrowserError('browser_platform_unsupported');
	const stat = await fs.lstat(directory),
		root = path.resolve(directory);
	if (!stat.isDirectory() || stat.isSymbolicLink() || (await fs.realpath(root)) !== root)
		throw new AgentBrowserError('browser_assets_invalid');
	const manifestBytes = await readPrivateFile(path.join(root, 'manifest.json'), 2 * 1024 * 1024);
	const manifest = parse(JSON.parse(manifestBytes.toString('utf8')), workerHash);
	const found = new Set<string>();
	let total = 0;
	const visit = async (folder: string): Promise<void> => {
		for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
			if (++total > 12000) throw new AgentBrowserError('browser_assets_limit');
			const file = path.join(folder, entry.name),
				name = path.relative(root, file).split(path.sep).join('/');
			if (!relative(name)) throw new AgentBrowserError('browser_assets_invalid');
			if (entry.isDirectory()) {
				await visit(file);
				continue;
			}
			if (name === 'manifest.json') {
				if (!entry.isFile()) throw new AgentBrowserError('browser_assets_invalid');
				continue;
			}
			found.add(name);
			if (entry.isSymbolicLink()) {
				const link = await fs.readlink(file),
					declared = manifest.links[name];
				const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), link));
				if (declared !== link || !relative(target) || !manifest.files[target] || manifest.links[target])
					throw new AgentBrowserError('browser_assets_invalid');
				if ((await fs.realpath(file)) !== path.join(root, target))
					throw new AgentBrowserError('browser_assets_invalid');
			} else if (!entry.isFile() || !manifest.files[name] || (await hashFile(file)) !== manifest.files[name])
				throw new AgentBrowserError('browser_assets_invalid');
		}
	};
	await visit(root);
	if (
		[...Object.keys(manifest.files), ...Object.keys(manifest.links)].some((name) => !found.has(name)) ||
		!sameFile(stat, await fs.lstat(root)) ||
		!(await readPrivateFile(path.join(root, 'manifest.json'), 2 * 1024 * 1024)).equals(manifestBytes)
	)
		throw new AgentBrowserError('browser_assets_changed');
	await fs.access(path.join(root, manifest.executable), constants.X_OK);
	await fs.access(path.join(root, manifest.helper), constants.X_OK);
	return {
		root,
		manifest,
		executable: path.join(root, manifest.executable),
		helper: path.join(root, manifest.helper),
		worker: path.join(root, manifest.worker),
	};
}
/** User-selected complete bundle only. No network fetch, installer script, or Agent caller. */
export async function installRuntimeBundle(source: string, dataRoot: string, workerHash: string): Promise<void> {
	const verified = await verifyRuntimeAssets(source, workerHash),
		root = await privateDirectory(dataRoot);
	const target = path.join(root, 'runtime'),
		stage = path.join(root, 'runtime-install-' + randomUUID()),
		old = path.join(root, 'runtime-old-' + randomUUID());
	await fs.mkdir(stage, { mode: 0o700 });
	let moved = false;
	let published = false;
	try {
		for (const name of Object.keys(verified.manifest.files)) {
			const destination = path.join(stage, name);
			await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
			const before = await fs.lstat(path.join(source, name));
			if (!before.isFile() || before.isSymbolicLink()) throw new AgentBrowserError('browser_assets_changed');
			await fs.copyFile(path.join(source, name), destination, constants.COPYFILE_EXCL);
			await fs.chmod(destination, before.mode & 0o111 ? 0o700 : 0o600);
		}
		for (const [name, link] of Object.entries(verified.manifest.links)) {
			const file = path.join(stage, name);
			await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
			await fs.symlink(link, file);
		}
		await fs.writeFile(path.join(stage, 'manifest.json'), JSON.stringify(verified.manifest), {
			flag: 'wx',
			mode: 0o600,
		});
		await verifyRuntimeAssets(stage, workerHash);
		try {
			const current = await fs.lstat(target);
			if (!current.isDirectory() || current.isSymbolicLink())
				throw new AgentBrowserError('browser_assets_invalid');
			await fs.rename(target, old);
			moved = true;
		} catch (error) {
			if (!isMissing(error)) throw error;
		}
		await fs.rename(stage, target);
		published = true;
		await syncDirectory(root);
		if (moved) await fs.rm(old, { recursive: true });
	} catch (error) {
		if (moved && !published) await fs.rename(old, target);
		throw error;
	} finally {
		if (!published) await fs.rm(stage, { recursive: true, force: true });
	}
}
