import { expect, test, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { TestProviders } from '../../../../ui/react/test-providers';
import type { SettingsHandle } from '../../../../shared/settings/store';
import { t } from '../../../../shared/i18n';
import { normalizeTerminalSettings, type TerminalSettings } from '../../core/terminal/settings';
import { AgentsStore } from '../../services/agents-store';
import { AgentTools } from '../../services/agent-tools';
import type { Exec } from '../../platform/desktop/install/exec';
import type { AgentController } from '../../services/controller';
import { AgentsSettings } from './AgentsSettings';

vi.mock('../../platform/desktop/detection/shell-path', () => ({ loginShellPath: async () => '/bin' }));
vi.mock('../../platform/desktop/detection/probe', () => ({ probeAgents: () => ({ codex: '/usr/bin/codex' }) }));

async function fixture(exec: Exec) {
	const state = createStore(() => normalizeTerminalSettings({}));
	const settings = {
		get: state.getState,
		subscribe: state.subscribe,
		update: async (recipe: (draft: TerminalSettings) => void) => {
			const draft = structuredClone(state.getState());
			recipe(draft);
			state.setState(draft, true);
		},
	} as unknown as SettingsHandle<TerminalSettings>;
	const agents = new AgentsStore(settings);
	await agents.refresh();
	const tools = new AgentTools({
		exec,
		fetchLatest: async () => '0.163.0',
		realPath: (f) => f,
		platform: 'linux',
		path: async () => '',
		detected: () => agents.store.getState().detected,
		redetect: () => agents.refresh(true),
	});
	await tools.inspect();
	const controller = { settings, agents, tools, workspace: { report: vi.fn() } } as unknown as AgentController;
	const view = render(
		<TestProviders>
			<AgentsSettings controller={controller} />
		</TestProviders>,
	);
	const row = (id: string) => within(view.container.querySelector(`[data-agent-catalog="${id}"]`)! as HTMLElement);
	return { row, user: userEvent.setup(), tools };
}

const ok = (stdout: string) => ({ code: 0, stdout, stderr: '' });

test('installed row shows version, newer version, location and the other installs; Upgrade runs the CLI updater', async () => {
	const calls: string[][] = [];
	const exec: Exec = async (file, args) => {
		calls.push([file, ...args]);
		if (file === 'which') return ok('/usr/bin/codex\n/home/u/.local/bin/codex\n');
		return ok('codex-cli 0.162.0');
	};
	const f = await fixture(exec);
	const codex = f.row('codex');
	expect(codex.getByText('0.162.0')).toBeTruthy();
	expect(codex.getByText(t('agent.tools.newVersion', { version: '0.163.0' }))).toBeTruthy();
	expect(codex.getByText('/usr/bin/codex')).toBeTruthy();
	await f.user.click(codex.getByRole('button', { name: t('agent.tools.otherInstalls', { count: 1 }) }));
	expect(codex.getByText('/home/u/.local/bin/codex')).toBeTruthy();
	await f.user.click(codex.getByRole('button', { name: t('agent.tools.upgrade') }));
	await waitFor(() => expect(calls).toContainEqual(['/usr/bin/codex', 'update']));
});

test('not installed row offers Install, shows the busy state and then the failure with its output', async () => {
	let release!: () => void;
	const gate = new Promise<void>((r) => (release = r));
	const exec: Exec = async (file) => {
		if (file === 'bash' || file === 'npm') {
			await gate;
			return { code: 1, stdout: '', stderr: 'npm ERR! network' };
		}
		return ok('0.162.0');
	};
	const f = await fixture(exec);
	const gemini = f.row('gemini');
	await f.user.click(gemini.getByRole('button', { name: t('agent.tools.install') }));
	expect((gemini.getByRole('button', { name: t('agent.tools.installing') }) as HTMLButtonElement).disabled).toBe(true);
	release();
	await waitFor(() => expect(gemini.getByRole('alert')).toBeTruthy());
	await f.user.click(gemini.getByRole('button', { name: t('agent.tools.showOutput') }));
	expect(gemini.getByText('npm ERR! network')).toBeTruthy();
	void screen;
});
