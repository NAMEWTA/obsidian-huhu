// Windows acceptance for vault identity, legacy preferences and Git bookkeeping.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const plugin = 'app.plugins.plugins.huhu';
const rows = [];
const errors = [];
let runtime;
const check = (name, actual) => { rows.push({ name, passed: !!actual }); assert.ok(actual, name); };
const until = async read => { const end = Date.now() + 25000; while (Date.now() < end) { if (await read()) return; await delay(100); } throw new Error('Acceptance condition timed out'); };
try {
	runtime = await launchFreshVault({ root: process.argv[2], port: 9439, settings: { version: 1, namespaces: {
		app: { language: 'zh', introSeen: true, modules: Object.fromEntries(['home','agent','browser','archives','automations','notifications','icons','comments','sync'].map(id => [id, false])) },
		sync: { autoPullOnBoot: false, autoSaveInterval: 0, autoPullInterval: 0, autoPushInterval: 0 },
	} } });
	let c = runtime.connection;
	const first = await c.evaluate(`${plugin}.storageIdentity`);
	const identityFile = path.join(runtime.vault, '.huhu/config/identity.json');
	const identities = JSON.parse(await fs.readFile(identityFile, 'utf8'));
	check('identity-is-vault-owned', identities.vaultId === first.vaultId && identities.devices[first.deviceId]?.fingerprint?.length === 64);
	check('legacy-identities-are-not-written', await c.evaluate(`app.loadLocalStorage('huhu.device-id')==null && app.loadLocalStorage('huhu.browser.vault-id')==null`));
	await c.evaluate(`${plugin}.settingsNamespace('local-ui').update(d=>{d.migrated=false;d.values={}}, {persist:'immediate'})`);
	await c.evaluate(`app.saveLocalStorage('huhu.dashboard.sidebar-pinned','false'); app.saveLocalStorage('huhu.dashboard.media-thumb-size','large'); true`);
	errors.push(...await c.evaluate('huhuAcceptanceErrors'));
	await runtime.restart(); c = runtime.connection;
	check('same-device-survives-restart', JSON.stringify(await c.evaluate(`${plugin}.storageIdentity`)) === JSON.stringify(first));
	check('legacy-preferences-migrated-and-cleared', await c.evaluate(`(()=>{const p=${plugin}.settingsNamespace('local-ui').get();return p.migrated && p.values['huhu.dashboard.sidebar-pinned']==='false' && p.values['huhu.dashboard.media-thumb-size']==='large' && app.loadLocalStorage('huhu.dashboard.sidebar-pinned')==null && app.loadLocalStorage('huhu.dashboard.media-thumb-size')==null})()`));
	const deviceSettings = JSON.parse(await fs.readFile(path.join(runtime.vault, '.huhu/config/devices', first.deviceId + '.json'), 'utf8'));
	check('preferences-persist-in-device-file', deviceSettings.namespaces['local-ui'].values['huhu.dashboard.media-thumb-size'] === 'large');
	execFileSync('git', ['init', '-q'], { cwd: runtime.vault, windowsHide: true });
	const legacy = path.join(runtime.vault, '.git/huhu-sync.json');
	await fs.writeFile(legacy, JSON.stringify({ lastCommit: 1, lastPull: 2, lastPush: 3, paused: 'manual', failures: 0 }));
	await c.evaluate(`${plugin}.setModuleEnabled('sync', true)`);
	const folder = path.join(runtime.vault, '.huhu/sync', first.deviceId);
	await until(async () => (await fs.readdir(folder).catch(() => [])).some(name => name.endsWith('.json')));
	const stateName = (await fs.readdir(folder)).find(name => name.endsWith('.json'));
	const stateFile = path.join(folder, stateName);
	check('git-state-migrated', JSON.parse(await fs.readFile(stateFile, 'utf8')).lastPull === 2 && !await fs.stat(legacy).catch(() => null));
	await c.evaluate(`app.commands.executeCommandById('huhu:sync-pause-toggle')`);
	await until(async () => JSON.parse(await fs.readFile(stateFile, 'utf8')).paused === '');
	check('native-command-saves-in-vault', true);
	await c.evaluate(`${plugin}.openWorkbench({feature:'sync',section:'changes'},window)`);
	await runtime.shot('vault-sync-state');
	errors.push(...await c.evaluate('huhuAcceptanceErrors'));
	await runtime.restart(); c = runtime.connection;
	check('restarted-identity-and-sync-state-preserved', (await c.evaluate(`${plugin}.storageIdentity.deviceId`)) === first.deviceId && JSON.parse(await fs.readFile(stateFile, 'utf8')).paused === '');
	errors.push(...await c.evaluate('huhuAcceptanceErrors'));
	check('no-runtime-errors', errors.length === 0);
	await fs.writeFile(path.join(runtime.evidence, 'result.json'), JSON.stringify({ platform: process.platform, method: 'Real Obsidian startup, native command, vault files and two full restarts; no external accounts.', rows }, null, 2));
} catch (error) {
	if (runtime) await fs.writeFile(path.join(runtime.evidence, 'partial.json'), JSON.stringify({ rows, error: String(error), errors: await runtime.connection?.evaluate('huhuAcceptanceErrors').catch(() => []) }, null, 2));
	throw error;
} finally {
	if (runtime) { console.log(JSON.stringify({ evidence: runtime.evidence, checks: rows.length, failed: rows.filter(row => !row.passed) })); await runtime.stop(); }
}
