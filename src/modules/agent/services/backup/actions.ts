import type { BackupPackage } from '../../core/backup/format';
import type { ImportOptions, ImportReport, PackageView, PlanView } from '../../core/backup/model';
import { exportBackup, saveExport } from './export';
import { inspectPackage, packageView, preflightImport, readImportReport, runImport, type ImportEnv } from './import';

/** What the settings page can do. Every method either returns data for the page or rejects with a `BackupError`. */
export interface BackupActions {
	/** Exports a consistent package into the vault and returns where it is and what it contains. */
	exportPackage(): Promise<{ path: string; view: PackageView }>;
	/** Verifies a package (version, structure, every digest) and describes it. Touches no data. */
	inspect(text: string): Promise<PackageView>;
	/** Everything the import would do on this device, decided before any valid data is touched. */
	preflight(text: string, options: ImportOptions): Promise<PlanView>;
	runImport(
		text: string,
		options: ImportOptions,
	): Promise<{ status: 'done' | 'unchanged'; changed: number; report: ImportReport }>;
	lastReport(): Promise<ImportReport | undefined>;
	/** This device's id, for the page to preselect the matching source device. */
	readonly device: string;
}

export function createBackupActions(env: ImportEnv): BackupActions {
	let cached: { text: string; pkg: BackupPackage; view: PackageView } | undefined;
	const open = async (text: string) => {
		if (cached?.text === text) return cached;
		const { pkg, view } = await inspectPackage(text);
		cached = { text, pkg, view };
		return cached;
	};
	return {
		device: env.device,
		exportPackage: async () => {
			const { pkg, text } = await exportBackup(env);
			const path = await saveExport(env.storage, text, (env.now ?? Date.now)());
			return { path, view: packageView(pkg) };
		},
		inspect: async (text) => (await open(text)).view,
		preflight: async (text, options) => preflightImport((await open(text)).pkg, options, env),
		runImport: async (text, options) => {
			const result = await runImport((await open(text)).pkg, options, env);
			return {
				status: result.status,
				changed: result.status === 'done' ? result.changed.length : 0,
				report: result.report,
			};
		},
		lastReport: () => readImportReport(env),
	};
}
