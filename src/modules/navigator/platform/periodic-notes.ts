import { normalizePath, type App, type TFile } from 'obsidian';
import type { WeekStart } from '../core/moment-format';
import { identifyPeriodNote, parentOf, startOfPeriod, stepPeriod, type Period, type PeriodicRef, type PeriodRules } from '../core/periodic';
import { baseName, parentFolder, type NoteEntry } from '../core/types';
import type { ConfigReader } from '../core/productivity-config';
import { PERIOD_NAME_FORMATS, periodicNotePath } from '../../../shared/periodic-paths';
import { isTemplaterInstalled } from './templates';
import { obsidianLocale, resolveWeekStart } from './locale';
import type { NoteFactory } from './note-factory';
import type { PeriodicPreparation, PeriodicPrepareOptions } from '../api';

interface PeriodicOpenOptions { newTab?: boolean; split?: boolean; ownerWindow?: Window; cursor?: number }

export interface PeriodicNotes {
	/** Which periods are in use, the journal root folder, the week start and the locale. */
	config(): { rules: PeriodRules; root: string; weekStart: WeekStart; locale: string | undefined };
	pathFor(period: Period, date: Date): string;
	/** The note of that period if it exists. */
	existing(period: Period, date: Date): NoteEntry | undefined;
	/** Which period note a path is. */
	identify(path: string): PeriodicRef | undefined;
	/** Open the note of the period containing `date`, creating it (and its folders) if needed. */
	open(period: Period, date: Date, options?: PeriodicOpenOptions): Promise<boolean>;
	/** The note of the period containing `date`, created from its template if needed but not opened; undefined when cancelled. */
	ensure(period: Period, date: Date): Promise<TFile | undefined>;
	prepare(period: Period, date: Date, options?: PeriodicPrepareOptions): Promise<PeriodicPreparation>;
	/** Next (+1) or previous (-1) period note of the active note; false when the active note is not a period note. */
	openRelative(delta: number): Promise<boolean>;
	openParent(): Promise<boolean>;
}

export interface PeriodicDeps {
	app: App;
	settings: ConfigReader;
	factory: NoteFactory;
	/** Open an existing note in the editor. */
	openFile: (file: TFile, options: PeriodicOpenOptions) => Promise<void>;
	isActive?: () => boolean;
	entry: (path: string) => NoteEntry | undefined;
	notify: (key: string) => void;
	report: (error: unknown) => void;
}

export function createPeriodicNotes(deps: PeriodicDeps): PeriodicNotes {
	const { app, settings } = deps;

	function config() {
		const s = settings.get();
		return { rules: s.periods, root: s.periodicRoot, weekStart: resolveWeekStart(s.calendarWeekStart), locale: obsidianLocale() };
	}
	const available = (period: Period) => deps.isActive?.() !== false && config().rules[period].enabled;

	const pathFor = (period: Period, date: Date) => {
		const { root, weekStart } = config();
		return normalizePath(periodicNotePath(root, period, date, weekStart));
	};

	/** Create the note of a period (a template question the user cancels leaves undefined); `open` decides whether it is shown. */
	const creations = new Map<string, Promise<TFile | undefined>>();
	function create(period: Period, start: Date, path: string, open: false | PeriodicOpenOptions): Promise<TFile | undefined> {
		const isActive = () => available(period) && (!open || !open.ownerWindow?.closed);
		const pending = creations.get(path);
		if (pending) return pending.then(async (file) => { if (!isActive()) return undefined; if (file && open) await deps.openFile(file, open); return file; });
		const options = {
			folder: parentFolder(path),
			name: baseName(path).replace(/\.md$/, ''),
			exact: true,
			template: config().rules[period].template,
			noteDate: start,
			periodFormat: PERIOD_NAME_FORMATS[period],
			weekDaysFromNoteDate: period === 'week',
			open,
			isActive,
		};
		const operation = (async () => {
			const prepared = await deps.factory.prepareNote({ ...options, interactive: true });
			if (!isActive()) return undefined;
			if (prepared.status !== 'ready') {
				// Explicit manual note creation keeps the existing external-engine integration.
				if (prepared.code === 'template-engine-unavailable' && isTemplaterInstalled(app)) return deps.factory.createNote(options);
				if (prepared.status === 'cancelled') return undefined;
				deps.notify(`calendarUnified.error.${prepared.code}`);
				throw new Error(`calendarUnified.error.${prepared.code}`);
			}
			const { contentFiles } = await import('../../../host/obsidian/storage/content-files');
			const cancelled = new Error('periodic-cancelled');
			try {
				await contentFiles(app).process(path, (current) => {
					if (!isActive()) throw cancelled;
					return current ?? prepared.content;
				});
			} catch (error) { if (error === cancelled) return undefined; throw error; }
			if (!isActive()) return undefined;
			const file = app.vault.getFileByPath(path) ?? undefined;
			if (file && open) await deps.openFile(file, { ...open, cursor: prepared.cursor });
			return file;
		})().finally(() => { creations.delete(path); });
		creations.set(path, operation);
		return operation;
	}

	async function open(period: Period, date: Date, options: PeriodicOpenOptions = {}): Promise<boolean> {
		if (deps.isActive?.() === false || options.ownerWindow?.closed) return false;
		const { rules, weekStart } = config();
		if (!rules[period].enabled) { deps.notify(`navigator.periodOff.${period}`); return false; }
		const start = startOfPeriod(period, date, weekStart);
		const path = pathFor(period, start);
		const existing = app.vault.getFileByPath(path);
		if (existing) {
			await deps.openFile(existing, options);
			return true;
		}
		return (await create(period, start, path, options)) !== undefined;
	}

	async function ensure(period: Period, date: Date): Promise<TFile | undefined> {
		if (!available(period)) return undefined;
		const start = startOfPeriod(period, date, config().weekStart);
		const path = pathFor(period, start);
		return app.vault.getFileByPath(path) ?? create(period, start, path, false);
	}

	const identify = (path: string) => {
		const { rules, root, weekStart } = config();
		return identifyPeriodNote(root, path, rules, weekStart);
	};
	const activeRef = () => {
		const file = app.workspace.getActiveFile();
		return file ? identify(file.path) : undefined;
	};

	return {
		config,
		pathFor,
		existing: (period, date) => deps.entry(pathFor(period, date)),
		identify,
		open,
		ensure,
		async prepare(period, date, options = {}) {
			if (deps.isActive?.() === false) return { status: 'unavailable', code: 'periodic-unavailable' };
			const { rules, weekStart } = config();
			if (!rules[period].enabled) return { status: 'unavailable', code: 'period-disabled' };
			const start = startOfPeriod(period, date, weekStart);
			const path = options.path ?? pathFor(period, start);
			const prepared = await deps.factory.prepareNote({
				folder: parentFolder(path), name: baseName(path).replace(/\.md$/, ''), exact: true,
				template: options.template ?? rules[period].template, noteDate: start,
				resolvedTemplate: options.resolvedTemplate,
				periodFormat: PERIOD_NAME_FORMATS[period], weekDaysFromNoteDate: period === 'week',
				interactive: options.interactive, values: options.values, open: false,
				isActive: () => available(period),
			});
			if (deps.isActive?.() === false) return { status: 'unavailable', code: 'periodic-unavailable' };
			if (!config().rules[period].enabled) return { status: 'unavailable', code: 'period-disabled' };
			return prepared;
		},
		async openRelative(delta) {
			const ref = activeRef();
			if (!ref) { deps.notify('navigator.notPeriodNote'); return false; }
			const next = stepPeriod(ref, delta);
			return open(next.period, next.start);
		},
		async openParent() {
			const ref = activeRef();
			if (!ref) { deps.notify('navigator.notPeriodNote'); return false; }
			const { rules, weekStart } = config();
			const parent = parentOf(ref, rules, weekStart);
			if (!parent) { deps.notify('navigator.noParentPeriod'); return false; }
			return open(parent.period, parent.start);
		},
	};
}
