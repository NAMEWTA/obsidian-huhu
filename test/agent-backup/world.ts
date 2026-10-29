import { useStorageTimers, type StorageTimers } from '../../src/shared/storage/timers';
import { beforeEach, afterEach, vi } from 'vitest';
import { RecoveryHost, SETTINGS_VAULT_FILE, settingsDeviceFile, settingsOwner } from '../../src/app/recovery';
import { JsonStore } from '../../src/shared/json-store';
import { SettingsStore, type SettingsFile } from '../../src/shared/settings/store';
import type { RecoveryOwner } from '../../src/shared/storage/recovery-contracts';
import type {
	AgentRuntimePort,
	AutomationDefinition,
	AutomationRun,
	AutomationSourcePort,
} from '../../src/shared/automation/types';
import { parseDocumentValue } from '../../src/shared/storage/document-repository';
import { automationDocuments } from '../../src/modules/automations/core/documents';
import { agentSettings } from '../../src/modules/agent/settings';
import { AutomationService, automationRecoveryOwners } from '../../src/modules/automations/core/service';
import { notificationsRecoveryOwner, NotificationService } from '../../src/modules/notifications/core/service';
import { automationRuntimePath, isAutomationDefinitionPath } from '../../src/modules/automations/api';
import { notificationInboxPath } from '../../src/modules/notifications/api';
import type { NotificationDelivery } from '../../src/modules/notifications/core/ports';
import type { DirectoryPort } from '../../src/modules/agent/core/space/ports';
import type { PhysicalDirectory, VaultBinding } from '../../src/modules/agent/core/space/model';
import { createFileOwner } from '../../src/modules/agent/services/migrations/agent-owners';
import { SpaceService } from '../../src/modules/agent/services/spaces/space-service';
import { createSpaceWorkspaceStore } from '../../src/modules/agent/services/workspace-store';
import { spaceWorkspaceOwner } from '../../src/modules/agent/services/migrations/agent-owners';
import { FaultStorage } from '../agent-migrations/fault-storage';
import { agentWorkbenchPath } from '../../src/shared/storage/vault-layout';

/** Fault-injecting in-memory vault that can also list directories (a real adapter's `list`). */
export class ListStorage extends FaultStorage {
	/** Runs before every read: lets a test play another process writing between two steps. */
	onRead?: (path: string) => void;
	reboot(): ListStorage {
		return new ListStorage(this.files, this.dirs);
	}
	async read(path: string): Promise<string> {
		this.onRead?.(path);
		return super.read(path);
	}
	async list(directory: string): Promise<{ files: string[]; folders: string[] }> {
		if (this.dead) throw new Error('simulated power loss');
		const prefix = `${directory}/`;
		const files = new Set<string>();
		const folders = new Set<string>();
		for (const path of [...this.files.keys(), ...this.dirs]) {
			if (!path.startsWith(prefix)) continue;
			const rest = path.slice(prefix.length);
			const slash = rest.indexOf('/');
			if (slash < 0) {
				if (this.files.has(path)) files.add(path);
				else folders.add(path);
			} else folders.add(prefix + rest.slice(0, slash));
		}
		return { files: [...files], folders: [...folders] };
	}
}

export const vaultFor = (id: string, device: string, root: string, ino: string): VaultBinding => ({
	vaultId: id,
	deviceId: device,
	rootPath: root,
	root: { canonicalPath: root, dev: '1', ino },
});

/** Physical directory lookup of one machine: a directory exists when listed in `dirs`. */
export function directoryPort(vault: VaultBinding, dirs: ReadonlySet<string>): DirectoryPort {
	return {
		inspectVault: async () => vault,
		assertVault: async () => {},
		bindVaultDirectory: async (_v, relativePath) => {
			if (relativePath !== '' && !dirs.has(relativePath)) throw new Error('missing-directory');
			const target: PhysicalDirectory = {
				canonicalPath: relativePath ? `${vault.root.canonicalPath}/${relativePath}` : vault.root.canonicalPath,
				dev: '1',
				ino: relativePath
					? String(1000 + [...relativePath].reduce((sum, ch) => sum + ch.charCodeAt(0), 0))
					: vault.root.ino,
			};
			return { kind: 'vault', relativePath, target };
		},
		chooseExternalDirectory: async () => undefined,
		resolveDirectory: async () => ({ cwd: vault.root.canonicalPath }),
	};
}

export interface Counters {
	notified: string[];
	delivered: string[];
	started: number;
	stopped: number;
	scans: number;
}
export interface WorldOptions {
	readonly vault: VaultBinding;
	readonly dirs?: ReadonlySet<string>;
	/** Which modules are switched on. A module that is off registers no owner and starts no service. */
	readonly modules?: { agent?: boolean; automations?: boolean; notifications?: boolean };
	/** Automations load without executing: nothing is interrupted or published by the load itself. */
	readonly automationsExecute?: boolean;
}

const noSources: AutomationSourcePort = {
	list: async () => [],
	save: async () => {},
	remove: async () => {},
	open: async () => {},
	createTask: async () => {},
};

/** One running HUHU process over a vault storage, assembled from the real services and owners. */
export class World {
	readonly host: RecoveryHost;
	readonly counters: Counters = { notified: [], delivered: [], started: 0, stopped: 0, scans: 0 };
	readonly adopted: string[] = [];
	store!: SettingsStore;
	agent!: ReturnType<SettingsStore['bind']>;
	spaces?: SpaceService;
	layouts?: ReturnType<typeof createSpaceWorkspaceStore>;
	automations?: AutomationService;
	notifications?: NotificationService;
	definitionsListed = 0;
	/** While set, a system delivery does not finish: a notification stays in flight. */
	deliveryGate?: Promise<void>;
	readonly directories: DirectoryPort;
	constructor(
		readonly storage: ListStorage,
		readonly options: WorldOptions,
	) {
		this.host = new RecoveryHost(storage);
		this.directories = directoryPort(options.vault, options.dirs ?? new Set(['work']));
	}
	get vault(): VaultBinding {
		return this.options.vault;
	}
	get device(): string {
		return this.options.vault.deviceId;
	}

	async boot(): Promise<this> {
		const { storage, host } = this;
		const device = this.device;
		const timers = {
			set: (cb: () => void, ms: number) => setTimeout(cb, ms),
			clear: (h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>),
		};
		const valid = (v: unknown): v is Record<string, unknown> | null => v === null || (!!v && typeof v === 'object');
		const stores = {
			vault: new JsonStore<Record<string, unknown> | null>(storage, SETTINGS_VAULT_FILE, valid),
			device: new JsonStore<Record<string, unknown> | null>(storage, settingsDeviceFile(device), valid),
		};
		this.store = new SettingsStore(
			{
				load: async (scope) => (await stores[scope].load(null)) as SettingsFile | null,
				save: async (scope, file, base) =>
					(await stores[scope].commit({
						base: base as never,
						value: file as never,
					})) as unknown as SettingsFile,
			},
			{ timers },
		);
		await this.store.load();
		this.agent = this.store.bind('agent', agentSettings);
		host.register(settingsOwner(this.store, device, ['agent']));
		const modules = this.options.modules ?? {};
		if (modules.agent !== false) {
			const report = vi.fn();
			this.spaces = new SpaceService({
				storage,
				instanceId: 'live',
				report,
				directories: this.directories,
				owners: {
					acquire: async () => ({
						instanceId: 'live',
						port: 1,
						lost: new AbortController().signal,
						assertHeld: async () => {},
						close: async () => {},
					}),
				},
			});
			this.layouts = createSpaceWorkspaceStore(
				this.spaces,
				{ setTimeout: () => 1, clearTimeout: () => {} } as unknown as Pick<
					Window,
					'setTimeout' | 'clearTimeout'
				>,
				report,
			);
			await this.spaces.ready;
			host.register(spaceWorkspaceOwner(device, this.spaces, this.layouts));
			for (const [id, file] of [
				['agent-history', 'history.json'],
				['agent-workspace-stats', 'workspace-stats.json'],
				['agent-automation-sessions', 'automation-sessions.json'],
			] as const)
				host.register(
					createFileOwner(id, [`.huhu/terminal-agent/${device}/${file}`], {
						quiesce: () => {},
						drain: async () => {},
						reload: async () => {
							this.adopted.push(id);
						},
						resume: () => {},
					}),
				);
		}
		if (modules.notifications !== false) {
			const delivery: NotificationDelivery = {
				available: () => true,
				send: async (_channel, record) => {
					await this.deliveryGate;
					this.counters.delivered.push(record.id);
				},
				dispose: () => {},
			};
			this.notifications = new NotificationService(
				storage,
				notificationInboxPath(device),
				async () => {},
				delivery,
			);
			await this.notifications.load();
			host.register(notificationsRecoveryOwner(this.notifications, notificationInboxPath(device)));
		}
		if (modules.automations !== false) {
			const agent: AgentRuntimePort = {
				listAgents: () => [],
				listSessions: async () => [],
				start: vi.fn(async () => {
					this.counters.started++;
					return { terminalId: 't', completion: new Promise<never>(() => {}) };
				}),
				stop: vi.fn(async () => {
					this.counters.stopped++;
				}),
				open: vi.fn(async () => {}),
			};
			this.automations = new AutomationService(
				storage,
				automationRuntimePath(device),
				device,
				noSources,
				() => agent,
				async (run: AutomationRun) => {
					this.counters.notified.push(run.id);
				},
				this.options.automationsExecute !== false,
				{
					// The real repository codec reads the documents the import wrote (no canned list).
					definitions: {
						list: async () => {
							this.definitionsListed++;
							const found: AutomationDefinition[] = [];
							for (const folder of (await storage.list('.huhu/automation/definitions')).folders) {
								const path = `${folder}/操作.md`;
								if (!storage.files.has(path)) continue;
								const value = parseDocumentValue(storage.files.get(path)!);
								const id = String(value.properties['huhu-id']);
								found.push(...automationDocuments.decode([{ ...value, id, path }]).definitions);
							}
							return found;
						},
						save: async () => {},
						remove: async () => {},
					},
					attachMaterial: async () => {},
				},
			);
			await this.automations.load();
			for (const owner of automationRecoveryOwners(this.automations, device)) host.register(owner);
		}
		return this;
	}

	/** Stop everything the way a quit does, without recovery side effects. */
	async close(): Promise<void> {
		await this.automations?.shutdown().catch(() => {});
		await this.notifications?.shutdown().catch(() => {});
	}
}

export { SETTINGS_VAULT_FILE, settingsDeviceFile, agentWorkbenchPath, isAutomationDefinitionPath };
export type { RecoveryOwner };

beforeEach(() => useStorageTimers(globalThis as unknown as StorageTimers));
afterEach(() => useStorageTimers(undefined));
