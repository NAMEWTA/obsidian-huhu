import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadControlSkill } from '../../src/modules/agent/core/control/skill';
import { PtyHelper } from '../../src/host/desktop/native/helper';
import { NativeHost } from '../../src/host/desktop/native/host';
import { CONTROL_ENV, type ControlScope } from '../../src/shared/native/control-wire';
import schema from '../../src/shared/native/control-schema.json';

const manifest = path.join(process.cwd(), 'native/pty-server/Cargo.toml');
const target = path.join(process.cwd(), 'native/pty-server/target/debug');
const exe = process.platform === 'win32' ? '.exe' : '';
const helper = path.join(target, `huhu-pty${exe}`), cli = path.join(target, `huhu${exe}`);
const errorExits = schema.errorExits as Record<string, number>;
const fileBody = 'A multiline prompt\n中文正文\n';
const placeholders: Record<string, string> = { 'space-id': 'space-1', 'session-id': 'session-1', 'runtime-id': 'runtime-1', 'message-id': 'message-1', 'provider-id': 'pi' };

/** Every `huhu ...` line of every fenced sh block, with an optional ` < file` stdin redirect split off. */
function examples(markdown: string): Array<{ line: string; argv: string[]; stdin?: string }> {
	const result: Array<{ line: string; argv: string[]; stdin?: string }> = [];
	for (const block of markdown.matchAll(/```sh\n([\s\S]*?)```/g)) for (const raw of block[1]!.split('\n')) {
		const line = raw.trim();
		if (!line) continue;
		expect(line.startsWith('huhu '), `every example line starts with huhu: ${line}`).toBe(true);
		const redirect = /\s<\s(\S+)$/.exec(line);
		const command = redirect ? line.slice(0, redirect.index) : line;
		const argv: string[] = [];
		for (const match of command.slice(5).matchAll(/'([^']*)'|(\S+)/g)) argv.push((match[1] ?? match[2]!).replace(/<([a-z-]+)>/g, (_all, name: string) => placeholders[name] ?? expect.fail(`unknown placeholder ${name}`)));
		result.push({ line, argv, stdin: redirect?.[1] });
	}
	return result;
}

type Outcome = { ok: true } | { code: string };
async function withWorkbench<T>(use: (run: (example: { argv: string[]; stdin?: string }, outcome: Outcome) => Promise<{ status: number | null; receipt: Record<string, any>; forwarded: Array<{ operation: string; params: Record<string, unknown> }> }>) => Promise<T>): Promise<T> {
	const root = await mkdtemp(path.join(tmpdir(), 'huhu-skill-')), runtime = path.join(root, 'runtime');
	await mkdir(runtime, { mode: 0o700 });
	await writeFile(path.join(root, 'prompt.txt'), fileBody);
	const canonicalPath = await realpath(root), identity = await stat(root, { bigint: true });
	const scope: ControlScope = { vaultId: 'skill-vault', deviceId: 'skill-device', instanceId: crypto.randomUUID(), rootPath: root, root: { canonicalPath, dev: String(identity.dev), ino: String(identity.ino) } };
	const host = new NativeHost(events => PtyHelper.start(helper, events, globalThis as unknown as Window, { HOME: root, XDG_RUNTIME_DIR: runtime }));
	const pty = await host.acquire('pty'), control = await pty.acquireControl!();
	let outcome: Outcome = { ok: true };
	const forwarded: Array<{ operation: string; params: Record<string, unknown> }> = [];
	const finals: Promise<void>[] = [];
	const registration = await control.registerControl!(scope, {
		forward(call) {
			const request = call.wire.request;
			forwarded.push({ operation: request.operation, params: (request as { params?: Record<string, unknown> }).params ?? {} });
			const base = { protocolVersion: 1 as const, requestId: request.requestId, operation: request.operation };
			const readOnly = schema.operations[request.operation as keyof typeof schema.operations].readOnly;
			const response = 'ok' in outcome
				? { ...base, ok: true, phase: 'completed', effect: readOnly ? 'none' : 'completed', data: {} }
				: { ...base, ok: false, phase: 'failed', effect: outcome.code === 'EFFECT_UNKNOWN' ? 'unknown' : readOnly || outcome.code === 'AGENT_BLOCKED' ? 'none' : 'completed', error: { code: outcome.code, message: 'fixture' } };
			const final = registration.result(call, response as never);
			void final.catch(() => undefined); finals.push(final);
		}, closed() {},
	});
	const env = { ...process.env, HOME: root, XDG_RUNTIME_DIR: runtime, [CONTROL_ENV.instance]: scope.instanceId, [CONTROL_ENV.vault]: scope.vaultId, [CONTROL_ENV.locator]: registration.route.locator };
	const run = (example: { argv: string[]; stdin?: string }, next: Outcome) => new Promise<any>((resolve, reject) => {
		outcome = next; forwarded.length = 0;
		const child = spawn(cli, example.argv, { cwd: root, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
		let stdout = '';
		child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
		child.on('error', reject);
		child.on('close', status => { Promise.all(finals).then(() => resolve({ status, receipt: JSON.parse(stdout), forwarded: [...forwarded] }), reject); });
		child.stdin.end(example.stdin === undefined ? undefined : 'b'.repeat(16 * 1024));
	});
	let failed = false;
	try { return await use(run); }
	catch (error) { failed = true; throw error; }
	finally {
		// A cleanup failure must not hide the assertion that actually failed.
		try { await registration.close(); await control.release(); await pty.release(); await host.dispose(); }
		catch (error) { if (!failed) throw error; }
		finally { await rm(root, { recursive: true, force: true }); }
	}
}

/** Toolchain roots from before isolate-home replaced HOME. A missing ~/.rustup is left unset so a baked-in rustup home stays in charge. */
function cargoEnv(): NodeJS.ProcessEnv {
	const host = globalThis as { __huhuHostHome?: string; __huhuHostCargoHome?: string; __huhuHostRustupHome?: string };
	const env: NodeJS.ProcessEnv = { ...process.env };
	const rustup = host.__huhuHostRustupHome ?? (host.__huhuHostHome ? path.join(host.__huhuHostHome, '.rustup') : undefined);
	const cargoHome = host.__huhuHostCargoHome ?? (host.__huhuHostHome ? path.join(host.__huhuHostHome, '.cargo') : undefined);
	if (rustup && existsSync(rustup)) env.RUSTUP_HOME = rustup;
	if (cargoHome && existsSync(cargoHome)) env.CARGO_HOME = cargoHome;
	return env;
}

beforeAll(() => {
	const built = spawnSync('cargo', ['build', '--locked', '--manifest-path', manifest, '--bin', 'huhu', '--bin', 'huhu-pty'], { encoding: 'utf8', env: cargoEnv() });
	expect(built.status, built.stderr).toBe(0);
}, 600_000);

describe('the packaged HUHU control Skill', () => {
	it('ships the same executable commands in both languages, with the trigger limited to explicit HUHU use', async () => {
		const [en, zh] = [await loadControlSkill('en'), await loadControlSkill('zh')];
		const shape = (text: string) => examples(text).map(e => e.line.replace(/'[^']*'/g, "'…'"));
		expect(shape(zh)).toEqual(shape(en));
		for (const text of [en, zh]) {
			expect(text).toMatch(/^---\nname: huhu-control\ndescription: [^\n]+\n---\n/);
			expect(examples(text).length).toBeGreaterThanOrEqual(10);
		}
		expect(en).toMatch(/Use only when the user explicitly asks/);
		expect(zh).toMatch(/仅当用户明确要求/);
	});

	it('states every exit code it names exactly as the canonical schema defines it', async () => {
		for (const text of [await loadControlSkill('en'), await loadControlSkill('zh')]) {
			const named = [...text.matchAll(/`([A-Z][A-Z_]+)`/g)].map(m => m[1]!).filter(code => code in errorExits);
			expect([...new Set(named)].sort()).toEqual(['AGENT_BLOCKED', 'CAPABILITY_UNAVAILABLE', 'CAPACITY_EXCEEDED', 'EFFECT_UNKNOWN', 'WAIT_TIMEOUT']);
			for (const line of text.split('\n')) for (const code of line.match(/[A-Z][A-Z_]{4,}/g) ?? []) if (code in errorExits) expect(line, `${code} must carry exit ${errorExits[code]}`).toContain(String(errorExits[code]));
		}
	});

	it('runs every example against the real CLI and host transport, and each is forwarded exactly once to the right operation', async () => {
		const en = examples(await loadControlSkill('en'));
		await withWorkbench(async run => {
			for (const example of en) {
				const { status, receipt, forwarded } = await run(example, { ok: true });
				const words = example.argv.filter(a => !a.startsWith('--')).slice(0, 2).join('.');
				expect(status, example.line).toBe(0);
				expect(receipt.ok, example.line).toBe(true);
				expect(forwarded.map(f => f.operation), example.line).toEqual([receipt.operation]);
				expect(receipt.operation, example.line).toBe(words === 'capabilities' ? 'capabilities' : words);
				if (example.stdin !== undefined) expect(forwarded[0]!.params.text, 'a 16 KiB stdin body arrives intact').toBe('b'.repeat(16 * 1024));
				if (example.argv.includes('--file')) {
					expect(forwarded[0]!.params.text).toBe(fileBody);
					expect(forwarded[0]!.params).not.toHaveProperty('file');
					expect(forwarded[0]!.params).not.toHaveProperty('stdin');
				}
			}
		});
	}, 120_000);

	it('wait is not success, blocked needs a human, a timeout never resends and an unknown effect is queried not retried', async () => {
		const submitted = examples(await loadControlSkill('en')).filter(e => e.argv.includes('prompt') || e.argv.includes('wait'));
		expect(submitted.map(e => e.argv[2])).toEqual(['prompt', 'wait', 'prompt']);
		await withWorkbench(async run => {
			for (const example of submitted) {
				// A read-only observation cannot have an unknown input effect, so only the prompt can lose its receipt.
				for (const code of example.argv.includes('wait') ? ['WAIT_TIMEOUT', 'AGENT_BLOCKED'] : ['WAIT_TIMEOUT', 'AGENT_BLOCKED', 'EFFECT_UNKNOWN']) {
					const { status, receipt, forwarded } = await run(example, { code });
					expect(receipt.error.code).toBe(code);
					expect(status, `${example.line} -> ${code}`).toBe(errorExits[code]);
					expect(forwarded, `${code} is never retried by the CLI`).toHaveLength(1);
				}
			}
			const recovery = examples(await loadControlSkill('en')).find(e => e.argv[2] === 'get')!;
			expect((await run(recovery, { ok: true })).forwarded.map(f => f.operation)).toEqual(['session.get']);
		});
	}, 120_000);

	it('rejects an oversized stdin body locally with a code, not a sentence, and never reaches the workbench', async () => {
		await withWorkbench(async run => {
			const send = examples(await loadControlSkill('en')).find(e => e.stdin)!;
			const big = spawnSync(cli, send.argv, { input: 'b'.repeat(16 * 1024 + 1), encoding: 'utf8', env: { ...process.env, HUHU_CONTROL_LOCATOR: '' } });
			expect(big.status).toBe(errorExits.CAPACITY_EXCEEDED);
			expect(JSON.parse(big.stdout).error.code).toBe('CAPACITY_EXCEEDED');
			expect((await run(send, { ok: true })).forwarded).toHaveLength(1);
		});
	}, 60_000);
});
