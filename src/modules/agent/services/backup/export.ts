import { ensureDirectory } from '../../../../shared/storage/durable-state';
import type { RecoveryAccess, RecoveryRunOptions, RecoveryStorage } from '../../../../shared/storage/recovery-contracts';
import { AUTOMATION_DEFINITIONS_ROOT } from '../../../../shared/storage/vault-layout';
import {
	DEVICE_ID,
	DEVICE_SECTIONS,
	EXCLUSION_CATEGORIES,
	buildPackage,
	serializePackage,
	type BackupPackage,
	type ManifestNote,
	type PackageInput,
	type SectionKind,
} from '../../core/backup/format';
import { BackupError } from '../../core/backup/model';
import {
	DEVICE_DIRECTORIES,
	DEVICE_SETTINGS_DIRECTORY,
	EXPORT_DIRECTORY,
	OWNER,
	SECTION_OWNER,
	sectionPath,
} from '../../core/backup/paths';
import { portableAgentSettings } from '../../core/backup/settings-codec';
import {
	InvalidSection,
	restoreDefinitionDocument,
	validateHistory,
	validateRegistry,
	validateStats,
} from '../../core/backup/transforms';
import { isWorkbenchRecords } from '../spaces/records';
import { toBackupError } from './owners';

export interface BackupEnv extends Pick<RecoveryRunOptions, 'signal' | 'preCommitTimeoutMs'> {
	readonly recovery: RecoveryAccess;
	readonly storage: RecoveryStorage;
	/** This device. */
	readonly device: string;
	readonly vaultName: string;
	readonly now?: () => number;
}
export interface ExportResult {
	readonly pkg: BackupPackage;
	readonly text: string;
}

const base = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/** Every device id that has stored HUHU data, plus this one. Needs a listing capability; otherwise only this device. */
async function discoverDevices(
	storage: Pick<RecoveryStorage, 'list'>,
	current: string,
): Promise<{ devices: string[]; enumerated: boolean }> {
	const found = new Set<string>([current]);
	if (!storage.list) return { devices: [current], enumerated: false };
	for (const directory of DEVICE_DIRECTORIES)
		for (const folder of (await storage.list(directory)).folders) {
			const name = base(folder);
			if (name !== 'definitions' && DEVICE_ID.test(name)) found.add(name);
		}
	for (const file of (await storage.list(DEVICE_SETTINGS_DIRECTORY)).files) {
		const name = base(file);
		const device = /^(.*)\.json(?:\.backup)?$/.exec(name)?.[1];
		if (device && DEVICE_ID.test(device)) found.add(device);
	}
	return { devices: [...found].sort(), enumerated: true };
}

interface Collected {
	readonly section: SectionKind;
	readonly device: string | null;
	readonly path: string;
	readonly raw: string;
	readonly payload: string;
	readonly count?: number;
	readonly via: 'live' | 'offline';
}

function jsonOf(text: string, section: SectionKind, device: string | null): unknown {
	try {
		return JSON.parse(text);
	} catch {
		throw new BackupError('source-invalid', { section, device, reason: 'not-json' });
	}
}
function entryFor(
	section: Exclude<SectionKind, 'automation-definition'>,
	device: string,
	path: string,
	raw: string,
	via: Collected['via'],
): Collected | undefined {
	const invalid = (reason: string): never => {
		throw new BackupError('source-invalid', { section, device, reason });
	};
	try {
		switch (section) {
			case 'settings-agent': {
				const file = jsonOf(raw, section, device) as { namespaces?: Record<string, unknown> } | null;
				const agent = file && typeof file === 'object' ? file.namespaces?.agent : undefined;
				// A settings file without an agent namespace simply has nothing of this module to carry.
				if (agent === undefined) return undefined;
				return {
					section,
					device,
					path,
					raw,
					payload: JSON.stringify({ agent: portableAgentSettings(agent) }),
					via,
				};
			}
			case 'workbench-records': {
				const records = jsonOf(raw, section, device);
				if (!isWorkbenchRecords(records)) return invalid('records-invalid');
				return { section, device, path, raw, payload: raw, count: Object.keys(records.spaces).length, via };
			}
			case 'history-annotations':
				return { section, device, path, raw, payload: raw, count: validateHistory(raw).count, via };
			case 'workspace-stats':
				return { section, device, path, raw, payload: raw, count: validateStats(raw).count, via };
			case 'automation-sessions':
				return { section, device, path, raw, payload: raw, count: validateRegistry(raw).count, via };
			case 'automation-runtime': {
				const state = jsonOf(raw, section, device) as {
					runs?: unknown;
					definitions?: unknown;
					cursors?: unknown;
				} | null;
				if (!state || !Array.isArray(state.runs) || !Array.isArray(state.definitions) || !state.cursors)
					return invalid('runtime-shape');
				return { section, device, path, raw, payload: raw, count: state.runs.length, via };
			}
			case 'notifications-inbox': {
				const state = jsonOf(raw, section, device) as { records?: unknown; receipts?: unknown } | null;
				if (!state || !Array.isArray(state.records) || !state.receipts || typeof state.receipts !== 'object')
					return invalid('inbox-shape');
				return { section, device, path, raw, payload: raw, count: state.records.length, via };
			}
		}
	} catch (error) {
		if (error instanceof InvalidSection)
			throw new BackupError('source-invalid', { section, device, reason: error.reason });
		throw error;
	}
}

/**
 * One consistent export: all registered owners are closed and drained (or the operation is refused as busy), then every
 * collection is read once and read again; a file that changed in between aborts the export. Nothing is written, nothing
 * is started. A collection that exists but cannot be read as valid data fails the export: it is never replaced by an
 * empty array, and the package never claims to be complete when it is not.
 */
export async function exportBackup(env: BackupEnv): Promise<ExportResult> {
	let built: BackupPackage | undefined;
	try {
		await env.recovery.run({
			operation: 'backup-export',
			signal: env.signal,
			preCommitTimeoutMs: env.preCommitTimeoutMs,
			stage: async (readCurrent) => {
				const observed = new Map<string, string | null>();
				const read = async (path: string) => {
					const raw = await readCurrent(path);
					if (observed.has(path) && observed.get(path) !== raw) throw new BackupError('source-drift', { path });
					observed.set(path, raw);
					return raw;
				};
				const listings = new Map<string, string>();
				const listingKey = (listing: { readonly files: readonly string[]; readonly folders: readonly string[] }) =>
					JSON.stringify([[...listing.files].sort(), [...listing.folders].sort()]);
				const list = env.storage.list ? async (path: string) => {
					const listing = await env.storage.list!(path);
					const key = listingKey(listing);
					if (listings.has(path) && listings.get(path) !== key) throw new BackupError('source-drift', { path });
					listings.set(path, key);
					return listing;
				} : undefined;
				const { devices, enumerated } = await discoverDevices({ list }, env.device);
				const notes: ManifestNote[] = enumerated ? [] : [{ code: 'other-devices-not-enumerated' }];
				const collected: Collected[] = [];
				for (const device of devices) {
					for (const section of DEVICE_SECTIONS as readonly Exclude<SectionKind, 'automation-definition'>[]) {
						let path = sectionPath(section, device);
						let raw = await read(path);
						if (raw === null) {
							path += '.backup';
							raw = await read(path);
						}
						if (raw === null) {
							if (device === env.device) notes.push({ code: 'section-absent', section, device });
							continue;
						}
						const via =
							device === env.device && env.recovery.has(SECTION_OWNER[section]) ? 'live' : 'offline';
						const item = entryFor(section, device, path, raw, via);
						if (item) collected.push(item);
						else if (device === env.device) notes.push({ code: 'section-absent', section, device });
					}
				}
				const definitions = await collectDefinitions(env, list, read, notes);
				collected.push(...definitions);
				// Missing paths and directory membership are part of the snapshot too: a second read of only
				// existing files would miss a collection created by another process during the export.
				for (const [path, raw] of observed)
					if ((await readCurrent(path)) !== raw) throw new BackupError('source-drift', { path });
				for (const [path, key] of listings)
					if (listingKey(await env.storage.list!(path)) !== key) throw new BackupError('source-drift', { path });
				const input: PackageInput = {
					createdAt: (env.now ?? Date.now)(),
					source: { vaultName: env.vaultName, device: env.device, devices },
					notes,
					exclusions: EXCLUSION_CATEGORIES,
					entries: collected.map((item) => ({
						section: item.section,
						device: item.device,
						text: item.payload,
						...(item.count === undefined ? {} : { count: item.count }),
						via: item.via,
					})),
				};
				built = await buildPackage(input);
				return { writes: [] };
			},
		});
	} catch (error) {
		throw toBackupError(error);
	}
	if (!built) throw new BackupError('unexpected');
	return { pkg: built, text: serializePackage(built) };
}

async function collectDefinitions(
	env: Pick<BackupEnv, 'device' | 'recovery'>,
	list: RecoveryStorage['list'],
	read: (path: string) => Promise<string | null>,
	notes: ManifestNote[],
): Promise<Collected[]> {
	if (!list) throw new BackupError('source-unavailable', { section: 'automation-definition' });
	const out: Collected[] = [];
	let extra = 0;
	const via = env.recovery.has(OWNER.definitions) ? 'live' : 'offline';
	const listing = await list(AUTOMATION_DEFINITIONS_ROOT);
	for (const folder of [...listing.folders].sort()) {
		const files = (await list(folder)).files;
		const path = `${folder}/操作.md`;
		extra += files.filter((file) => file !== path).length;
		if (!files.includes(path)) continue;
		const raw = await read(path);
		if (raw === null) throw new BackupError('source-drift', { path });
		try {
			restoreDefinitionDocument(raw, { fromDevice: env.device, toDevice: env.device });
		} catch (error) {
			throw new BackupError('source-invalid', {
				section: 'automation-definition',
				device: null,
				reason: error instanceof InvalidSection ? error.reason : 'unreadable',
			});
		}
		out.push({ section: 'automation-definition', device: null, path, raw, payload: raw, via });
	}
	if (extra) notes.push({ code: 'definition-extra-files', count: extra });
	return out;
}

/** Writes the package into the vault (outside every recovery transaction) and returns where. Verified by reading back. */
export async function saveExport(storage: RecoveryStorage, text: string, now: number = Date.now()): Promise<string> {
	const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
	await ensureDirectory(storage, EXPORT_DIRECTORY);
	let path = `${EXPORT_DIRECTORY}/huhu-backup-${stamp}.json`;
	for (let n = 2; await storage.exists(path); n++) path = `${EXPORT_DIRECTORY}/huhu-backup-${stamp}-${n}.json`;
	try {
		await storage.write(path, text);
		if ((await storage.read(path)) !== text) throw new Error('verification mismatch');
	} catch (cause) {
		throw new BackupError('write-failed', { path }, { cause });
	}
	return path;
}
