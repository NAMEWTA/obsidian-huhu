import type { VaultBinding } from '../../core/space/model';
import type { DirectoryPort } from '../../core/space/ports';
import type { BackupPackage, ManifestEntry, SectionKind } from '../../core/backup/format';
import type { ImportOptions, Problem, SectionOutcome, Warning } from '../../core/backup/model';
import { sectionPath } from '../../core/backup/paths';
import { mergePortableAgentSettings } from '../../core/backup/settings-codec';
import {
	InvalidSection,
	definitionIdOf,
	isEmptyDocument,
	restoreAutomationRuntime,
	restoreDefinitionDocument,
	restoreNotificationInbox,
	validateHistory,
	validateRegistry,
	validateStats,
} from '../../core/backup/transforms';
import { normalizeTerminalSettings } from '../../core/terminal/settings';
import { isWorkbenchRecords } from '../spaces/records';
import { rebaseRecords } from './records';

/** One file the import would write. `group` decides which recovery transaction carries it. */
export interface PlannedWrite {
	readonly path: string;
	readonly content: string;
	readonly section: SectionKind;
	/** Owner that must be quiet while it is replaced; `archive` for another device's files (no live writer here). */
	readonly role: 'adopt' | 'archive' | 'shared';
	/** A `<file>.backup` sidecar of a shared-store file: replaced together with it, owned by no live writer. */
	readonly sidecar?: boolean;
	readonly group: string;
	/** The file already holds exactly this content. */
	readonly unchanged: boolean;
}

export interface PlanContext {
	readonly targetDevice: string;
	/** Desktop only: the vault this machine's Spaces belong to, and a read-only directory lookup. */
	readonly target?: VaultBinding;
	readonly directories?: Pick<DirectoryPort, 'bindVaultDirectory'>;
	/** Exact current bytes (null when missing); rejects when unreadable. */
	readonly read: (path: string) => Promise<string | null>;
	/** Vault-relative folders directly under the definitions root. */
	readonly listDefinitionFolders: () => Promise<readonly string[]>;
	/**
	 * Paths this plan must not look at: the ones a finished step already wrote (resume) or that belong to another step
	 * (a step's locked re-plan checks only its own paths). They stay in the plan as unchanged placeholders so the step
	 * layout never depends on what is on disk.
	 */
	readonly skip?: (path: string) => boolean;
	/** The real automations repository codec: a reason when the document would not decode, otherwise undefined. */
	readonly validateDefinition?: (path: string, text: string) => Promise<string | undefined>;
}

export interface ImportPlan {
	readonly adoptDevice?: string;
	readonly writes: readonly PlannedWrite[];
	readonly problems: readonly Problem[];
	readonly warnings: readonly Warning[];
	readonly outcomes: readonly SectionOutcome[];
	/** Ordered transaction keys; each is a bounded set of writes. */
	readonly batches: readonly string[];
	readonly disabledAutomations: ReadonlyArray<{ readonly id: string; readonly name: string }>;
	readonly reauthorize: ReadonlyArray<{ readonly spaceId: string; readonly name: string; readonly path: string }>;
}

/** The journal caps a transaction at 64 paths; stay well below it so copies and growth never reach it. */
export const BATCH_LIMIT = 48;
const HISTORY_KINDS = {
	'history-annotations': 'history',
	'workspace-stats': 'stats',
	'automation-sessions': 'registry',
	'automation-runtime': 'runtime',
	'notifications-inbox': 'inbox',
	'workbench-records': 'records',
} as const;

const jsonValue = (text: string): unknown => {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
};
const jsonObject = (text: string): Record<string, unknown> | undefined => {
	try {
		const value: unknown = JSON.parse(text);
		return value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
};

/**
 * Pure of side effects: reads current bytes through `context.read` and returns what an import would do. Called once
 * for the preflight shown to the user and again, under the recovery lock, inside every transaction, so a file that
 * changed in between is a refusal and never an overwrite.
 */
export async function planImport(
	pkg: BackupPackage,
	options: ImportOptions,
	context: PlanContext,
): Promise<ImportPlan> {
	const problems: Problem[] = [];
	const warnings: Warning[] = [];
	const outcomes: SectionOutcome[] = [];
	const writes: PlannedWrite[] = [];
	const disabledAutomations: Array<{ id: string; name: string }> = [];
	const reauthorize: Array<{ spaceId: string; name: string; path: string }> = [];
	const skip = new Set(options.skipSections ?? []);
	const devices = pkg.source.devices;

	const adopt = options.adoptDevice ?? (devices.includes(context.targetDevice) ? context.targetDevice : undefined);
	if (adopt === undefined) problems.push({ code: 'adopt-device-required' });
	else if (!devices.includes(adopt)) problems.push({ code: 'adopt-device-unknown', device: adopt });
	const archives = new Set((options.includeDevices ?? []).filter((device) => device !== adopt));
	for (const device of archives) {
		if (!devices.includes(device)) problems.push({ code: 'adopt-device-unknown', device });
		// An archive lands on its own device id; this device's id is taken by the adopted data.
		else if (device === context.targetDevice) problems.push({ code: 'device-collision', device });
	}
	const validAdopt = adopt !== undefined && devices.includes(adopt) ? adopt : undefined;

	const groupOf = (role: PlannedWrite['role'], entry: ManifestEntry) =>
		role === 'adopt' ? 'core:adopt' : `core:dev:${entry.device}`;
	/** `<file>.backup` follows its primary. Records own theirs; every other shared-store file gets an inert sidecar. */
	const pushBackup = async (entry: ManifestEntry, path: string, content: string, role: PlannedWrite['role']) => {
		let current: string | null = null;
		if (!context.skip?.(path))
			try {
				current = await context.read(`${path}.backup`);
			} catch {
				current = null;
			}
		writes.push({
			path: `${path}.backup`,
			content,
			section: entry.section,
			role,
			sidecar: entry.section !== 'workbench-records',
			group: groupOf(role, entry),
			unchanged: !!context.skip?.(path) || current === content,
		});
	};
	const decide = async (
		entry: ManifestEntry,
		path: string,
		content: string,
		role: PlannedWrite['role'],
		count: number | undefined,
	): Promise<void> => {
		const kind = HISTORY_KINDS[entry.section as keyof typeof HISTORY_KINDS];
		const outcome = (action: SectionOutcome['action'], unchanged: boolean) => {
			outcomes.push({
				section: entry.section,
				device: role === 'adopt' ? context.targetDevice : entry.device,
				path,
				action,
				...(count === undefined ? {} : { count }),
			});
			writes.push({ path, content, section: entry.section, role, group: groupOf(role, entry), unchanged });
		};
		if (context.skip?.(path)) {
			outcome('unchanged', true);
			if (kind) await pushBackup(entry, path, content, role);
			return;
		}
		let primary: string | null;
		let backup: string | null = null;
		try {
			primary = await context.read(path);
			// The shared store loads `<file>.backup` when the primary is missing, so that is the data the file holds.
			if (primary === null && kind) backup = await context.read(`${path}.backup`);
		} catch {
			problems.push({ code: 'target-unreadable', section: entry.section, device: entry.device, subject: path });
			return;
		}
		let action: SectionOutcome['action'];
		if (primary !== null) {
			if (primary === content) action = 'unchanged';
			else if (kind && isEmptyDocument(kind, primary)) action = 'replace-empty';
			else {
				problems.push({
					code: 'identity-collision',
					section: entry.section,
					device: entry.device,
					subject: path,
				});
				return;
			}
		} else if (backup === null || backup === content || (kind && isEmptyDocument(kind, backup)))
			action = role === 'archive' ? 'archive' : 'create';
		else {
			problems.push({ code: 'identity-collision', section: entry.section, device: entry.device, subject: path });
			return;
		}
		outcome(action, primary === content);
		if (kind) await pushBackup(entry, path, content, role);
	};

	const invalid = (entry: ManifestEntry, error: unknown): void => {
		if (error instanceof InvalidSection)
			problems.push({
				code: 'section-invalid',
				section: entry.section,
				device: entry.device,
				subject: error.reason,
			});
		else throw error;
	};

	for (const entry of pkg.manifest.entries) {
		if (skip.has(entry.section)) continue;
		const text = pkg.payload[entry.id]!;
		if (entry.section === 'automation-definition') continue;
		const device = entry.device!;
		const role: PlannedWrite['role'] | undefined =
			device === validAdopt
				? 'adopt'
				: archives.has(device) && device !== context.targetDevice
					? 'archive'
					: undefined;
		if (!role) continue;
		const owner = role === 'adopt' ? context.targetDevice : device;
		try {
			switch (entry.section) {
				case 'settings-agent': {
					if (role === 'archive') {
						warnings.push({ code: 'other-device-settings-skipped', subject: device });
						break;
					}
					const path = sectionPath('settings-agent', owner);
					if (context.skip?.(path)) {
						outcomes.push({ section: entry.section, device: owner, path, action: 'unchanged' });
						writes.push({
							path,
							content: '',
							section: entry.section,
							role,
							group: 'core:adopt',
							unchanged: true,
						});
						break;
					}
					let current: string | null;
					try {
						current = await context.read(path);
					} catch {
						problems.push({ code: 'target-unreadable', section: entry.section, device, subject: path });
						break;
					}
					const incoming = jsonObject(text)?.agent;
					if (!incoming || typeof incoming !== 'object') throw new InvalidSection('settings:shape');
					const parsed = current === null ? undefined : jsonObject(current);
					const namespaces =
						parsed && parsed.version === 1 && parsed.namespaces && typeof parsed.namespaces === 'object'
							? (parsed.namespaces as Record<string, Record<string, unknown>>)
							: undefined;
					if (current !== null && !namespaces)
						warnings.push({ code: 'settings-damaged-replaced', subject: path });
					const merged = mergePortableAgentSettings(namespaces?.agent, incoming);
					if (merged.permissionRaisesSkipped)
						warnings.push({ code: 'permission-raise-skipped', count: merged.permissionRaisesSkipped });
					const agent = normalizeTerminalSettings(merged.agent) as unknown as Record<string, unknown>;
					const file = {
						...(namespaces ? parsed : { version: 1 }),
						version: 1,
						namespaces: { ...(namespaces ?? {}), agent },
					};
					const content = JSON.stringify(file);
					const action = current === content ? 'unchanged' : current === null ? 'create' : 'merge';
					outcomes.push({ section: entry.section, device: owner, path, action });
					writes.push({
						path,
						content,
						section: entry.section,
						role,
						group: 'core:adopt',
						unchanged: action === 'unchanged',
					});
					break;
				}
				case 'workbench-records': {
					if (!context.target) {
						problems.push({ code: 'records-needs-desktop', section: entry.section, device });
						break;
					}
					const path = sectionPath('workbench-records', owner);
					if (role === 'archive') {
						// Another device's records keep their own binding; they are validated, not rebased.
						const parsed = jsonValue(text);
						if (!isWorkbenchRecords(parsed)) throw new InvalidSection('records:invalid');
						await decide(entry, path, text, role, Object.keys(parsed.spaces).length);
						break;
					}
					if (context.skip?.(path)) {
						await decide(entry, path, '', role, undefined);
						break;
					}
					const rebased = await rebaseRecords(text, {
						target: context.target,
						directories: context.directories,
						archiveMissing: options.archiveMissingDirectories === true,
						at: pkg.createdAt,
					});
					for (const space of rebased.missing) {
						if (options.archiveMissingDirectories)
							warnings.push({ code: 'space-archived-missing-directory', subject: space.name });
						else
							problems.push({
								code: 'directory-missing',
								section: entry.section,
								device,
								subject: `${space.name}: ${space.path}`,
							});
					}
					for (const space of rebased.reauthorize) {
						reauthorize.push(space);
						warnings.push({ code: 'directory-reauthorize', subject: space.name });
					}
					await decide(entry, path, rebased.text, role, rebased.spaces);
					break;
				}
				case 'history-annotations':
				case 'workspace-stats':
				case 'automation-sessions': {
					const checked =
						entry.section === 'history-annotations'
							? validateHistory(text)
							: entry.section === 'workspace-stats'
								? validateStats(text)
								: validateRegistry(text);
					await decide(entry, sectionPath(entry.section, owner), text, role, checked.count);
					break;
				}
				case 'automation-runtime': {
					const restored = restoreAutomationRuntime(text, {
						fromDevice: device,
						toDevice: owner,
						at: pkg.createdAt,
					});
					if (restored.demoted) warnings.push({ code: 'runs-demoted', count: restored.demoted });
					await decide(entry, sectionPath(entry.section, owner), restored.text, role, restored.runs);
					break;
				}
				case 'notifications-inbox': {
					const restored = restoreNotificationInbox(text);
					await decide(entry, sectionPath(entry.section, owner), restored.text, role, restored.records);
					break;
				}
			}
		} catch (error) {
			invalid(entry, error);
		}
	}

	// Shared automation definition documents: the repository's own Markdown files, disabled on arrival.
	const definitionEntries = pkg.manifest.entries.filter((e) => e.section === 'automation-definition');
	if (definitionEntries.length && !skip.has('automation-definition')) {
		const existing = new Map<string, { path: string; text: string }>();
		let readable = true;
		try {
			for (const folder of await context.listDefinitionFolders()) {
				const path = `${folder}/操作.md`;
				const text = await context.read(path);
				const id = text === null ? undefined : definitionIdOf(text);
				if (text !== null && id) existing.set(id, { path, text });
			}
		} catch {
			readable = false;
			problems.push({ code: 'target-unreadable', section: 'automation-definition', device: null });
		}
		const seen = new Set<string>();
		const restoredDocs: Array<{
			path: string;
			text: string;
			id: string;
			name: string;
			wasEnabled: boolean;
			entry: ManifestEntry;
		}> = [];
		for (const entry of definitionEntries) {
			try {
				const doc = restoreDefinitionDocument(pkg.payload[entry.id]!, {
					fromDevice: validAdopt ?? context.targetDevice,
					toDevice: context.targetDevice,
				});
				if (seen.has(doc.id) || restoredDocs.some((d) => d.path === doc.path))
					throw new InvalidSection('definition:duplicate', { id: doc.id });
				seen.add(doc.id);
				const reason = await context.validateDefinition?.(doc.path, doc.text);
				if (reason) throw new InvalidSection(`definition:${reason}`);
				restoredDocs.push({ ...doc, entry });
			} catch (error) {
				invalid(entry, error);
			}
		}
		restoredDocs.sort((a, b) => a.path.localeCompare(b.path));
		if (readable)
			for (const [index, doc] of restoredDocs.entries()) {
				const found = existing.get(doc.id);
				let current: string | null = null;
				if (context.skip?.(doc.path)) {
					outcomes.push({
						section: 'automation-definition',
						device: null,
						path: doc.path,
						action: 'unchanged',
					});
					writes.push({
						path: doc.path,
						content: doc.text,
						section: 'automation-definition',
						role: 'shared',
						group: `defs:${Math.floor(index / BATCH_LIMIT)}`,
						unchanged: true,
					});
					continue;
				}
				try {
					current = await context.read(doc.path);
				} catch {
					problems.push({
						code: 'target-unreadable',
						section: 'automation-definition',
						device: null,
						subject: doc.path,
					});
					continue;
				}
				let action: SectionOutcome['action'];
				if (found && (found.path !== doc.path || found.text !== doc.text)) {
					problems.push({
						code: 'definition-collision',
						section: 'automation-definition',
						device: null,
						subject: doc.name,
					});
					continue;
				}
				if (current === null) action = 'create';
				else if (current === doc.text) action = 'unchanged';
				else {
					problems.push({
						code: 'definition-collision',
						section: 'automation-definition',
						device: null,
						subject: doc.name,
					});
					continue;
				}
				if (doc.wasEnabled) disabledAutomations.push({ id: doc.id, name: doc.name });
				outcomes.push({ section: 'automation-definition', device: null, path: doc.path, action });
				writes.push({
					path: doc.path,
					content: doc.text,
					section: 'automation-definition',
					role: 'shared',
					group: `defs:${Math.floor(index / BATCH_LIMIT)}`,
					unchanged: action === 'unchanged',
				});
			}
		if (disabledAutomations.length)
			warnings.push({ code: 'automations-disabled', count: disabledAutomations.length });
	}
	if (!writes.length && !problems.length && !outcomes.length) problems.push({ code: 'nothing-selected' });

	return {
		...(validAdopt ? { adoptDevice: validAdopt } : {}),
		writes,
		problems,
		warnings,
		outcomes,
		batches: assignBatches(writes),
		disabledAutomations,
		reauthorize,
	};
}

/**
 * Stable transaction keys: core groups (one per device, so a device's files always travel together) are packed in
 * order up to the batch limit. Definition documents come first, in fixed chunks, and the core data last: the files other
 * parts of HUHU keep writing (records, inbox, runtime) are replaced in the final step, so the least time passes between
 * their replacement and the end of the import. The result depends only on the package and
 * the options, never on what is on disk, so a retry computes the same batches and simply finds finished ones unchanged.
 */
function assignBatches(writes: PlannedWrite[]): string[] {
	const groups = new Map<string, number>();
	for (const write of writes) groups.set(write.group, (groups.get(write.group) ?? 0) + 1);
	const keys: string[] = [];
	const place = new Map<string, string>();
	for (const [group] of [...groups].filter(([g]) => g.startsWith('defs:'))) {
		place.set(group, `defs-${group.slice(5)}`);
		keys.push(`defs-${group.slice(5)}`);
	}
	let load = 0;
	let batch = -1;
	for (const [group, size] of [...groups].filter(([g]) => g.startsWith('core:'))) {
		if (batch < 0 || load + size > BATCH_LIMIT) {
			batch++;
			load = 0;
			keys.push(`core-${batch}`);
		}
		load += size;
		place.set(group, `core-${batch}`);
	}
	for (const [index, write] of writes.entries()) writes[index] = { ...write, group: place.get(write.group)! };
	return keys;
}
