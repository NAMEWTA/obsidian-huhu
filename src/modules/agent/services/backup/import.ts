import { ensureDirectory } from '../../../../shared/storage/durable-state';
import { readOrNull, sha256 } from '../../../../shared/storage/recovery-transaction';
import { checkAutomationDocument } from '../../../automations/api';
import { AUTOMATION_DEFINITIONS_ROOT } from '../../../../shared/storage/vault-layout';
import { BackupPackageError, parsePackage, type BackupPackage } from '../../core/backup/format';
import {
	BackupError,
	type ImportOptions,
	type ImportReport,
	type PackageView,
	type PlanView,
	type Warning,
} from '../../core/backup/model';
import { IMPORT_PROGRESS_PATH, IMPORT_REPORT_PATH } from '../../core/backup/paths';
import type { VaultBinding } from '../../core/space/model';
import type { DirectoryPort } from '../../core/space/ports';
import type { BackupEnv } from './export';
import { offlineOwnersFor, toBackupError } from './owners';
import { planImport, type ImportPlan, type PlanContext } from './plan';

export interface ImportEnv extends BackupEnv {
	/** Desktop with the Space owner available: the vault and device the restored Spaces will belong to. */
	readonly target?: VaultBinding;
	readonly directories?: Pick<DirectoryPort, 'bindVaultDirectory'>;
}
export type ImportOutcome =
	| { readonly status: 'unchanged'; readonly report: ImportReport }
	| { readonly status: 'done'; readonly changed: readonly string[]; readonly report: ImportReport };

export const packageView = (pkg: BackupPackage): PackageView => ({
	createdAt: pkg.createdAt,
	vaultName: pkg.source.vaultName,
	sourceDevice: pkg.source.device,
	devices: pkg.source.devices,
	manifest: pkg.manifest,
	digest: pkg.digest,
});

/** Reads, verifies (version, structure, every digest) and describes a package. Touches no data. */
export async function inspectPackage(text: string): Promise<{ pkg: BackupPackage; view: PackageView }> {
	try {
		const pkg = await parsePackage(text);
		return { pkg, view: packageView(pkg) };
	} catch (error) {
		if (error instanceof BackupPackageError)
			throw new BackupError('package-invalid', { packageCode: error.code, ...error.detail });
		throw error;
	}
}

function contextFor(
	env: ImportEnv,
	read: (path: string) => Promise<string | null>,
	skip?: (path: string) => boolean,
): PlanContext {
	return {
		skip,
		validateDefinition: checkAutomationDocument,
		targetDevice: env.device,
		target: env.target,
		directories: env.directories,
		read,
		listDefinitionFolders: async () => {
			if (!env.storage.list) throw new Error('list-unavailable');
			return (await env.storage.list(AUTOMATION_DEFINITIONS_ROOT)).folders;
		},
	};
}

export function planView(plan: ImportPlan): PlanView {
	return {
		...(plan.adoptDevice ? { adoptDevice: plan.adoptDevice } : {}),
		problems: plan.problems,
		warnings: plan.warnings,
		outcomes: plan.outcomes,
		batches: plan.batches.length,
		unchanged: plan.writes.every((write) => write.unchanged),
		disabledAutomations: plan.disabledAutomations,
		reauthorize: plan.reauthorize,
	};
}

/**
 * Everything an import would do, decided before any valid data is touched: version and digests were already checked by
 * `inspectPackage`; this adds path ownership, identity collisions, directory authorization and the retention of
 * unchanged data. Read-only, and repeated under the recovery lock right before the write.
 */
export async function preflightImport(pkg: BackupPackage, options: ImportOptions, env: ImportEnv): Promise<PlanView> {
	const { plan, lists, notes } = await resolvePlan(pkg, options, env);
	const view = planView(plan);
	// A resumed import keeps the lists of its first run: the finished steps are skipped here and cannot rebuild them.
	return lists
		? { ...view, ...lists, warnings: [...lists.warnings, ...notes] }
		: { ...view, warnings: [...view.warnings, ...notes] };
}

interface Step {
	readonly key: string;
	readonly written: Readonly<Record<string, string>>;
	readonly notes: Warning[];
}
type Lists = Pick<ImportReport, 'disabledAutomations' | 'reauthorize' | 'warnings'>;
/** Durable resume state: which steps of which import finished, the digest of every file each one wrote, and the lists of the first run. */
interface Progress {
	readonly format: 1;
	readonly packageDigest: string;
	readonly options: string;
	readonly steps: ReadonlyArray<{ readonly key: string; readonly written: Readonly<Record<string, string>> }>;
	readonly lists?: Lists;
}
const optionsKey = (o: ImportOptions, device: string): string =>
	JSON.stringify([
		device,
		o.adoptDevice ?? '',
		[...(o.includeDevices ?? [])].sort(),
		[...(o.skipSections ?? [])].sort(),
		o.archiveMissingDirectories === true,
	]);
/**
 * The finished steps of this very import (same package, options and target device); anything else is ignored.
 * A recorded step is trusted only while every file it wrote still exists: a missing file means the record cannot be
 * believed and the step runs again (nothing is there to overwrite). A file that exists but differs from the recorded
 * digest was changed by someone since: it is kept exactly as it is and reported, never written over.
 */
async function loadProgress(
	env: Pick<ImportEnv, 'storage' | 'device'>,
	pkg: BackupPackage,
	options: ImportOptions,
): Promise<{ steps: Step[]; lists?: Lists }> {
	const none = { steps: [] };
	try {
		const text = await readOrNull(env.storage, IMPORT_PROGRESS_PATH);
		if (!text) return none;
		const value = JSON.parse(text) as Progress;
		if (
			value.format !== 1 ||
			value.packageDigest !== pkg.digest ||
			value.options !== optionsKey(options, env.device)
		)
			return none;
		const steps: Array<Step> = [];
		for (const step of value.steps) {
			const paths = Object.keys(step.written ?? {});
			if (!paths.length) continue;
			const notes: Warning[] = [];
			let present = 0;
			for (const path of paths) {
				const content = await readOrNull(env.storage, path);
				if (content === null) notes.push({ code: 'step-file-missing', subject: path });
				else {
					present++;
					if ((await sha256(content)) !== step.written[path])
						notes.push({ code: 'step-file-changed', subject: path });
				}
			}
			// A step none of whose files exists cannot be believed (a forged or stale record): it runs again. When only
			// some are gone the person removed them after the import; that is kept and reported, never undone.
			if (present) steps.push({ ...step, notes });
		}
		return steps.length ? { steps, lists: value.lists } : none;
	} catch {
		return none;
	}
}

/**
 * The plan with the recorded steps settled. A recorded step counts only if it names exactly the paths the plan gives that
 * step; otherwise it is dropped and the plan is made again without it. Existing files of a trusted step are never
 * written (changed ones are reported), and files of it that are gone are reported as removed, not recreated.
 */
async function resolvePlan(pkg: BackupPackage, options: ImportOptions, env: ImportEnv) {
	const progress = await loadProgress(env, pkg, options);
	let steps = [...progress.steps];
	const read = (path: string) => readOrNull(env.storage, path);
	for (;;) {
		const settled = new Set(steps.flatMap((step) => Object.keys(step.written)));
		const plan = await planImport(
			pkg,
			options,
			contextFor(env, read, (path) => settled.has(path)),
		);
		const good = steps.filter((step) => {
			const mine = plan.writes.filter((write) => write.group === step.key).map((write) => write.path);
			return mine.length > 0 && mine.sort().join('\n') === Object.keys(step.written).sort().join('\n');
		});
		if (good.length === steps.length)
			return {
				plan,
				steps,
				lists: steps.length ? progress.lists : undefined,
				notes: steps.flatMap((step) => step.notes),
			};
		steps = good;
	}
}

async function saveReport(env: ImportEnv, report: ImportReport): Promise<void> {
	try {
		await ensureDirectory(env.storage, IMPORT_REPORT_PATH.split('/').slice(0, -1).join('/'));
		await env.storage.write(IMPORT_REPORT_PATH, JSON.stringify(report));
	} catch (error) {
		// The report is a convenience for the settings page; the data itself is already safe.
		console.error('[HUHU backup] could not save the import report:', error);
	}
}

/**
 * Staged cutover. The plan is cut into bounded transactions (the shared journal caps a transaction); each one uses the
 * T-15 protocol: preflight BUSY, close every owner, strict drain, recompute the plan from the locked bytes, verified
 * recovery copies, journal, replace, adopt. A failed transaction rolls back to the previous bytes. Because identical
 * content counts as finished, running the same import again resumes after the last good transaction; the report
 * written after each step tells the page where it stopped.
 */
export async function runImport(pkg: BackupPackage, options: ImportOptions, env: ImportEnv): Promise<ImportOutcome> {
	const resolved = await resolvePlan(pkg, options, env);
	const first = resolved.plan;
	const steps = resolved.steps.map(({ key, written }) => ({ key, written }));
	// Paths a finished step wrote are the import's own past work: a later live edit of them is not a conflict.
	const settled = new Set(steps.flatMap((step) => Object.keys(step.written)));
	const recorded = { lists: resolved.lists, notes: resolved.notes };
	if (first.problems.length) throw new BackupError('preflight-failed', { problems: first.problems });
	const now = (env.now ?? Date.now)();
	const done = new Set(steps.map((step) => step.key).filter((key) => first.batches.includes(key)));
	// Lists come from the run that planned every step; a resume cannot rebuild them from the steps it skips.
	const lists: Lists = recorded.lists
		? { ...recorded.lists, warnings: [...recorded.lists.warnings, ...recorded.notes] }
		: {
				disabledAutomations: first.disabledAutomations,
				reauthorize: first.reauthorize,
				warnings: [...first.warnings, ...recorded.notes],
			};
	const report = (status: ImportReport['status'], errorCode?: string): ImportReport => ({
		format: 1,
		packageDigest: pkg.digest,
		finishedAt: now,
		status,
		batches: first.batches.map((key) => ({ key, status: done.has(key) ? 'done' : 'pending' })),
		...(errorCode ? { errorCode } : {}),
		...lists,
	});
	const saveProgress = async () => {
		const progress: Progress = {
			format: 1,
			packageDigest: pkg.digest,
			options: optionsKey(options, env.device),
			steps,
			lists,
		};
		try {
			await ensureDirectory(env.storage, IMPORT_PROGRESS_PATH.split('/').slice(0, -1).join('/'));
			await env.storage.write(IMPORT_PROGRESS_PATH, JSON.stringify(progress));
		} catch (error) {
			console.error('[HUHU backup] could not save the import progress:', error);
		}
	};
	if (first.writes.every((write) => write.unchanged)) {
		for (const key of first.batches) done.add(key);
		// The last report always says how this import ended, never a stale `partial` from an earlier attempt.
		// Its lists stay those of the import that did the work; this retry only confirms the outcome.
		const prior = await readImportReport(env);
		const final = report('done');
		const kept: ImportReport =
			prior?.packageDigest === pkg.digest
				? {
						...final,
						disabledAutomations: prior.disabledAutomations,
						reauthorize: prior.reauthorize,
						warnings: [
							...prior.warnings.filter(
								(w) => w.code !== 'step-file-changed' && w.code !== 'step-file-missing',
							),
							...recorded.notes,
						],
					}
				: final;
		await saveReport(env, kept);
		await finish(env);
		return { status: 'unchanged', report: kept };
	}
	const changed: string[] = [];
	for (const key of first.batches) {
		if (done.has(key)) continue;
		const mine = first.writes.filter((write) => write.group === key);
		const own = new Set(mine.map((write) => write.path));
		try {
			const result = await env.recovery.run({
				operation: `backup-import:${key}`,
				extraOwners: offlineOwnersFor(env.recovery, mine),
				stage: async (locked) => {
					// Only this step's own paths are looked at: everything else is another step's business.
					const plan = await planImport(
						pkg,
						options,
						contextFor(env, locked, (path) => !own.has(path)),
					);
					if (plan.problems.length) throw new BackupError('preflight-failed', { problems: plan.problems });
					if (plan.batches.join() !== first.batches.join())
						throw new BackupError('preflight-failed', { reason: 'plan-changed' });
					return {
						writes: plan.writes
							.filter((write) => write.group === key)
							.map((write) => ({ path: write.path, content: write.content })),
					};
				},
			});
			changed.push(...result.changed);
			const written: Record<string, string> = {};
			for (const write of mine) written[write.path] = await sha256(write.content);
			steps.push({ key, written });
			for (const path of own) settled.add(path);
			done.add(key);
			await saveProgress();
			await saveReport(env, report(done.size === first.batches.length ? 'done' : 'partial'));
		} catch (error) {
			const failure = toBackupError(error);
			await saveReport(env, report(done.size ? 'partial' : 'failed', failure.code));
			if (!done.size) throw failure;
			throw new BackupError('partial-import', {
				done: done.size,
				total: first.batches.length,
				failure: failure.code,
				...failure.detail,
			});
		}
	}
	await finish(env);
	return { status: 'done', changed, report: report('done') };
}

/** A finished import leaves no resume state behind: the next one starts from what is on disk. */
async function finish(env: ImportEnv): Promise<void> {
	try {
		if (await env.storage.exists(IMPORT_PROGRESS_PATH)) await env.storage.remove(IMPORT_PROGRESS_PATH);
	} catch (error) {
		console.error('[HUHU backup] could not clear the import progress:', error);
	}
}

/** The report of the last import (or its stopping point), or undefined when there never was one. */
export async function readImportReport(env: Pick<ImportEnv, 'storage'>): Promise<ImportReport | undefined> {
	try {
		const text = await readOrNull(env.storage, IMPORT_REPORT_PATH);
		if (!text) return undefined;
		const value = JSON.parse(text) as ImportReport;
		return value && value.format === 1 && Array.isArray(value.batches) ? value : undefined;
	} catch {
		return undefined;
	}
}
