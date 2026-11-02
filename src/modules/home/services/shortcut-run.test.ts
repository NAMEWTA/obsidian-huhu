import { expect, test, vi } from 'vitest';
import type { AgentDispatch, AgentQuickCommands } from '../../agent/api';
import type { ShortcutButton } from '../core/board/shortcut-buttons';
import { runShortcut, type ShortcutPorts } from './shortcut-run';

const agentButton = (extra: Partial<ShortcutButton> = {}): ShortcutButton => ({
	id: 'b',
	label: 'Review',
	icon: 'bot',
	type: 'agent',
	target: '',
	agentId: 'codex',
	prompt: 'go',
	...extra,
});
function ports(overrides: Partial<ShortcutPorts> = {}) {
	const notes: string[] = [];
	const dispatch = vi.fn<AgentDispatch['dispatch']>(async (request) => ({
		invocationId: request.invocationId,
		delivery: 'started',
	}));
	const quickRun = vi.fn(async (_id: string, _options?: { spaceId?: string }) => {});
	const quick: AgentQuickCommands = {
		list: () => [{ id: 'q', name: 'Q', type: 'terminal', scope: 'vault' }],
		subscribe: () => () => {},
		run: quickRun,
	};
	const value: ShortcutPorts = {
		hasFile: () => true,
		openFile: async () => {},
		hasCommand: () => true,
		runCommand: () => true,
		automations: () => undefined,
		quickCommands: () => quick,
		agents: () => [{ id: 'codex', enabled: true, installed: true }],
		dispatch: async () => ({ dispatch }),
		notify: (message) => notes.push(message),
		current: () => true,
		boardPath: 'Board.md',
		...overrides,
	};
	return { value, dispatch, quickRun, notes };
}

test('an agent button with a saved Space sends that exact Space interactively; none means the chooser decides', async () => {
	const p = ports();
	await runShortcut(agentButton({ spaceId: 'space-1' }), p.value);
	expect(p.dispatch.mock.calls[0]?.[0].destination).toEqual({ kind: 'fresh', cwd: '', spaceId: 'space-1' });
	expect(p.dispatch.mock.calls[0]?.[1]).toMatchObject({ interactive: true });
	await runShortcut(agentButton(), p.value);
	expect(p.dispatch.mock.calls[1]?.[0].destination).toEqual({ kind: 'fresh', cwd: '' });
});

test('a rejected or cancelled Space is reported and nothing is retried against another Space', async () => {
	const p = ports();
	p.dispatch.mockResolvedValue({ invocationId: 'x', delivery: 'rejected', errorCode: 'cancelled' });
	await runShortcut(agentButton(), p.value);
	expect(p.dispatch).toHaveBeenCalledTimes(1);
	expect(p.notes.length).toBeGreaterThan(0);
});

test('a quick command runs by id only: the agent module owns its saved Space or the chooser', async () => {
	const p = ports();
	await runShortcut({ id: 'k', label: 'Q', icon: 'zap', type: 'quick', target: 'q' }, p.value);
	expect(p.quickRun).toHaveBeenCalledExactlyOnceWith('q');
});

test('a page left before the press settles starts nothing', async () => {
	let live = true;
	const p = ports({ current: () => live });
	live = false;
	await runShortcut(agentButton({ spaceId: 'space-1' }), p.value);
	expect(p.dispatch).not.toHaveBeenCalled();
});
