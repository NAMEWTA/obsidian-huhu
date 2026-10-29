import { emptyRecords, type WorkbenchRecords } from '../../src/modules/agent/services/spaces/records';
import { stringify } from 'yaml';
import { automationDocuments } from '../../src/modules/automations/core/documents';
import type { AutomationDefinition } from '../../src/shared/automation/types';
import { openTab } from '../../src/modules/agent/core/workspace/ops';
import type { BrowserTabData } from '../../src/modules/agent/core/workspace/model';
import { automationRuntimePath } from '../../src/modules/automations/api';
import { notificationInboxPath } from '../../src/modules/notifications/api';
import { agentWorkbenchPath } from '../../src/shared/storage/vault-layout';
import { settingsDeviceFile, SETTINGS_VAULT_FILE, vaultFor, type ListStorage } from './world';

export const SRC = vaultFor('vault-S', 'dev-a', '/src/vault', '100');
export const DST = vaultFor('vault-T', 'dev-b', '/dst/vault', '200');
export const OTHER_DEVICE = 'dev-c';

export const SECRET = 'sk-test-SECRET-token-0001';

const browserTab = (id: string): BrowserTabData => ({
	kind: 'browser',
	id,
	title: id,
	pageId: `page-${id}`,
	url: 'https://example.com/',
	profileId: 'default',
	zoom: 1,
	createdAt: 1,
});

/** Two Spaces on the same directory, one external Space with a grant, two accounts that share a session id. */
export function sourceRecords(vault = SRC): WorkbenchRecords {
	const records = emptyRecords(vault);
	const space = (id: string, name: string, directory: WorkbenchRecords['spaces'][string]['directory']) => {
		records.spaces[id] = { id, name, archived: false, createdAt: 10, updatedAt: 11, directory };
	};
	const target = { canonicalPath: `${vault.root.canonicalPath}/work`, dev: '1', ino: '101' };
	space('space-1', 'Work A', { kind: 'vault', relativePath: 'work', target });
	space('space-2', 'Work B (same folder)', { kind: 'vault', relativePath: 'work', target });
	space('space-3', 'External', { kind: 'external', grantId: 'grant-1' });
	records.grants['grant-1'] = {
		id: 'grant-1',
		createdAt: 12,
		selectedPath: '/home/someone/project',
		target: { canonicalPath: '/home/someone/project', dev: '5', ino: '77' },
		vaultRoot: vault.root,
		deviceId: vault.deviceId,
	};
	for (const [id, spaceId, accountId] of [
		['ses-1', 'space-1', 'acct-A'],
		['ses-2', 'space-2', 'acct-B'],
	] as const)
		records.sessions[id] = {
			id,
			spaceId,
			kind: 'agent',
			title: `Session ${id}`,
			agentId: 'codex',
			accountId,
			// The same native id under two accounts: they must stay two different sessions.
			nativeSessionId: 'dup-native',
			createdAt: 20,
			nativeImport: {
				sourceRef: `codex/${accountId}/dup-native`,
				accountKey: accountId,
				deviceId: vault.deviceId,
				importedAt: 21,
			},
		};
	records.historyOwners = { [`codex/acct-A/dup-native`]: 'space-1', [`codex/acct-B/dup-native`]: 'space-2' };
	records.selectedSpaceId = 'space-1';
	records.layouts['space-1'] = openTab(
		{ version: 1, tabs: {}, groups: [], closedTabs: [] },
		undefined,
		browserTab('tab-1'),
	);
	records.inbox = {
		version: 1,
		nextSequence: 3,
		messages: [
			{
				messageId: 'msg-1',
				recipient: { spaceId: 'space-1', sessionId: 'ses-1' },
				source: 'agent:test',
				body: 'Please review the notes',
				references: [{ kind: 'vault-file', vaultId: vault.vaultId, path: 'notes/a.md' }],
				sendSequence: 1,
				createdAt: 30,
				ack: { ackedAt: 31 },
			},
			{
				messageId: 'msg-2',
				recipient: { spaceId: 'space-2', sessionId: 'ses-2' },
				source: 'agent:test',
				body: 'Second, not acknowledged',
				references: [],
				sendSequence: 2,
				createdAt: 32,
			},
		],
	};
	return records;
}

export const HISTORY = JSON.stringify({
	[JSON.stringify(['codex', 'acct-A', 'dup-native'])]: { title: 'Annotated A', note: 'alpha' },
	[JSON.stringify(['codex', 'acct-B', 'dup-native'])]: { title: 'Annotated B', note: 'beta' },
});
export const STATS = JSON.stringify({
	version: 1,
	firstEventAt: 100,
	agentsLaunched: 7,
	agentWorkMs: 123456,
	daily: { '2026-10-01': { launched: 3, workMs: 1000 } },
	byAgent: { codex: { launched: 7, workMs: 123456 } },
});
export const REGISTRY = JSON.stringify([
	{ agentId: 'codex', sessionId: 'dup-native', accountKey: 'acct-A', cwd: '/src/vault/work' },
	{ agentId: 'codex', sessionId: 'dup-native', accountKey: 'acct-B', cwd: '/src/vault/work' },
]);

export const request = {
	invocationId: 'inv-1',
	title: 'Review',
	agentId: 'codex',
	source: { kind: 'widget', path: 'A.md', id: 'button' },
	destination: { kind: 'fresh', cwd: '/src/vault/work', spaceId: 'space-1' },
	finalPrompt: 'Review $this',
	files: ['A.md'],
};
export const RUN_DEFINITION = {
	id: 'auto-aaaaaaaa',
	name: 'Daily review',
	enabled: true,
	deviceId: 'dev-a',
	revision: 1,
	schedule: { kind: 'manual' },
	action: { kind: 'notify', message: 'hi' },
	channels: ['in-app'],
	notifyOn: 'always',
	graceMinutes: 0,
	createdAt: 1,
	updatedAt: 1,
};
const run = (id: string, patch: Record<string, unknown> = {}) => ({
	definition: RUN_DEFINITION,
	id,
	automationId: 'auto-aaaaaaaa',
	revision: 1,
	title: 'Daily review',
	scheduledFor: 1000,
	trigger: 'manual',
	status: 'succeeded',
	startedAt: 1000,
	endedAt: 2000,
	message: '',
	timeline: [{ phase: 'queued', at: 1000 }],
	...patch,
});
export const RUNS = [
	run('run-done', {
		notificationAttempted: true,
		output: 'Full result text',
		usage: { inputTokens: 5, outputTokens: 9 },
		session: {
			agentId: 'codex',
			sessionId: 'dup-native',
			cwd: '/src/vault/work',
			title: 't',
			modifiedAtMs: 1,
			accountKey: 'acct-A',
		},
		invocation: {
			request,
			receipt: { invocationId: 'inv-1', runId: 'run-done', delivery: 'started', terminalId: 'term-1' },
		},
		taskDelivery: { effectKey: 'effect-1', target: 'calendar', path: 'Calendar.md' },
		retryOf: 'run-earlier',
	}),
	run('run-pending-unsent', { status: 'pending', endedAt: undefined, startedAt: 3000 }),
	run('run-running', {
		status: 'running',
		endedAt: undefined,
		startedAt: 4000,
		notificationAttempted: false,
		terminalId: 'live-terminal',
		invocation: { request: { ...request, invocationId: 'inv-2' } },
	}),
	run('run-failed-unsent', { status: 'failed', message: 'boom', errorCode: 'operationFailed' }),
];
export const RUNTIME = () =>
	JSON.stringify({
		definitions: [],
		runs: RUNS.map((row) => structuredClone(row)),
		cursors: { 'auto-aaaaaaaa:1': 1000 },
	});

export const INBOX = JSON.stringify({
	records: [
		{
			id: 'run-done',
			title: 'Daily review',
			body: 'Succeeded',
			channels: ['in-app'],
			createdAt: 5,
			read: true,
			deliveries: { 'in-app': 'sent' },
		},
		{
			id: 'run-pending',
			title: 'Pending one',
			body: 'x',
			channels: ['in-app', 'system'],
			createdAt: 6,
			read: false,
			deliveries: { 'in-app': 'sent', system: 'pending' },
		},
	],
	receipts: {
		'run-done': { 'in-app': 'sent' },
		'run-pending': { 'in-app': 'sent', system: 'pending' },
		// The record was cleared after reading; only the tombstone remains and must still deduplicate.
		'run-cleared': { 'in-app': 'sent' },
	},
});

/** A definition document written the way the automations repository writes it (its own codec, not a hand-made file). */
export function definitionDocument(id: string, name: string, device: string, enabled = true): string {
	const definition: AutomationDefinition = {
		id,
		name,
		enabled,
		deviceId: device,
		revision: 1,
		schedule: { kind: 'manual' },
		action: { kind: 'notify', body: `Body of ${name}` },
		channels: ['in-app'],
		notifyOn: 'always',
		graceMinutes: 0,
		createdAt: 1,
		updatedAt: 2,
	};
	const [document] = automationDocuments.encode({ definitions: [definition] });
	let text = `---\n${stringify(document!.properties)}---\n`;
	for (const [section, content] of Object.entries(document!.sections ?? {}))
		text += `\n<!-- huhu:${section} -->\n${content}\n<!-- /huhu:${section} -->\n`;
	return text;
}
export const definitionFolder = (name: string, id: string) => `.huhu/automation/definitions/${name}-${id.slice(-8)}`;

export function agentSettingsFile(extra: Record<string, unknown> = {}, others: Record<string, unknown> = {}): string {
	return JSON.stringify({
		version: 1,
		namespaces: {
			...others,
			agent: {
				fontSize: 17,
				fontFamily: 'Fira Code',
				quickCommands: [
					{
						id: 'q1',
						name: 'Build',
						type: 'terminal',
						content: 'pnpm build',
						agentId: 'codex',
						cwd: '',
						scope: 'global',
					},
				],
				permissionMode: 'yolo',
				customShellPath: '/usr/local/bin/fish',
				skillDirectories: ['/home/me/skills'],
				overrides: { codex: { command: '/opt/codex', env: { OPENAI_API_KEY: SECRET } } },
				agents: {
					globalPermissionMode: 'yolo',
					yoloAcknowledged: true,
					agents: {
						codex: {
							enabled: true,
							cliPath: '/opt/codex',
							permissionMode: 'yolo',
							extraArgs: `--token ${SECRET}`,
							env: { TOKEN: SECRET },
							accountId: 'acct-A',
							showUsage: true,
						},
					},
				},
				...extra,
			},
		},
	});
}

/** Everything a source device owns, as the products wrote it. */
export function seedSource(storage: ListStorage, options: { documents?: number; otherDevice?: boolean } = {}): void {
	const d = SRC.deviceId;
	storage.files.set(settingsDeviceFile(d), agentSettingsFile({}, { browser: { homepage: 'x' } }));
	storage.files.set(SETTINGS_VAULT_FILE, JSON.stringify({ version: 1, namespaces: { app: { language: 'en' } } }));
	storage.files.set(agentWorkbenchPath(d), JSON.stringify(sourceRecords()));
	storage.files.set(`.huhu/terminal-agent/${d}/history.json`, HISTORY);
	storage.files.set(`.huhu/terminal-agent/${d}/workspace-stats.json`, STATS);
	storage.files.set(`.huhu/terminal-agent/${d}/automation-sessions.json`, REGISTRY);
	storage.files.set(automationRuntimePath(d), RUNTIME());
	storage.files.set(notificationInboxPath(d), INBOX);
	const count = options.documents ?? 2;
	for (let i = 0; i < count; i++) {
		const id = `auto-${String(i).padStart(8, '0')}`;
		const name = i === 0 ? 'Daily-review' : `Doc-${i}`;
		storage.files.set(`${definitionFolder(name, id)}/操作.md`, definitionDocument(id, name, d, i % 2 === 0));
	}
	if (options.otherDevice) {
		storage.files.set(
			`.huhu/terminal-agent/${OTHER_DEVICE}/history.json`,
			JSON.stringify({ k: { title: 'other device' } }),
		);
		storage.files.set(
			notificationInboxPath(OTHER_DEVICE),
			JSON.stringify({ records: [], receipts: { z: { 'in-app': 'sent' } } }),
		);
	}
}
