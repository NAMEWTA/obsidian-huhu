import { sha256 } from '../../../../shared/storage/recovery-transaction';

/**
 * HUHU business package, version 1 (T-16). One JSON document: a manifest that names every collection and every
 * deliberate omission, plus the exact text of each file. The package carries no file paths: restore derives every
 * target path from the section kind, the device and the content itself (contracts section 6).
 */
export const BACKUP_FORMAT = 'huhu-business-backup';
export const BACKUP_VERSION = 1;
/** Characters, not bytes: a hard cap so a hostile file cannot exhaust memory before it is rejected. */
export const MAX_PACKAGE_CHARS = 96 * 1024 * 1024;
export const MAX_ENTRIES = 2000;
export const MAX_ENTRY_CHARS = 48 * 1024 * 1024;

export const SECTION_KINDS = [
	'settings-agent',
	'workbench-records',
	'history-annotations',
	'workspace-stats',
	'automation-sessions',
	'automation-runtime',
	'notifications-inbox',
	'automation-definition',
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];
/** Sections stored per device. Definition documents are shared by every device of the vault. */
export const DEVICE_SECTIONS: readonly SectionKind[] = SECTION_KINDS.filter((kind) => kind !== 'automation-definition');

/** What a package deliberately never contains. Shown to the user from the real manifest, never inferred. */
export const EXCLUSION_CATEGORIES = [
	'native-transcripts',
	'account-credentials',
	'env-values',
	'launch-arguments',
	'caches',
	'endpoints-locks',
	'browser-data',
	'helper-binaries',
	'yolo-acknowledgement',
	'machine-paths',
	'directory-grants',
	'legacy-stats',
	'sources-notes',
] as const;
export type ExclusionCategory = (typeof EXCLUSION_CATEGORIES)[number];

export interface ManifestEntry {
	readonly id: string;
	readonly section: SectionKind;
	/** Source device id; null for the shared definition documents. */
	readonly device: string | null;
	readonly sha256: string;
	readonly bytes: number;
	/** Items inside the entry (Spaces, runs, notifications ...), for the readable manifest. */
	readonly count?: number;
	/** Whether a live owner or the offline reader produced the entry. */
	readonly via: 'live' | 'offline';
}
export const NOTE_CODES: readonly ManifestNote['code'][] = [
	'definition-extra-files',
	'other-devices-not-enumerated',
	'section-absent',
	'settings-fields-omitted',
];
export interface ManifestNote {
	readonly code:
		'definition-extra-files' | 'other-devices-not-enumerated' | 'section-absent' | 'settings-fields-omitted';
	readonly section?: SectionKind;
	readonly device?: string | null;
	readonly count?: number;
}
export interface BackupManifest {
	readonly entries: readonly ManifestEntry[];
	readonly exclusions: readonly ExclusionCategory[];
	readonly notes: readonly ManifestNote[];
}
export interface BackupSource {
	readonly vaultName: string;
	/** The device that produced the package; the target keeps its own identity (provenance only). */
	readonly device: string;
	readonly devices: readonly string[];
}
export interface BackupPackage {
	readonly format: typeof BACKUP_FORMAT;
	readonly version: typeof BACKUP_VERSION;
	readonly createdAt: number;
	readonly source: BackupSource;
	readonly manifest: BackupManifest;
	readonly payload: Readonly<Record<string, string>>;
	/** sha256 over the canonical header (see `headerText`); every payload entry carries its own digest. */
	readonly digest: string;
}

export type PackageErrorCode =
	| 'not-json'
	| 'too-large'
	| 'wrong-format'
	| 'unsupported-version'
	| 'invalid-structure'
	| 'duplicate-identity'
	| 'entry-digest-mismatch'
	| 'digest-mismatch';
export class BackupPackageError extends Error {
	constructor(
		readonly code: PackageErrorCode,
		readonly detail: Readonly<Record<string, unknown>> = {},
	) {
		super(code);
		this.name = 'BackupPackageError';
	}
}

export const DEVICE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const ENTRY_ID = /^e[0-9]{1,5}$/;
const HEX = /^[0-9a-f]{64}$/;

const utf8 = new TextEncoder();
export const byteLength = (text: string): number => utf8.encode(text).length;

/** The exact bytes the package digest covers. Order is the manifest order, so it is stable across parse/serialize. */
function headerText(pkg: Omit<BackupPackage, 'digest'>): string {
	return [
		pkg.format,
		String(pkg.version),
		String(pkg.createdAt),
		pkg.source.vaultName,
		pkg.source.device,
		pkg.source.devices.join(','),
		...pkg.manifest.entries.map(
			(e) => `${e.id}|${e.section}|${e.device ?? ''}|${e.sha256}|${e.bytes}|${e.count ?? ''}|${e.via}`,
		),
		`x:${pkg.manifest.exclusions.join(',')}`,
		...pkg.manifest.notes.map((n) => `n:${n.code}|${n.section ?? ''}|${n.device ?? ''}|${n.count ?? ''}`),
	].join('\n');
}

export interface PackageInput {
	readonly createdAt: number;
	readonly source: BackupSource;
	readonly notes: readonly ManifestNote[];
	readonly exclusions: readonly ExclusionCategory[];
	readonly entries: ReadonlyArray<{
		readonly section: SectionKind;
		readonly device: string | null;
		readonly text: string;
		readonly count?: number;
		readonly via: 'live' | 'offline';
	}>;
}

export async function buildPackage(input: PackageInput): Promise<BackupPackage> {
	const entries: ManifestEntry[] = [];
	const payload: Record<string, string> = {};
	for (const [index, item] of input.entries.entries()) {
		const id = `e${index}`;
		entries.push({
			id,
			section: item.section,
			device: item.device,
			sha256: await sha256(item.text),
			bytes: byteLength(item.text),
			...(item.count === undefined ? {} : { count: item.count }),
			via: item.via,
		});
		payload[id] = item.text;
	}
	const base = {
		format: BACKUP_FORMAT,
		version: BACKUP_VERSION,
		createdAt: input.createdAt,
		source: input.source,
		manifest: { entries, exclusions: input.exclusions, notes: input.notes },
		payload,
	} as const;
	return { ...base, digest: await sha256(headerText(base)) };
}

export function serializePackage(pkg: BackupPackage): string {
	return JSON.stringify(pkg, null, 1);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const invalid = (field: string): never => {
	throw new BackupPackageError('invalid-structure', { field });
};

/**
 * Strict parse + verification. Nothing is trusted: version, structure, section whitelist, device id syntax,
 * duplicate identities, per-entry digests and the package digest are all checked before a caller may read a payload.
 */
export async function parsePackage(text: string): Promise<BackupPackage> {
	if (typeof text !== 'string' || text.length > MAX_PACKAGE_CHARS) throw new BackupPackageError('too-large');
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		throw new BackupPackageError('not-json');
	}
	if (!isObject(raw) || raw.format !== BACKUP_FORMAT) throw new BackupPackageError('wrong-format');
	if (raw.version !== BACKUP_VERSION)
		throw new BackupPackageError('unsupported-version', { version: String(raw.version) });
	if (typeof raw.createdAt !== 'number' || !Number.isFinite(raw.createdAt)) invalid('createdAt');
	const source = raw.source;
	if (
		!isObject(source) ||
		typeof source.vaultName !== 'string' ||
		source.vaultName.length > 512 ||
		typeof source.device !== 'string' ||
		!DEVICE_ID.test(source.device) ||
		!Array.isArray(source.devices) ||
		source.devices.length > 256 ||
		!source.devices.every((d) => typeof d === 'string' && DEVICE_ID.test(d))
	)
		invalid('source');
	const manifest = raw.manifest;
	if (!isObject(manifest) || !Array.isArray(manifest.entries) || manifest.entries.length > MAX_ENTRIES)
		invalid('manifest');
	const rawManifest = manifest as Record<string, unknown>;
	if (
		!Array.isArray(rawManifest.exclusions) ||
		!rawManifest.exclusions.every((c) => (EXCLUSION_CATEGORIES as readonly unknown[]).includes(c))
	)
		invalid('exclusions');
	if (!Array.isArray(rawManifest.notes) || rawManifest.notes.length > 4096) invalid('notes');
	const payload = raw.payload;
	if (!isObject(payload)) invalid('payload');
	const rawPayload = payload as Record<string, unknown>;
	const entries: ManifestEntry[] = [];
	const seen = new Set<string>();
	for (const item of rawManifest.entries as unknown[]) {
		if (!isObject(item) || typeof item.id !== 'string' || !ENTRY_ID.test(item.id)) return invalid('entry.id');
		const section = item.section;
		if (!(SECTION_KINDS as readonly unknown[]).includes(section)) invalid('entry.section');
		const device = item.device;
		const shared = section === 'automation-definition';
		if (shared ? device !== null : typeof device !== 'string' || !DEVICE_ID.test(device)) invalid('entry.device');
		if (typeof item.sha256 !== 'string' || !HEX.test(item.sha256)) invalid('entry.sha256');
		if (typeof item.bytes !== 'number' || !Number.isSafeInteger(item.bytes) || item.bytes < 0)
			invalid('entry.bytes');
		if (
			item.count !== undefined &&
			(typeof item.count !== 'number' || !Number.isSafeInteger(item.count) || item.count < 0)
		)
			invalid('entry.count');
		if (item.via !== 'live' && item.via !== 'offline') invalid('entry.via');
		const body = rawPayload[item.id];
		if (typeof body !== 'string' || body.length > MAX_ENTRY_CHARS) invalid('payload.entry');
		if (seen.has(item.id)) throw new BackupPackageError('duplicate-identity', { id: item.id });
		seen.add(item.id);
		entries.push(item as unknown as ManifestEntry);
	}
	// A payload without a manifest line would be unlisted data: refuse it.
	for (const key of Object.keys(rawPayload)) if (!seen.has(key)) invalid('payload.unlisted');
	const identities = new Set<string>();
	for (const entry of entries) {
		// One file per (section, device). Definition documents are told apart by their own content (checked by restore).
		if (entry.section === 'automation-definition') continue;
		const key = `${entry.section}@${entry.device}`;
		if (identities.has(key)) throw new BackupPackageError('duplicate-identity', { identity: key });
		identities.add(key);
	}
	const sourceValue = source as BackupSource;
	const devices = [...new Set(sourceValue.devices)];
	const notes = (rawManifest.notes as unknown[]).map((note): ManifestNote => {
		if (!isObject(note) || !NOTE_CODES.includes(note.code as ManifestNote['code'])) return invalid('note');
		return note as unknown as ManifestNote;
	});
	const base = {
		format: BACKUP_FORMAT,
		version: BACKUP_VERSION,
		createdAt: raw.createdAt as number,
		source: { vaultName: sourceValue.vaultName, device: sourceValue.device, devices },
		manifest: { entries, exclusions: rawManifest.exclusions as ExclusionCategory[], notes },
		payload: rawPayload as Record<string, string>,
	} as const;
	for (const entry of entries) {
		const body = base.payload[entry.id]!;
		if (byteLength(body) !== entry.bytes || (await sha256(body)) !== entry.sha256)
			throw new BackupPackageError('entry-digest-mismatch', { id: entry.id, section: entry.section });
	}
	if (typeof raw.digest !== 'string' || (await sha256(headerText(base))) !== raw.digest)
		throw new BackupPackageError('digest-mismatch');
	return { ...base, digest: raw.digest };
}
