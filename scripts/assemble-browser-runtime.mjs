import { createHash } from 'node:crypto';
import { createReadStream, constants } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CHROMIUM_VERSION = '156.0.8078.47';
export const CHROME_ARCHIVE_SHA256 = 'e6c94490f0b6b337225aeb2d2a5034858516b7017356980ba94f5176d8774a50';
export const CHROME_URL = `https://storage.googleapis.com/chrome-for-testing-public/${CHROMIUM_VERSION}/linux64/chrome-linux64.zip`;
export async function sha256(file) {
	const hash = createHash('sha256');
	for await (const chunk of createReadStream(file)) hash.update(chunk);
	return hash.digest('hex');
}
/** Assemble a complete immutable local bundle, preserving upstream license files. */
export async function assemble({ chromium, helper, worker, output, root = path.resolve(import.meta.dirname, '..') }) {
	if (process.platform !== 'linux' || process.arch !== 'x64')
		throw Error('Only verified Linux x64 runtime bundles are currently supported.');
	const source = await fs.realpath(chromium);
	await fs.access(path.join(source, 'chrome'), constants.X_OK);
	const executable = await fs.open(path.join(source, 'chrome'), 'r');
	try {
		const magic = Buffer.alloc(4);
		await executable.read(magic, 0, 4, 0);
		if (!magic.equals(Buffer.from([127, 69, 76, 70]))) throw Error('Full Linux Chromium executable required.');
	} finally {
		await executable.close();
	}
	await fs.mkdir(output, { mode: 0o700 });
	try {
		// Source must be a complete pinned Chrome-for-Testing extraction; no system profile or executable lookup.
		await fs.cp(source, path.join(output, 'chromium'), {
			recursive: true,
			dereference: false,
			verbatimSymlinks: true,
		});
		await fs.copyFile(helper, path.join(output, 'huhu-browser-runtime'), constants.COPYFILE_EXCL);
		await fs.chmod(path.join(output, 'huhu-browser-runtime'), 0o700);
		await fs.copyFile(worker, path.join(output, 'browser-worker.cjs'), constants.COPYFILE_EXCL);
		for (const name of ['LICENSE', 'NOTICE', 'THIRD-PARTY-NOTICES.md'])
			await fs.copyFile(path.join(root, name), path.join(output, name), constants.COPYFILE_EXCL);
		const files = {},
			links = {};
		async function visit(directory) {
			for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) =>
				a.name.localeCompare(b.name),
			)) {
				const file = path.join(directory, entry.name),
					name = path.relative(output, file).split(path.sep).join('/');
				if (entry.isDirectory()) await visit(file);
				else if (entry.isSymbolicLink()) {
					const link = await fs.readlink(file),
						target = path.posix.normalize(path.posix.join(path.posix.dirname(name), link));
					if (path.isAbsolute(link) || target.startsWith('../') || target === '..' || target.includes('\\'))
						throw Error('Unsafe Chromium symlink');
					links[name] = link;
				} else if (entry.isFile()) files[name] = await sha256(file);
				else throw Error('Unsupported runtime asset');
			}
		}
		await visit(output);
		for (const [name, link] of Object.entries(links))
			if (!files[path.posix.normalize(path.posix.join(path.posix.dirname(name), link))])
				throw Error('Symlink must resolve directly to an inventoried file');
		const manifest = {
			version: 2,
			platform: 'linux-x64',
			chromiumVersion: CHROMIUM_VERSION,
			executable: 'chromium/chrome',
			helper: 'huhu-browser-runtime',
			worker: 'browser-worker.cjs',
			files,
			links,
		};
		await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {
			mode: 0o600,
			flag: 'wx',
		});
		console.log(
			JSON.stringify({
				output: path.resolve(output),
				chromiumVersion: CHROMIUM_VERSION,
				helperSha256: files['huhu-browser-runtime'],
				workerSha256: files['browser-worker.cjs'],
				executableSha256: files['chromium/chrome'],
				files: Object.keys(files).length,
				links: Object.keys(links).length,
			}),
		);
		return manifest;
	} catch (error) {
		await fs.rm(output, { recursive: true, force: true });
		throw error;
	}
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const [chromium, helper, worker, output] = process.argv.slice(2);
	if (!chromium || !helper || !worker || !output)
		throw Error(
			'Usage: node scripts/assemble-browser-runtime.mjs <full-chrome-dir> <helper> <worker.cjs> <new-output-dir>',
		);
	await assemble({ chromium, helper, worker, output });
}
