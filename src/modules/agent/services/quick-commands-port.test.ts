import { expect, test, vi } from 'vitest';
import type { QuickCommand, TerminalSettings } from '../core/terminal/settings';
import { quickCommandsPort } from './quick-commands-port';
import { ManagedLaunchError, managedFailure } from './launch/managed-errors';
import { t } from '../../../shared/i18n';

const command = (id: string, extra: Partial<QuickCommand> = {}): QuickCommand => ({
	id,
	name: `Command ${id}`,
	type: 'terminal',
	content: `echo ${id}`,
	agentId: 'claude-code',
	cwd: '',
	scope: 'vault',
	...extra,
});

function fixture(initial: QuickCommand[]) {
	let quickCommands = initial;
	const listeners = new Set<() => void>(),
		run = vi.fn(async (_command: QuickCommand, _group?: string, _options?: { spaceId?: string }) => {});
	const port = quickCommandsPort(
		{ runQuickCommand: run },
		{
			get: () => ({ quickCommands }) as TerminalSettings,
			subscribe: (listener) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		},
	);
	return {
		port,
		run,
		set(next: QuickCommand[]) {
			quickCommands = next;
			for (const listener of [...listeners]) listener();
		},
		listeners,
	};
}

test('lists names, types and scopes without the command text', () => {
	const f = fixture([command('a'), command('b', { type: 'agent', agentId: 'codex', scope: 'global' })]);
	expect(f.port.list()).toEqual([
		{ id: 'a', name: 'Command a', type: 'terminal', scope: 'vault' },
		{ id: 'b', name: 'Command b', type: 'agent', scope: 'global', agentId: 'codex' },
	]);
	expect(JSON.stringify(f.port.list())).not.toContain('echo');
});

test('runs a saved command through the controller and rejects one that was deleted', async () => {
	const f = fixture([command('a')]);
	await f.port.run('a');
	expect(f.run).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ id: 'a', content: 'echo a' }),
		undefined,
		{ spaceId: undefined },
	);
	f.set([]);
	await expect(f.port.run('a')).rejects.toThrow();
	expect(f.run).toHaveBeenCalledTimes(1);
});

test('subscribers hear about changes until they leave', () => {
	const f = fixture([]);
	const listener = vi.fn();
	const off = f.port.subscribe(listener);
	f.set([command('a')]);
	off();
	f.set([]);
	expect(listener).toHaveBeenCalledTimes(1);
	expect(f.listeners.size).toBe(0);
});

test('a saved Space is listed by id and an explicit Space reaches the controller unchanged', async () => {
	const f = fixture([command('a', { spaceId: 'space-1' }), command('b')]);
	expect(f.port.list().map((item) => item.spaceId)).toEqual(['space-1', undefined]);
	await f.port.run('b', { spaceId: 'space-2' });
	expect(f.run).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }), undefined, { spaceId: 'space-2' });
	// The port never fills a Space in: a command without one is run without one so the chooser decides.
	await f.port.run('b');
	expect(f.run).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'b' }), undefined, { spaceId: undefined });
});

test('the error the real launch path throws for a gone Space reads as a sentence, not a code', async () => {
	const f = fixture([command('a', { spaceId: 'gone' })]);
	// workspace-service's legacyManagedResult throws exactly this when requireSpace rejects an archived Space.
	f.run.mockRejectedValueOnce(new ManagedLaunchError(managedFailure('TARGET_NOT_FOUND', 'archived-space'), 'none'));
	const error = (await f.port.run('a').catch((cause: unknown) => cause)) as Error;
	expect(error.message).toBe(t('agent.spaces.error.missing'));
	expect(error.message).not.toContain('TARGET_NOT_FOUND');
});
