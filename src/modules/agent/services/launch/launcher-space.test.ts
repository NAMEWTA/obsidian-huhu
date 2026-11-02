import type { App } from 'obsidian';
import { beforeEach, expect, test, vi } from 'vitest';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import type { VaultSession } from '../../core/history/types';
import { resumeAgent, type LaunchHost } from './launcher';
import { canonicalVaultCwd } from '../../platform/desktop/history/canonical-cwd';
import { restoredAccountReference } from '../../platform/desktop/agents/accounts';
import { checkAccountTranscript } from '../../platform/desktop/agents/transcript';

vi.mock('../../platform/desktop/history/canonical-cwd', () => ({ canonicalVaultCwd: vi.fn(async () => '/vault') }));
vi.mock('../../platform/desktop/agents/accounts', () => ({ accountEnv: vi.fn(), restoredAccountReference: vi.fn(async () => ({ env: {}, transcriptPath: '/account/log' })) }));
vi.mock('../../platform/desktop/agents/transcript', () => ({ checkAccountTranscript: vi.fn(async () => {}) }));
vi.mock('../../../../host/obsidian/storage/device-id', () => ({ deviceId: () => 'device' }));
const row: VaultSession = { agentId: 'codex', sessionId: 'native', title: 'saved', cwd: '/external', modifiedAtMs: 0, transcriptPath: '/account/log', env: {} };
function host(): LaunchHost {
	const settings = normalizeTerminalSettings({}).agents;
	settings.agents.codex.enabled = false;
	return { app: {} as App, getVaultPath: () => '/vault', getAgentSettings: () => settings, saveAgentSettings: vi.fn(async () => {}), start: vi.fn(async () => {}) };
}
beforeEach(() => vi.clearAllMocks());
test('only the injected committed Space validator replaces the old Vault-only cwd gate; account and transcript checks remain', async () => {
	const bound = host();
	bound.validateCwd = vi.fn(async cwd => { expect(cwd).toBe('/external'); });
	await resumeAgent(bound, row);
	expect(bound.validateCwd).toHaveBeenCalledWith('/external');
	expect(canonicalVaultCwd).not.toHaveBeenCalled();
	expect(restoredAccountReference).toHaveBeenCalledOnce();
	expect(checkAccountTranscript).toHaveBeenCalledOnce();
	expect(bound.start).not.toHaveBeenCalled();
	await resumeAgent(host(), { ...row, cwd: '/vault' });
	expect(canonicalVaultCwd).toHaveBeenCalledWith('/vault', '/vault');
});
test('rejected Space cwd never reaches account preparation, permission approval or spawn', async () => {
	const bound = host();
	bound.validateCwd = async () => { throw new Error('directory changed'); };
	await expect(resumeAgent(bound, row)).rejects.toThrow('directory changed');
	expect(restoredAccountReference).not.toHaveBeenCalled();
	expect(checkAccountTranscript).not.toHaveBeenCalled();
	expect(bound.start).not.toHaveBeenCalled();
});

test('a noninteractive first YOLO launch rejects without opening a permission dialog', async () => {
	const { Modal } = await import('obsidian');
	const { confirmLaunchPermissions } = await import('./launcher');
	const bound = host();
	bound.getAgentSettings().globalPermissionMode = 'yolo';
	bound.getAgentSettings().yoloAcknowledged = false;
	bound.getAgentSettings().yoloAcknowledgedAgents = [];
	const open = vi.spyOn(Modal.prototype, 'open').mockImplementation(() => { throw new Error('unexpected permission dialog'); });
	try {
		await expect(confirmLaunchPermissions({ ...bound, interactive: false }, 'codex')).rejects.toMatchObject({ failure: { code: 'AGENT_BLOCKED', reason: 'permission-confirmation-required' } });
		expect(open).not.toHaveBeenCalled();
	} finally { open.mockRestore(); }
});

for (const provider of ['claude-code', 'codex', 'grok', 'opencode', 'gemini', 'pi'] as const) {
	for (const account of ['', '命名账号']) test(`${provider} launch preserves literal argv, frozen account selection and environment precedence for ${account || 'system'}`, async () => {
		const { launchAgent } = await import('./launcher');
		const { accountEnv } = await import('../../platform/desktop/agents/accounts');
		const settings = normalizeTerminalSettings({}).agents;
		settings.globalPermissionMode = 'manual';
		settings.agents[provider] = { ...settings.agents[provider], enabled: true, cliPath: process.execPath,
			accountId: 'changed-default', argsOverride: '--model "字面 空间" -- --not-a-prompt', env: { ORDER: 'settings', CUSTOM: '保留' } };
		vi.mocked(accountEnv).mockImplementation(async (_agent, id) => ({ HUHU_ACCOUNT_ID: `fixture/${id ? 'managed' : 'system'}`, HUHU_ACCOUNT_NAME: id,
			ORDER: 'account', ...(id ? { HOME: '/fixture/account', CODEX_HOME: '/fixture/codex' } : {}) }));
		const start = vi.fn(async () => {});
		await launchAgent({ app: {} as App, interactive: false, managed: true, getVaultPath: () => '/vault', getAgentSettings: () => settings,
			saveAgentSettings: async () => {}, start }, provider, { cwd: '/明确 目录', accountId: account });
		const expected = ['--model', '字面 空间'];
		if (provider === 'codex' && account) expected.push('-c', 'cli_auth_credentials_store="file"', '-c', 'mcp_oauth_credentials_store="file"', '-c', 'sqlite_home="/fixture/codex"', '-c', `log_dir=${JSON.stringify((await import('node:path')).join('/fixture/codex', 'log'))}`);
		expected.push('--', '--not-a-prompt');
		expect(start).toHaveBeenCalledWith({ file: process.execPath, args: expected, agentId: provider, cwd: '/明确 目录',
			env: { HUHU_ACCOUNT_ID: `fixture/${account ? 'managed' : 'system'}`, HUHU_ACCOUNT_NAME: account, ORDER: 'account', CUSTOM: '保留', ...(account ? { HOME: '/fixture/account', CODEX_HOME: '/fixture/codex' } : {}) },
			title: (await import('../../core/launch/catalog')).getAgent(provider).title });
		expect(accountEnv).toHaveBeenCalledWith(expect.objectContaining({ id: provider }), account, '/vault', 'device', true);
	});
}

test('GUI permission confirmation remains available even when its terminal will be background', async () => {
	const { Modal } = await import('obsidian');
	const { confirmLaunchPermissions } = await import('./launcher');
	const bound = host();
	bound.getAgentSettings().globalPermissionMode = 'yolo';
	bound.getAgentSettings().yoloAcknowledgedAgents = [];
	const open = vi.spyOn(Modal.prototype, 'open').mockImplementation(function (this: InstanceType<typeof Modal>) {
		this.onOpen();
		(this.contentEl.querySelectorAll('button')[1] as HTMLButtonElement | undefined)?.click();
	});
	try {
		expect(await confirmLaunchPermissions({ ...bound, interactive: true }, 'codex')).toBe(true);
		expect(open).toHaveBeenCalledOnce();
		expect(bound.saveAgentSettings).toHaveBeenCalledWith(expect.objectContaining({ yoloAcknowledgedAgents: ['codex'] }));
	} finally { open.mockRestore(); }
});

test('Pi exact resume keeps its transcript locator and custom argument boundary', async () => {
	const bound = host(), settings = bound.getAgentSettings();
	settings.agents.pi = { ...settings.agents.pi, enabled: true, cliPath: process.execPath, argsOverride: '--model "中文 model"' };
	settings.globalPermissionMode = 'manual';
	bound.managed = true; bound.interactive = false;
	bound.validateCwd = async () => {};
	vi.mocked(restoredAccountReference).mockResolvedValue({ env: { HUHU_ACCOUNT_ID: 'pi/system' }, transcriptPath: '/account/会话 空间.jsonl' });
	await resumeAgent(bound, { ...row, agentId: 'pi', sessionId: 'wrong-as-pi-locator' });
	expect(bound.start).toHaveBeenCalledWith(expect.objectContaining({ agentId: 'pi', cwd: '/external', args: ['--model', '中文 model', '--session', '/account/会话 空间.jsonl'] }));
});
