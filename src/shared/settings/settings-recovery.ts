import type { SettingsFile, SettingsStore } from './store';
import type { SettingsScope } from './schema';

/** The private state a restore must rebuild. Kept here, off the eager start-up path, instead of growing the store. */
interface Internals {
	held: boolean;
	raw: Record<SettingsScope, Record<string, Record<string, unknown>>>;
	persisted: Record<SettingsScope, SettingsFile | null>;
	persistence: { load(scope: SettingsScope): Promise<SettingsFile | null> };
	namespaces: Map<
		string,
		{ schema: { normalize(value: unknown): object }; value: object; listeners: Set<() => void> }
	>;
}
const internals = (store: SettingsStore): Internals => store as unknown as Internals;

/** Recovery protocol: every settings change is refused (rejected before memory changes) until `resumeSettings`. */
export function holdSettings(store: SettingsStore): void {
	internals(store).held = true;
}
export function resumeSettings(store: SettingsStore): void {
	internals(store).held = false;
}

/**
 * Strict drain of what was admitted before the hold: writes now and rejects on any failed write (a status of `error`
 * is not success). Mutation admission remains closed throughout the asynchronous flush.
 */
export async function drainSettings(store: SettingsStore): Promise<void> {
	await store.drainPending();
	if (store.status === 'error') throw new Error('Settings write failed');
}

/**
 * Adopt restored files for the given namespaces: re-read both files, replace the persisted baseline (so the next save
 * merges against the restored bytes, not a stale cache) and re-normalize only the named bound namespaces. Other
 * namespaces keep their memory values and are rewritten unchanged. Drain first; this does not write.
 */
export async function reloadSettingsNamespaces(store: SettingsStore, names: readonly string[]): Promise<void> {
	const s = internals(store);
	const files: Partial<Record<SettingsScope, SettingsFile | null>> = {};
	for (const scope of ['vault', 'device'] as const) files[scope] = await s.persistence.load(scope);
	const notifications: Array<() => void> = [];
	for (const scope of ['vault', 'device'] as const) {
		const file = files[scope];
		s.persisted[scope] = structuredClone(file ?? null);
		const restored = file && file.version === 1 && file.namespaces ? file.namespaces : {};
		for (const name of names) {
			if (name in restored) s.raw[scope][name] = structuredClone(restored[name]!);
			else delete s.raw[scope][name];
		}
	}
	for (const name of names) {
		const namespace = s.namespaces.get(name);
		if (!namespace) continue;
		const has = name in s.raw.vault || name in s.raw.device;
		const next = namespace.schema.normalize(
			has ? { ...(s.raw.vault[name] ?? {}), ...(s.raw.device[name] ?? {}) } : undefined,
		);
		if (JSON.stringify(namespace.value) === JSON.stringify(next)) continue;
		namespace.value = next;
		notifications.push(...namespace.listeners);
	}
	for (const listener of notifications) listener();
}
