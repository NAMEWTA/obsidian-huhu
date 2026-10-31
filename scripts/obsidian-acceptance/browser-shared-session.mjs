// P0 only. Requires a NEW disposable vault and a real, sandboxed Obsidian.
// No Native browser bundle, system Chrome, user profile or public website is used.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { startFixture } from './browser-shared-session/fixture.mjs';

export function preflight(env = process.env, args = process.argv.slice(2), platform = process.platform, uid = process.getuid?.()) {
	if (!args[0] || !path.isAbsolute(args[0]) || path.parse(args[0]).root === args[0]) return 'new_absolute_root_required';
	if (!env.HUHU_OBSIDIAN_EXECUTABLE || !path.isAbsolute(env.HUHU_OBSIDIAN_EXECUTABLE)) return 'obsidian_executable_required';
	if (platform === 'linux' && uid === 0) return 'sandbox_requires_non_root_user';
	return null;
}

export function emptyReport() {
	return {
		schema: 1, issue: 38, status: 'not-run', p0Complete: false, productionBrowserReplaced: false,
		checks: [],
		notCovered: [
			'F01 popout windows', 'F03 real second/copied Vault namespace binding',
			'F05 adversarial guest security and platform sandbox verification',
			'F06 manual login and real Agent integration', 'F07 IME/focus/file/dialog interaction',
			'F08 OAuth popup/opener', 'F09 actual React/module lifecycle and crash recovery',
			'F10 human keyboard/wheel/touch input gate and full action queue',
			'F11 active service workers/downloads and interruption recovery', 'F12 multi-window ownership',
			'B01-B40/H01-H17 complete product acceptance',
		],
	};
}

export async function runProbe(root) {
	const report = emptyReport();
	report.startedAt = new Date().toISOString();
	report.runner = { node: process.versions.node, platform: process.platform, arch: process.arch };
	const hash = async url => createHash('sha256').update(await fs.readFile(url)).digest('hex');
	const policyFile = new URL('./browser-shared-session/policy.cjs', import.meta.url);
	const policy = await fs.readFile(policyFile, 'utf8');
	// Fixed bundled code only; no fixture values or URLs are interpolated as code.
	const bundle = `(()=>{const require=process.getBuiltinModule('module').createRequire(process.execPath);const module={exports:{}};${policy}\nreturn {create:config=>module.exports.createProbe(require('electron'),config)};})()`;
	const { launchFreshVault } = await import('./fresh-vault.mjs');
	const fixture = await startFixture();
	const runId = randomUUID();
	let host;
	let failure;
	const run = expression => host.connection.evaluate(expression);
	const api = 'window.__huhuBrowserP0.api';
	const check = (id, passed, detail) => {
		report.checks.push({ id, status: passed ? 'passed' : 'failed', ...(detail === undefined ? {} : { detail }) });
		assert.ok(passed, id);
	};
	const untilReady = async id => {
		const deadline = Date.now() + 18000;
		while (Date.now() < deadline) {
			const value = await run(`${api}.status(${JSON.stringify(id)})`);
			if (value.status === 'ready') return value;
			if (['closed', 'crashed', 'cleanup-pending'].includes(value.status)) throw new Error('probe_guest_failed');
			await delay(75);
		}
		throw new Error('probe_guest_timeout');
	};
	const install = async () => {
		await run(`(()=>{
			if(window.__huhuBrowserP0)throw new Error('probe_already_installed');
			const remote=require('@electron/remote');
			const factory=remote.require('node:vm').runInThisContext(${JSON.stringify(bundle)});
			const api=factory.create({runId:${JSON.stringify(runId)},origin:${JSON.stringify(fixture.origin)},embedderId:remote.getCurrentWebContents().id});
			const root=document.createElement('div');root.id='huhu-browser-p0';
			Object.assign(root.style,{position:'fixed',left:'24px',top:'80px',width:'900px',height:'650px',zIndex:'99999'});
			document.body.append(root);
			window.__huhuBrowserP0={api,root,nodes:new Map()};return true;
		})()`);
		const environment = await run(`${api}.environment()`);
		report.host = environment;
		check('host-webview-enabled', environment.webviewTag);
		check('host-sandbox-not-disabled', !environment.noSandbox);
	};
	const open = async (space, id) => {
		await run(`(()=>{const p=window.__huhuBrowserP0;const prepared=p.api.prepare(${JSON.stringify(space)},${JSON.stringify(id)});
			const node=p.root.ownerDocument.createElement('webview');
			node.setAttribute('partition',prepared.partition);
			node.setAttribute('webpreferences','sandbox=yes,contextIsolation=yes,nodeIntegration=no,webSecurity=yes');
			node.setAttribute('src',prepared.source);
			Object.assign(node.style,{width:'900px',height:'650px',display:'flex'});
			for(const previous of p.nodes.values())previous.style.display='none';
			p.nodes.set(prepared.pageId,node);p.root.append(node);return true;
		})()`);
		await untilReady(id);
		const status = await run(`${api}.navigate(${JSON.stringify(id)})`);
		check(`session-${id}`, status.sessionMatches && !status.usesDefaultSession, { webContentsId: status.webContentsId });
		return status;
	};
	const inspect = id => run(`${api}.inspect(${JSON.stringify(id)})`);
	const dispose = () => run(`(()=>{const p=window.__huhuBrowserP0;if(!p)return true;p.api.dispose();p.root.remove();delete window.__huhuBrowserP0;return true})()`);
	try {
		const source = process.env.HUHU_PLUGIN_SOURCE || process.cwd();
		report.build = { main: await hash(path.join(source, 'main.js')), policy: await hash(policyFile),
			helper: await hash(new URL('./fresh-vault.mjs', import.meta.url)) };
		host = await launchFreshVault({ root, sandbox: true, requireGracefulExit: true });
		await install();
		const first = await open('a', 'a1');
		await run(`${api}.seed('a1')`);
		const original = await inspect('a1');
		check('guest-no-node-or-process', !original.nodeExposed && !original.processExposed);
		const security = await run(`${api}.security('a1')`);
		check('guest-effective-security-options', Object.values(security).every(value => value === true), security);
		await open('a', 'a2');
		const sameSpace = await inspect('a2');
		check('same-space-storage', sameSpace.cookie && sameSpace.local === 'synthetic-local' && sameSpace.idb === 'synthetic-idb');
		check('different-page-memory', sameSpace.draft === '' && sameSpace.memory === 'same-live-document');
		await open('b', 'b1');
		const other = await inspect('b1');
		check('different-space-storage', !other.cookie && other.local === null && other.idb === null);
		await run(`(()=>{const p=window.__huhuBrowserP0;for(const [id,node] of p.nodes)node.style.display=id==='a1'?'flex':'none';return true})()`);
		const restored = await inspect('a1');
		check('stable-hidden-guest', restored.draft === original.draft && restored.memory === original.memory &&
			(await run(`${api}.status('a1')`)).webContentsId === first.webContentsId);
		await run(`window.__huhuBrowserP0.grant=${api}.grant('a');true`);
		const observed = await run(`${api}.observe('a1',window.__huhuBrowserP0.grant)`);
		check('ax-on-canonical-guest', observed.webContentsId === first.webContentsId && observed.nodeCount > 0);
		await run(`${api}.clickFixture('a1',window.__huhuBrowserP0.grant,${first.document})`);
		check('cdp-input-on-canonical-guest', (await inspect('a1')).count === 1);
		const capture = await run(`${api}.capture('a1',window.__huhuBrowserP0.grant)`);
		check('capture-on-canonical-guest', capture.webContentsId === first.webContentsId && !capture.empty && capture.width > 0 && capture.height > 0);
		await run(`${api}.takeover('a')`);
		const denied = await run(`(async()=>{try{await ${api}.observe('a1',window.__huhuBrowserP0.grant);return false}catch(error){return error.code==='control_revoked'||error.message.includes('control_revoked')}})()`);
		check('old-grant-rejected-after-takeover', denied);
		check('takeover-preserves-page-memory', (await inspect('a1')).draft === original.draft && (await inspect('a1')).count === 1);
		await run(`window.__huhuBrowserP0.grant=${api}.grant('a');true`);
		const oldGrant = await run(`({...window.__huhuBrowserP0.grant})`);
		check('new-grant-same-guest', (await run(`${api}.observe('a1',window.__huhuBrowserP0.grant)`)).webContentsId === first.webContentsId);
		await host.shot('browser-shared-session-before-restart');
		await dispose();
		await host.restart();
		await install();
		await open('a', 'a-restarted');
		const persisted = await inspect('a-restarted');
		check('full-restart-storage', persisted.cookie && persisted.local === 'synthetic-local' && persisted.idb === 'synthetic-idb');
		check('restart-does-not-claim-js-heap-restoration', persisted.draft === '' && persisted.count === 0 && persisted.memory === 'same-live-document');
		check('restart-rejects-old-authorization', await run(`(async()=>{try{await ${api}.observe('a-restarted',${JSON.stringify(oldGrant)});return false}catch(error){return error.code==='control_revoked'||error.message.includes('control_revoked')}})()`));
		await open('b', 'b-restarted');
		await run(`${api}.seed('b-restarted')`);
		await run(`${api}.clearSpace('a')`);
		await open('a', 'a-cleared');
		const cleared = await inspect('a-cleared'), retained = await inspect('b-restarted');
		check('cleared-space-storage-sentinels', !cleared.cookie && cleared.local === null && cleared.idb === null);
		check('cleanup-does-not-clear-other-space', retained.cookie && retained.local === 'synthetic-local' && retained.idb === 'synthetic-idb');
		report.status = 'automated-probe-passed';
	} catch (error) {
		failure = error;
		report.status = 'failed';
		report.failure = 'automated_probe_failed';
	} finally {
		if (host) {
			try { await dispose(); } catch { report.checks.push({ id: 'probe-dispose', status: 'failed' }); report.status = 'failed'; }
			try { await host.stop(); } catch { report.checks.push({ id: 'normal-host-exit', status: 'failed' }); report.status = 'failed'; }
		}
		try { await fixture.close(); } catch { report.status = 'failed'; }
		report.finishedAt = new Date().toISOString();
		if (host) await fs.writeFile(path.join(host.evidence, 'browser-shared-session.json'), JSON.stringify(report, null, 2));
	}
	if (failure || report.status === 'failed') {
		const error = new Error('browser_shared_session_probe_failed'); error.report = report; throw error;
	}
	return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const reason = preflight();
	if (reason) {
		console.log(JSON.stringify({ ...emptyReport(), status: 'blocked', reason }, null, 2));
		process.exitCode = 2;
	} else {
		try { console.log(JSON.stringify(await runProbe(process.argv[2]), null, 2)); }
		catch (error) {
			console.log(JSON.stringify(error.report ?? { ...emptyReport(), status: 'failed', reason: 'probe_initialization_failed' }, null, 2));
			process.exitCode = 1;
		}
	}
}
