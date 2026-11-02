import { afterEach, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { CHROMIUM_VERSION, installRuntimeBundle, verifyRuntimeAssets, type RuntimeManifest } from './assets';

const roots: string[] = [];
afterEach(async () => {
	for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});
const nativeTest = test.skipIf(process.platform !== 'linux' || process.arch !== 'x64');
async function fixture() {
	const root = await fs.mkdtemp(path.join(tmpdir(), 'huhu-browser-assets-'));
	roots.push(root);
	const source = path.join(root, 'source');
	await fs.mkdir(path.join(source, 'chromium'), { recursive: true });
	const files: Record<string, string> = {};
	for (const name of [
		'chromium/chrome',
		'chromium/libfixture.so',
		'huhu-browser-runtime',
		'browser-worker.cjs',
		'LICENSE',
		'NOTICE',
		'THIRD-PARTY-NOTICES.md',
	]) {
		const bytes = Buffer.from(name + '\n');
		await fs.writeFile(path.join(source, name), bytes, { mode: 0o700 });
		files[name] = createHash('sha256').update(bytes).digest('hex');
	}
	const manifest: RuntimeManifest = {
		version: 2,
		platform: 'linux-x64',
		chromiumVersion: CHROMIUM_VERSION,
		executable: 'chromium/chrome',
		helper: 'huhu-browser-runtime',
		worker: 'browser-worker.cjs',
		files,
		links: {},
	};
	const save = () => fs.writeFile(path.join(source, 'manifest.json'), JSON.stringify(manifest));
	await save();
	return { root, source, manifest, save, workerHash: files['browser-worker.cjs']! };
}
nativeTest('rejects both extra native libraries and tampered expected assets', async () => {
	const f = await fixture();
	await verifyRuntimeAssets(f.source, f.workerHash);
	await fs.writeFile(path.join(f.source, 'chromium', 'injected.so'), 'extra');
	await expect(verifyRuntimeAssets(f.source, f.workerHash)).rejects.toMatchObject({ code: 'browser_assets_invalid' });
	await fs.unlink(path.join(f.source, 'chromium', 'injected.so'));
	await fs.appendFile(path.join(f.source, 'browser-worker.cjs'), 'changed');
	await expect(verifyRuntimeAssets(f.source, f.workerHash)).rejects.toMatchObject({ code: 'browser_assets_invalid' });
});
nativeTest('only accepts internal inventoried relative links and preserves them on atomic install', async () => {
	const f = await fixture();
	f.manifest.links['chromium/alias.so'] = 'libfixture.so';
	await fs.symlink('libfixture.so', path.join(f.source, 'chromium/alias.so'));
	await f.save();
	const destination = path.join(f.root, 'installed');
	await installRuntimeBundle(f.source, destination, f.workerHash);
	await verifyRuntimeAssets(path.join(destination, 'runtime'), f.workerHash);
	expect(await fs.readlink(path.join(destination, 'runtime/chromium/alias.so'))).toBe('libfixture.so');
	await fs.unlink(path.join(f.source, 'chromium/alias.so'));
	await fs.symlink('../../outside', path.join(f.source, 'chromium/alias.so'));
	f.manifest.links['chromium/alias.so'] = '../../outside';
	await f.save();
	await expect(verifyRuntimeAssets(f.source, f.workerHash)).rejects.toMatchObject({ code: 'browser_assets_invalid' });
});
nativeTest('plugin Worker digest and pinned Chromium version are required', async () => {
	const f = await fixture();
	await expect(verifyRuntimeAssets(f.source, '0'.repeat(64))).rejects.toMatchObject({
		code: 'browser_assets_invalid',
	});
	f.manifest.chromiumVersion = '1.0.0.0';
	await f.save();
	await expect(verifyRuntimeAssets(f.source, f.workerHash)).rejects.toMatchObject({ code: 'browser_assets_invalid' });
});
