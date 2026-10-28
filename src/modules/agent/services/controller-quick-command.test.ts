import { createRequire } from 'node:module';
import { t } from '../../../shared/i18n';
import { expect, test, vi } from 'vitest';
import { AgentController } from './controller';
import { ManagedLaunchError, managedFailure } from './launch/managed-errors';
import type { QuickCommand } from '../core/terminal/settings';

vi.mock('electron', () => ({ shell: {}, webUtils: {} }));

const command = (extra: Partial<QuickCommand> = {}): QuickCommand => ({
	id: 'q',
	name: 'Q',
	type: 'terminal',
	content: 'echo hi',
	agentId: 'claude-code',
	cwd: '',
	scope: 'vault',
	...extra,
});

function fixture(created: 'cancel' | 'start' = 'start', vault?: string) {
	const session = { id: 'runtime-1' };
	const newTerminal = vi.fn(async (_options: Record<string, unknown>) =>
		created === 'start' ? 'runtime-1' : undefined,
	);
	const newAgent = vi.fn(async (_id: string, _options: Record<string, unknown>) =>
		created === 'start' ? 'runtime-1' : undefined,
	);
	const update = vi.fn(async (_edit: (draft: { lastQuickCommand: string }) => void) => {});
	const typeWhenReady = vi.fn(async () => {});
	const self = {
		prepare: async () => {},
		vaultPath: () => vault,
		agents: { list: () => [{ id: 'claude-code' }] },
		workspace: { newTerminal, newAgent },
		sessions: { get: (id: string) => (id === 'runtime-1' ? session : undefined) },
		settings: { update },
		typeWhenReady,
	};
	const run = (item: QuickCommand, options?: { spaceId?: string }) =>
		AgentController.prototype.runQuickCommand.call(self as unknown as AgentController, item, undefined, options);
	return { run, newTerminal, newAgent, update, typeWhenReady };
}

test('a command without a Space goes to the existing chooser; cancelling starts nothing and records nothing', async () => {
	const f = fixture('cancel');
	await f.run(command());
	expect(f.newTerminal).toHaveBeenCalledWith(expect.objectContaining({ spaceId: undefined }));
	expect(f.typeWhenReady).not.toHaveBeenCalled();
	expect(f.update).not.toHaveBeenCalled();
	await f.run(command({ type: 'agent' }));
	expect(f.newAgent).toHaveBeenCalledWith('claude-code', expect.objectContaining({ spaceId: undefined }));
	expect(f.update).not.toHaveBeenCalled();
});

test('a saved vault-scope Space is used exactly; an explicit Space wins; a global command never reuses a stored id', async () => {
	const f = fixture();
	await f.run(command({ spaceId: 'space-a' }));
	expect(f.newTerminal).toHaveBeenLastCalledWith(expect.objectContaining({ spaceId: 'space-a' }));
	await f.run(command({ spaceId: 'space-a' }), { spaceId: 'space-b' });
	expect(f.newTerminal).toHaveBeenLastCalledWith(expect.objectContaining({ spaceId: 'space-b' }));
	await f.run(command({ scope: 'global', spaceId: 'space-a' }));
	expect(f.newTerminal).toHaveBeenLastCalledWith(expect.objectContaining({ spaceId: undefined }));
	expect(f.typeWhenReady).toHaveBeenCalledTimes(3);
	expect(f.update).toHaveBeenCalledTimes(3);
});

test('a saved Space that was archived or deleted rejects the run instead of moving to another Space', async () => {
	const f = fixture();
	// workspace-service reports a gone Space as a failed managed launch, thrown by legacyManagedResult.
	f.newTerminal.mockRejectedValueOnce(
		new ManagedLaunchError(managedFailure('TARGET_NOT_FOUND', 'archived-space'), 'none'),
	);
	await expect(f.run(command({ spaceId: 'gone' }))).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
	expect(f.typeWhenReady).not.toHaveBeenCalled();
	expect(f.update).not.toHaveBeenCalled();
});

test('the saved directory is passed on (relative to the vault) for the Space check; none is passed when empty', async () => {
	const f = fixture();
	// vaultPath() is undefined in this fixture, so a relative path stays as written; an absolute one is untouched.
	await f.run(command({ cwd: 'src/app' }));
	expect(f.newTerminal).toHaveBeenLastCalledWith(expect.objectContaining({ cwd: 'src/app' }));
	await f.run(command({ cwd: '/abs/dir' }));
	expect(f.newTerminal).toHaveBeenLastCalledWith(expect.objectContaining({ cwd: '/abs/dir' }));
	await f.run(command({ cwd: '' }));
	expect(f.newTerminal).toHaveBeenLastCalledWith(expect.objectContaining({ cwd: undefined }));
});

test('the saved directory is canonicalised like an automation cwd, against the real vault root', async () => {
	const { mkdtemp, mkdir, symlink, realpath, rm } = await import('node:fs/promises');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const previous = Reflect.get(globalThis, 'window');
	vi.stubGlobal('window', { require: createRequire(import.meta.url) });
	const base = await realpath(await mkdtemp(join(tmpdir(), 'huhu-quick-cwd-')));
	try {
		const vault = join(base, 'vault'),
			link = join(base, 'vault-link'),
			outside = join(base, 'outside');
		await mkdir(join(vault, 'inner'), { recursive: true });
		await mkdir(outside);
		await symlink(vault, link);
		const f = fixture('start', link);
		// A command saved with the vault path, or '.', canonicalises to the real vault root, which the Space check maps to the Space.
		await f.run(command({ cwd: link }));
		expect(f.newTerminal).toHaveBeenLastCalledWith(
			expect.objectContaining({ cwd: vault, cwdScope: expect.objectContaining({ vaultRoot: vault }) }),
		);
		await f.run(command({ cwd: '.' }));
		expect(f.newTerminal).toHaveBeenLastCalledWith(expect.objectContaining({ cwd: vault }));
		// A relative folder behind a symlinked vault path resolves to the real folder.
		await f.run(command({ cwd: 'inner' }));
		expect(f.newTerminal).toHaveBeenLastCalledWith(expect.objectContaining({ cwd: join(vault, 'inner') }));
		expect((f.newTerminal.mock.calls.at(-1)?.[0].cwdScope as { platform: string }).platform).toBe(process.platform);
		const calls = f.newTerminal.mock.calls.length;
		// Outside the vault, or missing: refused before anything starts or is recorded.
		await expect(f.run(command({ cwd: outside }))).rejects.toMatchObject({ code: 'DIRECTORY_NOT_AUTHORIZED' });
		// A folder that is gone reports that, not an authorization problem.
		await expect(f.run(command({ cwd: 'missing' }))).rejects.toThrow(t('agent.quick.cwdMissing'));
		expect(f.newTerminal.mock.calls.length).toBe(calls);
		expect(f.update).toHaveBeenCalledTimes(3);
	} finally {
		vi.stubGlobal('window', previous);
		await rm(base, { recursive: true, force: true });
	}
});
