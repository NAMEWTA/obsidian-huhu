import { expect, test, vi } from 'vitest';
import { AgentController } from './controller';
import { SpaceService } from './spaces/space-service';
import { createSpaceWorkspaceStore } from './workspace-store';
import type { VaultBinding } from '../core/space/model';

vi.mock('../platform/desktop/files', () => ({ openPath: vi.fn(), revealPath: vi.fn() }));

test('real controller disposal finishes every resource after strict workspace drain fails, then reports the original failure', async () => {
	const files = new Map<string, string>();
	const vault: VaultBinding = { vaultId: 'v', deviceId: 'd', rootPath: '/v', root: { canonicalPath: '/v', dev: '1', ino: '2' } };
	const close = vi.fn(async () => {});
	const spaces = new SpaceService({ instanceId: 'test', report: vi.fn(), storage: { exists: async p => files.has(p), read: async p => files.get(p)!, mkdir: async () => {}, write: async () => { throw new Error('disk full'); } },
		directories: { inspectVault: async () => vault, assertVault: async () => {}, bindVaultDirectory: async (_v, relativePath) => ({ kind: 'vault', relativePath, target: vault.root }), resolveDirectory: async () => ({ cwd: '/v' }), chooseExternalDirectory: async () => undefined },
		owners: { acquire: async () => ({ instanceId: 'test', port: 123, lost: new AbortController().signal, assertHeld: async () => {}, close }) },
	});
	const clock = { setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms) as unknown as number, clearTimeout: (id: number) => clearTimeout(id) } as Pick<Window, 'setTimeout' | 'clearTimeout'>;
	const persistence = createSpaceWorkspaceStore(spaces, clock, vi.fn());
	await persistence.ready;
	await expect(spaces.create({ name: 'x', relativePath: '' })).rejects.toMatchObject({ code: 'PERSISTENCE_FAILED' });
	const disposable = () => ({ dispose: vi.fn(async () => {}) });
	const resources = { sessions: disposable(), agents: disposable(), usageStore: disposable(), historyStore: disposable(), workspaceUsage: disposable(), workspaceHistoryStore: disposable(), stats: disposable(), workspace: { quiesce: () => spaces.quiesceLaunches(), drainManaged: () => persistence.flush(), persistence, dispose: () => persistence.dispose() }, materials: disposable(), prompts: disposable(), runtime: disposable(), hooks: disposable(), usage: disposable(), workspaceHistory: disposable(), listeners: new Set([() => {}]), stopped: false };
	let failure: unknown;
	try { await AgentController.prototype.dispose.call(resources as unknown as AgentController); } catch (error) { failure = error; }
	expect(failure).toBeInstanceOf(AggregateError);
	expect((failure as AggregateError).errors).toEqual([expect.objectContaining({ code: 'PERSISTENCE_FAILED' })]);
	for (const [name, resource] of Object.entries(resources)) if (name !== 'workspace' && typeof resource === 'object' && resource && 'dispose' in resource) expect(resource.dispose).toHaveBeenCalledOnce();
	expect(close).toHaveBeenCalledOnce();
	expect(resources.listeners.size).toBe(0);
	expect(resources.stopped).toBe(true);
});
