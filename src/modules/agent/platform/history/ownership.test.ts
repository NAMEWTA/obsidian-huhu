import { createRequire } from 'node:module';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect, test, vi } from 'vitest';
import type { App } from 'obsidian';
import { initializeTestDevice } from '../../../../../test/fixtures/vault-storage';
import { nativeVaultStorage } from '../../../../host/desktop/vault-storage';
import { deviceId } from '../../../../host/obsidian/storage/device-id';
import { normalizeAgentSettings } from '../../core/launch/defaults';
import { getAgent } from '../../core/launch/catalog';
import { accountEnv } from '../desktop/agents/accounts';
import type { HistoryClientSource, NativeSessionSummary } from '../desktop/server/agent-data-client';
import { NativeHistory, type HistoryOwnerBinding } from './service';

test('the native boundary and Space owner share exact account, source and device provenance', async () => {
	const vault = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-history-owner-')));
	vi.stubGlobal('window', { require: createRequire(import.meta.url) });
	let history: NativeHistory | undefined;
	try {
		const app = {
			vault: { adapter: { ...nativeVaultStorage(vault), getBasePath: () => vault } },
		} as unknown as App;
		await initializeTestDevice(app);
		await accountEnv(getAgent('codex'), 'a', vault, deviceId(app), true);
		const requests: Array<{ operation: string; payload: Record<string, unknown> }> = [];
		const client = {
			isConnected: () => true,
			connectionRevision: 1,
			subscribeConnection: () => () => {},
			request: async (operation: string, payload: Record<string, unknown>) => {
				requests.push({ operation, payload });
				return operation === 'scan' ? { warnings: [], revision: 1 } : operation === 'read' ? { ...(payload.expectedSource as object), key: payload.key, text: '' } : { rows: [], total: 0, revision: 1 };
			},
		};
		const binding: HistoryOwnerBinding = {
			agentId: 'codex',
			sessionId: 'same',
			accountId: 'a',
			deviceId: deviceId(app),
			transcriptPath: '/exact/source.jsonl',
		};
		let bindings = [binding];
		history = new NativeHistory(
			app,
			{ historyClient: async () => client } as unknown as HistoryClientSource,
			() => normalizeAgentSettings({}),
			() => ({ codex: ['a'] }),
			'vault',
			() => bindings,
		);
		await history.scan();
		const scope = requests[0]!.payload;
		const root = (scope.roots as Array<{ agentId: string; accountId: string; accountKey: string }>).find(
			(row) => row.agentId === 'codex' && row.accountId === 'a',
		)!;
		const tuple = {
			agentId: 'codex',
			sessionId: 'same',
			accountKey: root.accountKey,
			deviceId: deviceId(app),
			transcriptPath: '/exact/source.jsonl',
			sourceRef: `codex:${root.accountKey}:/exact/source.jsonl`,
		};
		expect(scope.deviceId).toBe(deviceId(app));
		expect(scope.ownedSessions).toEqual([tuple]);
		await history.query();
		const row: NativeSessionSummary = {
			...tuple,
			key: 'key',
			cwd: '/exact',
			title: 'Owned history',
			modifiedAtMs: 1,
			usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: null, known: false },
		};
		await history.read(row);
		expect(requests.slice(1).map((request) => request.payload.ownedSessions)).toEqual([[tuple], [tuple]]);
		expect(requests.find((request) => request.operation === 'read')!.payload.expectedSource).toEqual(tuple);
		const mutableSelection = { ...row };
		const reading = history.read(mutableSelection);
		mutableSelection.sourceRef = 'a-new-selection';
		expect((await reading).sourceRef).toBe(tuple.sourceRef);
		const owns = await history.ownerMatcher();
		expect(owns(row, binding)).toBe(true);
		for (const altered of [
			{ accountKey: '{}' },
			{ transcriptPath: '/another/source.jsonl' },
			{ sourceRef: 'another-source' },
		])
			expect(owns({ ...row, ...altered }, binding)).toBe(false);
		expect(owns(row, { ...binding, deviceId: 'another-device' })).toBe(false);
		bindings = [{ ...binding, transcriptPath: '' }];
		expect(history.stale).toBe(true);
		await history.scan();
		expect(requests.at(-1)!.payload.ownedSessions).toEqual([]);
	} finally {
		await history?.dispose();
		vi.unstubAllGlobals();
		await fs.rm(vault, { recursive: true, force: true });
	}
});
