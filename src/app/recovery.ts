import type { App } from 'obsidian';
import type { SettingsStore } from '../shared/settings/store';
import {
	drainSettings,
	holdSettings,
	reloadSettingsNamespaces,
	resumeSettings,
} from '../shared/settings/settings-recovery';
import { privateVaultStorage } from '../host/obsidian/storage/private-storage';
import {
	isSafeRelativePath,
	RecoveryError,
	type RecoveryAccess,
	type RecoveryOutcome,
	type RecoveryOwner,
	type RecoveryResult,
	type RecoveryRunOptions,
	type RecoveryStorage,
} from '../shared/storage/recovery-contracts';
import { RecoveryGate, recoverPending, runRecoveryTransaction } from '../shared/storage/recovery-transaction';

/** The two settings files; must match `loadSettingsRuntime` in settings/runtime.ts. */
export const SETTINGS_VAULT_FILE = '.huhu/config/settings.json';
export const settingsDeviceFile = (device: string): string => `.huhu/config/devices/${device}.json`;

/**
 * App-level coordinator of the restart-safe replacement protocol. Modules publish `RecoveryOwner`s here
 * (T-15 registers the agent writers, T-16 automations and notifications); `shared/storage` stays pure.
 */
export class RecoveryHost implements RecoveryAccess {
	readonly gate = new RecoveryGate();
	private readonly owners = new Map<string, RecoveryOwner>();
	private running: Promise<unknown> = Promise.resolve();
	constructor(readonly storage: RecoveryStorage) {}

	/** Duplicate ids are a wiring error: two owners for one id would hide a writer from the gate. */
	register(owner: RecoveryOwner): () => void {
		if (this.owners.has(owner.id)) throw new RecoveryError('PATH_INVALID', `duplicate-owner:${owner.id}`);
		this.owners.set(owner.id, owner);
		return () => {
			if (this.owners.get(owner.id) === owner) this.owners.delete(owner.id);
		};
	}
	has(ownerId: string): boolean {
		return this.owners.has(ownerId);
	}
	get ownerIds(): readonly string[] {
		return [...this.owners.keys()];
	}

	/** Before any owner loads its files. A failure keeps the gate held; callers must not start businesses. */
	async recoverBeforeStart(): Promise<RecoveryOutcome> {
		try {
			return await recoverPending(this.storage);
		} catch (error) {
			const held =
				error instanceof RecoveryError
					? error
					: new RecoveryError('UNRECOVERABLE', 'recovery-failed', {}, { cause: error });
			this.gate.hold(held);
			throw held;
		}
	}

	/** Waits for any running operation; new owners (for example the shared workspace) start only on settled files. */
	async settled(): Promise<void> {
		await this.running.catch(() => undefined);
		this.gate.assertOpen();
	}

	/** Runs one transaction across the named registered owners (all registered owners when omitted). Operations are serialized. */
	run(options: RecoveryRunOptions): Promise<RecoveryResult> {
		const ids = options.ownerIds ?? this.ownerIds;
		const owners: RecoveryOwner[] = [];
		for (const id of ids) {
			const owner = this.owners.get(id);
			if (!owner) return Promise.reject(new RecoveryError('PATH_NOT_OWNED', `unknown-owner:${id}`));
			owners.push(owner);
		}
		const operation = this.running
			.catch(() => undefined)
			.then(() =>
				runRecoveryTransaction({
					...options,
					storage: this.storage,
					owners: [...owners, ...(options.extraOwners ?? [])],
					gate: this.gate,
				}),
			);
		this.running = operation;
		return operation;
	}
}

/** Vault text storage that can also remove; mobile and virtual vaults use the same adapter calls. */
export function recoveryStorage(app: App): RecoveryStorage {
	const base = privateVaultStorage(app);
	const adapter = app.vault.adapter;
	return {
		exists: (path) => base.exists(path),
		read: (path) => base.read(path),
		write: (path, content) => base.write(path, content),
		mkdir: (path) => base.mkdir(path),
		remove: async (path) => {
			// Reading through the private storage applies its symlink/escape check; only a plain vault file is removed.
			await base.read(path);
			await adapter.remove(path);
		},
		list: async (directory) => {
			if (!isSafeRelativePath(directory)) throw new RecoveryError('PATH_INVALID', directory, { path: directory });
			if (!(await adapter.exists(directory))) return { files: [], folders: [] };
			const listed = await adapter.list(directory);
			return { files: listed.files, folders: listed.folders };
		},
	};
}
export function createRecoveryHost(app: App): RecoveryHost {
	return new RecoveryHost(recoveryStorage(app));
}

/**
 * Settings as a recovery owner for the given namespaces (for example `['agent']`): holds every settings write,
 * drains strictly, and after the files were replaced rebuilds the persisted baseline and only those namespaces.
 */
export function settingsOwner(store: SettingsStore, device: string, namespaces: readonly string[]): RecoveryOwner {
	const files = new Set([SETTINGS_VAULT_FILE, settingsDeviceFile(device)]);
	return {
		id: 'settings',
		owns: (path) => files.has(path),
		validate: (changes) => {
			// Only the listed namespaces are reloaded after a restore, so nothing else may differ in a stage.
			// A `before` that cannot be parsed is already unusable data: the whole file is replaced (the damaged bytes
			// stay as a recovery copy), but the replacement may then carry only the listed namespaces.
			const spaces = (text: string | null) => {
				if (!text) return { value: {} as Record<string, unknown>, damaged: false };
				try {
					const parsed = (JSON.parse(text) as { namespaces?: Record<string, unknown> } | null) ?? {};
					return { value: parsed.namespaces ?? {}, damaged: false };
				} catch {
					return { value: {} as Record<string, unknown>, damaged: true };
				}
			};
			for (const change of changes) {
				const beforeSpaces = spaces(change.before),
					afterSpaces = spaces(change.after);
				if (afterSpaces.damaged) throw new Error('settings-stage-unparseable');
				const before = beforeSpaces.value,
					after = afterSpaces.value;
				if (beforeSpaces.damaged) {
					for (const name of Object.keys(after))
						if (!namespaces.includes(name)) throw new Error(`namespace-not-restorable:${name}`);
					continue;
				}
				for (const name of new Set([...Object.keys(before), ...Object.keys(after)]))
					if (!namespaces.includes(name) && JSON.stringify(before[name]) !== JSON.stringify(after[name]))
						throw new Error(`namespace-not-restorable:${name}`);
			}
		},
		preflight: async () => ({ busy: [] }),
		quiesce: async () => {
			holdSettings(store);
		},
		drain: async () => {
			await drainSettings(store);
		},
		adopt: async () => {
			await reloadSettingsNamespaces(store, namespaces);
		},
		release: async () => {
			resumeSettings(store);
		},
	};
}
