import * as path from 'node:path';
import type { App } from 'obsidian';
import { beforeEach, expect, test, vi } from 'vitest';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import type { VaultSession } from '../../core/history/types';
import { resumeAgent, verifyResume, type LaunchHost } from './launcher';
import { restoredAccountReference } from '../../platform/desktop/agents/accounts';
import { checkAccountTranscript } from '../../platform/desktop/agents/transcript';

vi.mock('../../platform/desktop/history/canonical-cwd', () => ({ canonicalVaultCwd: vi.fn(async () => '/vault') }));
vi.mock('../../platform/desktop/agents/accounts', () => ({
	accountEnv: vi.fn(),
	restoredAccountReference: vi.fn(
		async (_agent, saved: Record<string, string>, _vault, _device, transcript?: string) => ({
			env: saved,
			transcriptPath: transcript,
		}),
	),
}));
vi.mock('../../platform/desktop/agents/transcript', () => ({ checkAccountTranscript: vi.fn(async () => {}) }));
vi.mock('../../../../host/obsidian/storage/device-id', () => ({ deviceId: () => 'device' }));

function host(provider: VaultSession['agentId'], enabled = true): LaunchHost & { start: ReturnType<typeof vi.fn> } {
	const settings = normalizeTerminalSettings({}).agents;
	settings.globalPermissionMode = 'manual';
	settings.agents[provider] = {
		...settings.agents[provider],
		enabled,
		cliPath: process.execPath,
		argsOverride: '--model "字面 空间"',
		env: { CUSTOM: '保留' },
	};
	const start = vi.fn(async () => {});
	return {
		app: {} as App,
		managed: true,
		interactive: false,
		getVaultPath: () => '/vault',
		getAgentSettings: () => settings,
		saveAgentSettings: async () => {},
		start,
		validateCwd: async () => {},
	};
}
const session = (agentId: VaultSession['agentId'], env: Record<string, string> = {}): VaultSession => ({
	agentId,
	sessionId: 'native id; $(unsafe)',
	title: 'saved',
	cwd: '/vault',
	modifiedAtMs: 0,
	transcriptPath: '/account/log.jsonl',
	env,
});
beforeEach(() => vi.clearAllMocks());

// The exact resume argv per provider is a literal array: no shell string is ever built, so metacharacters stay data.
const expected: Record<VaultSession['agentId'], string[]> = {
	'claude-code': ['--model', '字面 空间', '--resume', 'native id; $(unsafe)'],
	codex: ['--model', '字面 空间', 'resume', 'native id; $(unsafe)'],
	gemini: ['--model', '字面 空间', '--resume', 'native id; $(unsafe)'],
	grok: ['--model', '字面 空间', '--resume', 'native id; $(unsafe)'],
	opencode: ['--model', '字面 空间', '--session', 'native id; $(unsafe)'],
	// Pi resumes from the verified transcript file, not the id.
	pi: ['--model', '字面 空间', '--session', '/account/log.jsonl'],
};
for (const provider of Object.keys(expected) as VaultSession['agentId'][])
	test(`${provider} resumes with the exact literal argv, the session cwd and the restored account environment`, async () => {
		const bound = host(provider);
		await resumeAgent(
			bound,
			session(provider, {
				HUHU_ACCOUNT_NAME: 'work',
				HUHU_ACCOUNT_ID: 'x',
				...(provider === 'codex' ? { CODEX_HOME: '/fixture/codex' } : {}),
			}),
		);
		expect(bound.start).toHaveBeenCalledTimes(1);
		const request = bound.start.mock.calls[0]![0] as {
			file: string;
			args: string[];
			cwd: string;
			env: Record<string, string>;
			agentId: string;
		};
		expect(request.file).toBe(process.execPath);
		const managedCodex = [
			'-c',
			'cli_auth_credentials_store="file"',
			'-c',
			'mcp_oauth_credentials_store="file"',
			'-c',
			'sqlite_home="/fixture/codex"',
			'-c',
			`log_dir=${JSON.stringify(path.join('/fixture/codex', 'log'))}`,
		];
		// A managed Codex account adds its own config flags before the subcommand; everything else is verbatim.
		expect(request.args).toEqual(
			provider === 'codex'
				? ['--model', '字面 空间', ...managedCodex, 'resume', 'native id; $(unsafe)']
				: expected[provider],
		);
		expect(request.cwd).toBe('/vault');
		expect(request.agentId).toBe(provider);
		expect(request.env).toMatchObject({ CUSTOM: '保留', HUHU_ACCOUNT_NAME: 'work' });
	});

test('verifyResume checks account, transcript, enablement and program without a prompt, a record or a spawn', async () => {
	const bound = host('codex');
	await verifyResume(bound, session('codex', { HUHU_ACCOUNT_NAME: 'work' }));
	expect(restoredAccountReference).toHaveBeenCalledOnce();
	expect(checkAccountTranscript).toHaveBeenCalledOnce();
	expect(bound.start).not.toHaveBeenCalled();
	await expect(verifyResume(host('codex', false), session('codex'))).rejects.toMatchObject({
		failure: { code: 'CAPABILITY_UNAVAILABLE', reason: 'provider-disabled' },
	});
	const missing = host('codex');
	missing.getAgentSettings().agents.codex.cliPath = '/definitely/not/a/program';
	missing.path = '';
	await expect(verifyResume(missing, session('codex'))).rejects.toMatchObject({
		failure: { code: 'SOURCE_UNAVAILABLE', reason: 'program-missing' },
	});
	// An account/device that no longer matches stops here, before anything else.
	vi.mocked(restoredAccountReference).mockRejectedValueOnce(new Error('account scope mismatch'));
	await expect(verifyResume(host('codex'), session('codex'))).rejects.toThrow('account scope mismatch');
});
