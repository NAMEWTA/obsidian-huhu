// Launch real Obsidian on a NEW disposable vault and profile (never an existing one).
// Requires HUHU_OBSIDIAN_EXECUTABLE (absolute) and a root directory that does not exist yet.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { openSync, closeSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { connect } from './cdp.mjs';

/**
 * HUHU_ACCEPTANCE_PORT moves the CDP port; HUHU_PLUGIN_SOURCE installs a build from another directory than the checkout.
 * @param {{ root: string; files?: Record<string, string>; settings?: unknown; port?: number; pluginSource?: string }} options
 * `files` are vault-relative paths; `settings` is written to .huhu/config/settings.json.
 */
export async function launchFreshVault({ root, files = {}, settings, port = 9237, pluginSource = process.cwd() }) {
	const executable = process.env.HUHU_OBSIDIAN_EXECUTABLE;
	assert.ok(executable && path.isAbsolute(executable), 'HUHU_OBSIDIAN_EXECUTABLE must be absolute');
	assert.ok(path.isAbsolute(root) && path.parse(root).root !== root, 'root must be an absolute, non-root path');
	// A caller can move every launch to another CDP port, so parallel runs of the scripts do not collide.
	port = Number(process.env.HUHU_ACCEPTANCE_PORT) || port;
	pluginSource = process.env.HUHU_PLUGIN_SOURCE || pluginSource;
	await fs.mkdir(root);
	const vault = path.join(root, 'vault');
	const profile = path.join(root, 'profile');
	const evidence = path.join(root, 'evidence');
	const manifest = JSON.parse(await fs.readFile(path.join(pluginSource, 'manifest.json'), 'utf8'));
	const pluginDir = path.join(vault, '.obsidian', 'plugins', manifest.id);
	for (const dir of [vault, profile, evidence, pluginDir, path.join(root, 'home'), path.join(root, 'config'), path.join(root, 'runtime')]) await fs.mkdir(dir, { recursive: true });
	for (const file of ['main.js', 'styles.css', 'manifest.json']) await fs.copyFile(path.join(pluginSource, file), path.join(pluginDir, file));
	await fs.writeFile(path.join(vault, '.obsidian', 'community-plugins.json'), JSON.stringify([manifest.id]));
	await fs.writeFile(path.join(vault, '.obsidian', 'app.json'), JSON.stringify({ livePreview: true }));
	if (settings) {
		await fs.mkdir(path.join(vault, '.huhu', 'config'), { recursive: true });
		await fs.writeFile(path.join(vault, '.huhu', 'config', 'settings.json'), JSON.stringify(settings));
	}
	for (const [file, text] of Object.entries(files)) {
		await fs.mkdir(path.dirname(path.join(vault, file)), { recursive: true });
		await fs.writeFile(path.join(vault, file), text);
	}
	await fs.writeFile(path.join(evidence, 'initial-vault-state.json'), JSON.stringify({
		settingsSeeded: !!settings, huhuExistedBeforeLaunch: await fs.stat(path.join(vault, '.huhu')).then(() => true, () => false),
	}, null, 2));
	await fs.writeFile(path.join(profile, 'obsidian.json'), JSON.stringify({ updateDisabled: true, vaults: { abcdef1234567890: { path: vault, ts: Date.now(), open: true } } }));
	const env = { ...process.env, HOME: path.join(root, 'home'), USERPROFILE: path.join(root, 'home'), XDG_CONFIG_HOME: path.join(root, 'config'), XDG_RUNTIME_DIR: path.join(root, 'runtime'), HUHU_CDP_URL: `http://127.0.0.1:${port}` };
	process.env.HUHU_CDP_URL = env.HUHU_CDP_URL;
	const session = { connection: undefined, app: undefined, exited: undefined };
	const start = async () => {
		const log = openSync(path.join(evidence, 'application.log'), 'a');
		const app = spawn(executable, ['--no-sandbox', '--disable-gpu', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`], { env, stdio: ['ignore', log, log] });
		closeSync(log);
		session.app = app;
		session.exited = once(app, 'exit');
		const deadline = Date.now() + 90000;
		let connection;
		while (Date.now() < deadline && !connection) {
			if (app.exitCode !== null) throw new Error(`Obsidian exited during startup (${app.exitCode})`);
			try { connection = await connect(); } catch { await delay(250); }
		}
		assert.ok(connection, 'Obsidian did not expose a CDP target');
		session.connection = connection;
		const captureErrors = `(()=>{if(window.huhuAcceptanceErrors)return;window.huhuAcceptanceErrors=[];const original=console.error;console.error=(...args)=>{huhuAcceptanceErrors.push(args.map(a=>a?.stack??String(a)).join(' '));original(...args)};window.addEventListener('unhandledrejection',e=>huhuAcceptanceErrors.push(e.reason?.stack??String(e.reason)));})()`;
		// The initially exposed target can still navigate to its final document during startup.
		await connection.send('Page.addScriptToEvaluateOnNewDocument', { source: captureErrors });
		await connection.evaluate(captureErrors);
		// Ready = the trust prompt is answered and onload finished (the workbench exists).
		const ready = `typeof app !== 'undefined' && !!app.workspace?.layoutReady && !!app.plugins?.plugins?.huhu?.workbench`;
		while (Date.now() < deadline) {
			await connection.evaluate(`(()=>{if(window.huhuAcceptanceTrusted)return;const b=[...document.querySelectorAll('button')].find(b=>['Trust author and enable plugins','信任仓库作者并启用插件'].includes(b.textContent));if(b){window.huhuAcceptanceTrusted=true;b.click()}})()`).catch(() => undefined);
			if (await connection.evaluate(ready).catch(() => false)) break;
			await delay(150);
		}
		if (!await connection.evaluate(ready)) {
			await fs.writeFile(path.join(evidence, 'startup-failure.json'), JSON.stringify(await connection.evaluate(`({errors:window.huhuAcceptanceErrors,body:document.body.innerText,plugin:app.plugins.plugins.huhu?Object.keys(app.plugins.plugins.huhu):null})`), null, 2));
			throw new Error('HUHU did not finish loading; see startup-failure.json');
		}
		session.connection = connection;
	};
	const stop = async () => {
		const { connection, app, exited } = session;
		if (!app) return;
		await connection?.evaluate(`setTimeout(()=>require('@electron/remote').app.quit(),50);true`).catch(() => undefined);
		connection?.close();
		let deadline;
		try { await Promise.race([exited, new Promise(resolve => { deadline = setTimeout(resolve, 20000); })]); }
		finally { clearTimeout(deadline); }
		if (app.exitCode === null) app.kill('SIGKILL');
		session.app = undefined;
		session.connection = undefined;
	};
	const shot = async (name) => {
		const { data } = await session.connection.send('Page.captureScreenshot', { format: 'png' });
		await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(data, 'base64'));
	};
	try { await start(); } catch (error) { await stop(); throw error; }
	return {
		vault, evidence, stop, shot,
		get connection() { return session.connection; },
		/** Quit normally and start Obsidian again on the same vault and profile. */
		restart: async () => { await stop(); await start(); },
		/** Abruptly terminate only this fixture's owned child, then reopen its existing vault. */
		crashRestart: async () => {
			const { connection, app, exited } = session;
			assert.ok(app, 'No owned fixture process to terminate');
			connection?.close();
			if (app.exitCode === null) app.kill('SIGKILL');
			await exited;
			session.app = undefined; session.connection = undefined;
			await delay(250); await start();
		},
	};

}
