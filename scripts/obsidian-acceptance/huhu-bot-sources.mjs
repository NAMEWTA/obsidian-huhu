// User-run host probe. Always uses fresh-vault's new disposable Vault and profile.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { launchFreshVault } from './fresh-vault.mjs';

const bundled = await build({
	stdin: { contents: `export { ObsidianSources } from './src/modules/huhubot/platform/obsidian/sources/sources.ts';
export { HostReadService } from './src/modules/huhubot/services/host-read/host-read.ts';`, resolveDir: process.cwd(), loader: 'ts' },
	bundle: true, platform: 'browser', format: 'cjs', target: 'es2021', external: ['obsidian'], write: false, logLevel: 'error',
});
const bundle = bundled.outputFiles[0].text;
const bundleHash = createHash('sha256').update(bundle).digest('hex');
assert.ok(bundle.includes('ObsidianSources') && bundle.includes('HostReadService'));
if (process.argv[2] === '--check') {
	console.log(JSON.stringify({ mode: 'bundle-check', bundleHash, bytes: Buffer.byteLength(bundle), hostRun: false }));
} else {
	const root = process.argv[2];
	assert.ok(root && path.isAbsolute(root), 'Pass an absolute NEW fixture root, or --check');
	const pluginMain = await fs.readFile(path.join(process.env.HUHU_PLUGIN_SOURCE || process.cwd(), 'main.js'), 'utf8');
	const runtime = await launchFreshVault({ root, port: 9298, files: {
		'.obsidian/plugins/huhu/main.js': 'window.huhuSourcesProbeObsidian = require("obsidian");\n' + pluginMain,
		'One.md': 'one disk sentinel\n', 'Two.md': 'two explicit sentinel\n', 'Private.md': 'third forbidden sentinel\n',
	} });
	try {
		const result = await runtime.connection.evaluate(`(async () => {
			const module = { exports: {} };
			new Function('require', 'module', 'exports', ${JSON.stringify(bundle)})(
				name => { if (name !== 'obsidian') throw Error('Unexpected probe import'); return window.huhuSourcesProbeObsidian; }, module, module.exports);
			const { ObsidianSources, HostReadService } = module.exports;
			const timers = { after: (ms, run) => { const timer = window.setTimeout(run, ms); return () => window.clearTimeout(timer); } };
			const adapter = new ObsidianSources(app, { workspaceId: 'probe:workspace', originClientId: 'probe:client', timers });
			const host = new HostReadService(adapter, timers);
			const lease = { leaseId: 'probe:lease', hostConnectionId: 'probe:connection', leaseEpoch: '1', workspaceId: 'probe:workspace',
				capabilities: ['note.read', 'note.search'], expiresAt: new Date(Date.now() + 60000).toISOString() };
			host.setLease(lease);
			const counts = {};
			const originalRead = app.vault.read;
			app.vault.read = async function(file) { counts[file.path] = (counts[file.path] || 0) + 1; return originalRead.call(this, file); };
			try {
				const one = app.vault.getFileByPath('One.md'), two = app.vault.getFileByPath('Two.md');
				const firstLeaf = app.workspace.getLeaf('tab'); await firstLeaf.openFile(one);
				const firstView = firstLeaf.view;
				firstView.editor.setValue('甲😀\\n乙😀尾');
				firstView.editor.setSelection({ line: 0, ch: 1 }, { line: 1, ch: 3 });
				const capturing = adapter.captureSelection(firstView);
				const secondSource = await adapter.captureNote(two, firstLeaf);
				const secondLeaf = app.workspace.getLeaf('window'); await secondLeaf.openFile(two);
				app.workspace.setActiveLeaf(secondLeaf, { focus: true });
				const firstSource = await capturing;
				const envelope = { leaseId: lease.leaseId, hostConnectionId: lease.hostConnectionId, leaseEpoch: lease.leaseEpoch, workspaceId: lease.workspaceId };
				const selected = await host.read({ ...envelope, source: firstSource, maxBytes: 65536 }, new AbortController().signal);
				const note = await host.read({ ...envelope, source: secondSource, maxBytes: 65536 }, new AbortController().signal);
				const searched = await host.search({ ...envelope, sources: [firstSource, secondSource], scopes: [], query: '乙😀', limit: 2, maxBytes: 65536 }, new AbortController().signal);
				firstView.editor.setValue('changed after capture');
				const opened = await adapter.openSource(firstSource);
				let forgedRejected = false;
				try { await host.read({ ...envelope, source: { ...firstSource, resourceId: '/etc/passwd' }, maxBytes: 64 }, new AbortController().signal); }
				catch { forgedRejected = true; }
				host.setLease(undefined);
				let detachedRejected = false;
				try { await host.read({ ...envelope, source: firstSource, maxBytes: 64 }, new AbortController().signal); }
				catch { detachedRejected = true; }
				return { selectedExact: selected.text === '😀\\n乙😀', noteExact: note.text === 'two explicit sentinel\\n',
					originalRange: firstSource.range, searchRange: searched.matches[0]?.range,
					changed: opened.changed, forgedRejected, detachedRejected, privateReads: counts['Private.md'] || 0,
					popout: secondLeaf.view.containerEl.ownerDocument !== firstView.containerEl.ownerDocument,
					readPaths: Object.keys(counts), sources: [firstSource, secondSource] };
			} finally { app.vault.read = originalRead; host.dispose(); adapter.dispose(); }
		})()`);
		assert.equal(result.selectedExact, true);
		assert.equal(result.noteExact, true);
		assert.deepEqual(result.originalRange, { start: 1, end: 7 });
		assert.deepEqual(result.searchRange, { start: 4, end: 7 });
		for (const key of ['changed', 'forgedRejected', 'detachedRejected', 'popout']) assert.equal(result[key], true, key);
		assert.equal(result.privateReads, 0);
		await fs.writeFile(path.join(runtime.evidence, 'huhu-bot-sources.json'), JSON.stringify({ bundleHash, result }, null, 2));
		console.log(JSON.stringify({ mode: 'host-probe', bundleHash, passed: true, evidence: runtime.evidence }));
	} finally { await runtime.stop(); }
}
