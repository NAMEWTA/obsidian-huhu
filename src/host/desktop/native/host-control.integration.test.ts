import { mkdtemp, realpath, stat, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { CONTROL_ENV, type ControlScope } from '../../../shared/native/control-wire';
import { requireControlTestBinaries, runControlTestCli } from '../../../../scripts/obsidian-acceptance/agent-workbench-control.mjs';
import { NativeHost } from './host';
import { PtyHelper } from './helper';

test('frozen helper and CLI reach the captured host and control closes without ending a sibling lease', async () => {
	const binaries = await requireControlTestBinaries();
	const root = await mkdtemp(join(tmpdir(), 'huhu-control-transport-')), runtime = join(root, 'runtime');
	await mkdir(runtime, { mode: 0o700 });
	const canonicalPath = await realpath(root), identity = await stat(root, { bigint: true });
	const scope: ControlScope = { vaultId: 'transport-vault', deviceId: 'transport-device', instanceId: crypto.randomUUID(), rootPath: root, root: { canonicalPath, dev: String(identity.dev), ino: String(identity.ino) } };
	const host = new NativeHost(events => PtyHelper.start(binaries.helper.path, events, globalThis as unknown as Window, { HOME: root, XDG_RUNTIME_DIR: runtime }));
	try {
		const browser = await host.acquire('cookies'), pty = await host.acquire('pty'), control = await pty.acquireControl!();
		try {
			let forwards = 0;
			const finals: Promise<void>[] = [];
			const registration = await control.registerControl!(scope, {
				forward(call) {
					forwards++;
					// Transport-only refusal: the real Agent business handlers are deliberately absent here.
					const final = registration.result(call, { protocolVersion: 1, requestId: call.wire.request.requestId, operation: call.wire.request.operation, ok: false, phase: 'unavailable', effect: 'none', error: { code: 'CAPABILITY_UNAVAILABLE', message: 'No business handler in transport fixture' } });
					void final.catch(() => undefined); finals.push(final);
				}, closed() {},
			});
			const env = { HOME: root, XDG_RUNTIME_DIR: runtime, [CONTROL_ENV.instance]: scope.instanceId, [CONTROL_ENV.vault]: scope.vaultId, [CONTROL_ENV.locator]: registration.route.locator };
			const result = await runControlTestCli(binaries, ['--json', 'space', 'list'], { env });
			expect(result.exitCode).toBe(4);
			expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, operation: 'space.list', effect: 'none', error: { code: 'CAPABILITY_UNAVAILABLE' } });
			expect(forwards).toBe(1);
			await Promise.all(finals);
			await registration.close();
			expect(pty.value.alive).toBe(true);
			await expect(browser.value.request('cookies', 'read', { path: join(root, 'missing-cookie-database'), kind: 'firefox' })).rejects.toBeDefined();
			expect(browser.value.alive).toBe(true);
		} finally {
			await control.release(); await pty.release(); await browser.release();
		}
	} finally {
		await host.dispose(); await rm(root, { recursive: true, force: true });
	}
}, 30000);
