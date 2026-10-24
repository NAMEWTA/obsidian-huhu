import { expect, test, vi } from 'vitest';
import { AgentTools } from './agent-tools';
import type { Exec } from '../platform/desktop/install/exec';

function make(options: { exec: Exec; latest?: string; detected?: Record<string, string> }) {
	const detected: Record<string, string> = { ...(options.detected ?? { codex: '/usr/lib/node_modules/@openai/codex/bin/codex' }) };
	const fetchLatest = vi.fn(async () => options.latest);
	const redetect = vi.fn(async () => {});
	const tools = new AgentTools({
		exec: options.exec,
		fetchLatest,
		realPath: (f) => f,
		platform: 'linux',
		path: async () => '/bin',
		detected: () => detected,
		redetect,
	});
	return { tools, fetchLatest, redetect, detected };
}

const ok = (stdout: string) => ({ code: 0, stdout, stderr: '' });

test('inspect reads version, all locations and the latest version', async () => {
	const exec: Exec = async (file, args) =>
		file === 'which' ? ok('/usr/bin/codex\n/home/u/.local/bin/codex\n') : ok('codex-cli 0.162.0');
	const { tools } = make({ exec, latest: '0.163.0', detected: { codex: '/usr/bin/codex' } });
	await tools.inspect();
	const info = tools.store.getState().codex!;
	expect(info).toMatchObject({ version: '0.162.0', latest: '0.163.0', phase: 'idle' });
	expect(info.locations).toEqual(['/usr/bin/codex', '/home/u/.local/bin/codex']);
	expect(tools.needsUpgrade('codex')).toBe(true);
});

test('latest version is cached and a failed lookup stays silent', async () => {
	const { tools, fetchLatest } = make({ exec: async () => ok('1.0.0'), latest: undefined });
	await tools.inspect();
	await tools.inspect();
	expect(fetchLatest).toHaveBeenCalledTimes(6);
	expect(tools.store.getState().codex?.latest).toBeUndefined();
});

test('install falls back from the official script to npm and re-detects', async () => {
	const calls: string[] = [];
	const exec: Exec = async (file, args) => {
		calls.push(file);
		if (file === 'bash') return { code: 1, stdout: '', stderr: 'curl: (6) could not resolve host' };
		return ok('2.0.0');
	};
	const { tools, redetect } = make({ exec, detected: {} });
	const run = tools.install('claude-code');
	expect(tools.store.getState()['claude-code']?.phase).toBe('installing');
	await run;
	expect(calls.slice(0, 2)).toEqual(['bash', 'npm']);
	expect(tools.store.getState()['claude-code']?.failure).toBeUndefined();
	expect(tools.store.getState()['claude-code']?.phase).toBe('idle');
	expect(redetect).toHaveBeenCalledTimes(1);
});

test('a missing npm is reported as such, other failures keep the output tail', async () => {
	const missing = make({ exec: async () => ({ code: null, stdout: '', stderr: '', error: 'ENOENT' }), detected: {} });
	await missing.tools.install('gemini');
	expect(missing.tools.store.getState().gemini?.failure?.kind).toBe('noNpm');
	const broken = make({ exec: async () => ({ code: 1, stdout: '', stderr: 'npm ERR! EACCES' }), detected: {} });
	await broken.tools.install('gemini');
	expect(broken.tools.store.getState().gemini?.failure).toEqual({ kind: 'failed', output: 'npm ERR! EACCES' });
});

test('an agent without a package, or one already running, does nothing', async () => {
	const exec = vi.fn<Exec>(async () => ok('1.0.0'));
	const { tools } = make({ exec });
	const first = tools.upgrade('codex');
	await tools.upgrade('codex');
	await first;
	expect(exec.mock.calls.filter(([file]) => file === 'npm')).toHaveLength(1);
	expect(exec.mock.calls.find(([file]) => file === 'npm')![1]).toEqual(['i', '-g', '@openai/codex@latest']);
});
