// User-run whole-product acceptance for a NEW disposable Vault/Profile.
// `--check` is safe in CI and only verifies the acceptance entry is wired; a
// live run requires HUHU_OBSIDIAN_EXECUTABLE and never touches an existing root.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { launchFreshVault } from './fresh-vault.mjs';

const sourceRoot = process.env.HUHU_PLUGIN_SOURCE || process.cwd();
const required = [
	'src/modules/huhubot/module.ts',
	'src/modules/huhubot/ui/workbench-page.ts',
	'src/modules/huhubot/ui/data/workbench-page.ts',
	'native/huhubot/cmd/huhubot/main.go',
];

async function checkBundle() {
	const contents = await Promise.all(required.map(async file => [file, await fs.readFile(path.join(sourceRoot, file), 'utf8')]));
	for (const [file, text] of contents) assert.ok(text.includes('huhubot') || text.includes('Huhubot') || text.includes('NewOwnerWithPortable'), `missing HUHU Bot seam in ${file}`);
	const moduleText = contents.find(([file]) => file.endsWith('/module.ts'))?.[1] || '';
	for (const page of ['chat', 'agents', 'groups', 'memory', 'tasks', 'access', 'approvals', 'data']) assert.ok(moduleText.includes(`${page}:`), `missing ${page} page factory`);
	return { mode: 'bundle-check', required, liveRun: false };
}

if (process.argv[2] === '--check') {
	console.log(JSON.stringify(await checkBundle(), null, 2));
} else {
	const root = process.argv[2];
	assert.ok(root && path.isAbsolute(root), 'Pass an absolute NEW fixture root, or --check');
	const runtime = await launchFreshVault({
		root,
		port: 9300,
		files: {
			'Bot acceptance.md': '# Bot acceptance\n\nDisposable fixture only.\n',
			'Notes/Source.md': 'source sentinel\n',
		},
		settings: { huhubot: { binaryPath: process.env.HUHU_BOT_BINARY || '', profileRoot: path.join(root, 'bot-profiles') } },
	});
	try {
		const result = await runtime.connection.evaluate(`(async () => {
			const plugin = app.plugins.plugins.huhu;
			const state = plugin?.moduleState?.('huhubot');
			const settings = plugin?.settings?.huhubot;
			const body = document.body.innerText;
			return { moduleState: state, hasWorkbench: !!plugin?.workbench, bodyHasBot: /Bot|\u00a0Bot|\u673a\u5668\u4eba/i.test(body), settingsPresent: !!settings };
		})()`);
		assert.equal(result.moduleState, 'active', 'HUHU Bot module did not activate');
		assert.equal(result.hasWorkbench, true, 'HUHU workbench did not load');
		await fs.writeFile(path.join(runtime.evidence, 'huhu-bot-integration.json'), JSON.stringify({ result, realProvider: false, note: 'Configure a real Runner/provider before user-owned protocol acceptance.' }, null, 2));
		console.log(JSON.stringify({ mode: 'host-probe', passed: true, evidence: runtime.evidence, result }, null, 2));
	} finally {
		await runtime.stop();
	}
}
