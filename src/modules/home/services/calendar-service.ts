import type { App } from 'obsidian';
import { readMarkdownDocument, readYaml } from '../../../shared/storage/markdown-document';
import { openNoteAt } from '../../../host/obsidian/open-note';
import { contentFiles, isManagedFile } from '../../../host/obsidian/storage/content-files';
import { isUnderExcludedFolder, normalizeExcludeFolders } from '../../../shared/exclude-folders';
import { readTaskMeta, taskMetaSuffix, TASK_META_REGEX } from '../../../shared/automation/metadata';
import { locateTaskLine } from '../../../shared/automation/task-line';
import type { NavigatorPeriodic } from '../../navigator/api';
import type { CalendarService } from '../api';
import type { DashboardSettings } from '../core/board/types';
import type {
	CalendarCreateResult,
	CalendarFailure,
	CalendarScope,
	CalendarSnapshot,
	CalendarTask,
	CalendarTaskInput,
	CalendarTargetSnapshot,
} from '../core/calendar/types';
import {
	collectVaultTasks,
	indexTasksByDay,
	invalidatePath,
	matchesCalendarFilter,
	primeTaskCache,
	removeTaskFromFile,
	toggleTaskInFile,
	toIsoDate,
} from '../platform/calendar/alltasks-scan';
import { substituteTemplateVars } from '../platform/calendar/daily-notes';
import { momentOf } from '../../../host/obsidian/datetime';
import { byDayTaskTime, taskDayTime } from '../core/calendar/agenda';
import type { CalendarTaskFilter } from '../core/calendar/task-filter';
import type { AutomationSchedule } from '../../automations/api';
import { projectRecurrences, recurrenceSchedule, zonedTaskStamp } from '../core/calendar/recurrence';
import { TASKS_PATH } from '../../../shared/storage/vault-layout';
import { taskDraftError, type TaskDraft } from '../../../shared/automation/task';
import { boardTaskLines } from '../platform/calendar/managed-tasks';
import { dashboardPath } from '../../../shared/storage/dashboard-paths';
import { REMINDER_REGEX, hasCalendarDateProtocol } from '../core/calendar/syntax';
import { withTaskCompletion } from '../core/calendar/completion';

type CalendarSettings = Pick<
	DashboardSettings,
	| 'calendarExcludeFolders'
	| 'calendarTaskFilter'
	| 'calendarTaskTarget'
	| 'calendarTaskInsertPosition'
	| 'dashboardFile'
> &
	Partial<Pick<DashboardSettings, 'workspaceFiles'>>;
export interface CalendarServiceDeps {
	app: App;
	settings(): CalendarSettings;
	journal(): NavigatorPeriodic | undefined;
	schedule?(): AutomationSchedule | undefined;
	edit?: CalendarService['openEditor'];
	remove?: CalendarService['openRemoval'];
	deviceId?: string;
	writeFilter?(filter: CalendarTaskFilter): Promise<void>;
}
export interface OwnedCalendarService extends CalendarService {
	invalidate(): void;
	reconcile(): Promise<void>;
	dispose(): void;
}
interface SourceState {
	scope: CalendarScope;
	status: CalendarSnapshot['status'];
	tasks: CalendarTask[];
	error?: string;
	revision: number;
	generation: number;
	inflight?: Promise<void>;
	views: Map<string, CalendarSnapshot>;
}

function failure(
	code: CalendarFailure['code'],
	status: CalendarFailure['status'] = 'failed',
	message?: string,
): CalendarFailure {
	return { status, code, ...(message ? { message } : {}) };
}
function localDate(iso: string): Date | undefined {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
	const date = new Date(2000, 0, 1);
	const [year, month, day] = iso.split('-').map(Number);
	date.setFullYear(year!, month! - 1, day);
	return toIsoDate(date) === iso ? date : undefined;
}
function markdownPath(path: string): string {
	return /\.md$/i.test(path) ? path : `${path}.md`;
}
function validPath(path: unknown): path is string {
	return (
		typeof path === 'string' &&
		path.length > 0 &&
		path.length < 2048 &&
		!/[\\:*?"<>|]/.test(path) &&
		![...path].some((character) => character.charCodeAt(0) < 32) &&
		path.split('/').every((part) => !!part && part.trim() === part && !part.startsWith('.'))
	);
}
function boardPath(path: string | undefined): string | undefined {
	return path?.trim() ? markdownPath(path.trim().replace(/^\/+/, '')) : undefined;
}
function validInput(input: CalendarTaskInput): boolean {
	return (
		!taskDraftError(input) &&
		(!input.date || !!localDate(input.date)) &&
		typeof input.text === 'string' &&
		!!input.text.trim() &&
		!/[\r\n]/.test(input.text) &&
		input.text.length <= 10_000 &&
		!/<!--\s*huhu-task:/.test(input.text) &&
		!hasCalendarDateProtocol(input.text) &&
		(input.time === undefined || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) &&
		(input.reminder === undefined ||
			(/^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d$/.test(input.reminder) &&
				!!localDate(input.reminder.slice(0, 10)))) &&
		(input.effectKey === undefined ||
			(typeof input.effectKey === 'string' && input.effectKey.length > 0 && input.effectKey.length <= 2048))
	);
}
function restoredTarget(value: unknown, input: CalendarTaskInput): CalendarTargetSnapshot | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const target = value as Partial<CalendarTargetSnapshot>;
	if (
		target.version !== 1 ||
		!['daily', 'file', 'folder', 'task'].includes(target.kind ?? '') ||
		!validPath(target.path) ||
		!/\.md$/i.test(target.path) ||
		!['start', 'end'].includes(target.position ?? '') ||
		target.date !== input.date ||
		typeof target.id !== 'string' ||
		!target.id ||
		target.id.length > 4096 ||
		(input.effectKey !== undefined && target.id !== `calendar:${input.effectKey}`) ||
		target.effectKey !== input.effectKey ||
		target.boardPath !== boardPath(input.boardPath) ||
		(target.template !== undefined && (typeof target.template !== 'string' || !target.template.trim()))
	)
		return undefined;
	return {
		version: 1,
		kind: target.kind!,
		path: target.path,
		position: target.position!,
		date: target.date,
		id: target.id,
		boardPath: target.boardPath,
		template: target.template,
		effectKey: target.effectKey,
	};
}
function suffix(key: string): string {
	let a = 2166136261,
		b = 2246822507;
	for (let i = 0; i < key.length; i++) {
		a = Math.imul(a ^ key.charCodeAt(i), 16777619);
		b = Math.imul(b ^ key.charCodeAt(i), 3266489909);
	}
	return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
function insert(raw: string, line: string, position: 'start' | 'end'): string {
	const newline = raw.includes('\r\n') ? '\r\n' : '\n';
	if (position === 'end') return `${raw}${raw && !raw.endsWith('\n') ? newline : ''}${line}${newline}`;
	const document = readMarkdownDocument(raw);
	if (document.yaml === null)
		return raw.startsWith('\uFEFF') ? `\uFEFF${line}${newline}${raw.slice(1)}` : `${line}${newline}${raw}`;
	const frontmatter = raw.slice(0, raw.length - document.body.length);
	return `${frontmatter}${frontmatter.endsWith('\n') ? '' : newline}${line}${newline}${document.body}`;
}

/** Source-backed queries and one atomic writer shared by every calendar entry and automation. */
export function createCalendarService(deps: CalendarServiceDeps): OwnedCalendarService {
	const { app } = deps;
	const files = contentFiles(app);
	const listeners = new Set<() => void>();
	const sources = new Map<string, SourceState>();
	let stopped = false;
	let queued = false;
	const notify = () => {
		if (!stopped) for (const listener of [...listeners]) listener();
	};
	const get = (scope: CalendarScope = {}) => {
		const path = boardPath(scope.boardPath);
		const key = JSON.stringify([path ?? '', deps.settings().calendarExcludeFolders]);
		let state = sources.get(key);
		if (!state) {
			state = {
				scope: { boardPath: path },
				status: 'idle',
				tasks: [],
				revision: 0,
				generation: 0,
				views: new Map(),
			};
			sources.set(key, state);
		}
		return state;
	};
	const snapshot = (scope: CalendarScope = {}): CalendarSnapshot => {
		const state = get(scope);
		const filter = scope.filter ?? deps.settings().calendarTaskFilter ?? 'all';
		const today = toIsoDate(new Date());
		const from = scope.from ?? today,
			to = scope.to ?? `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
		const key = `${filter}:${today}:${from}:${to}`;
		let value = state.views.get(key);
		if (!value) {
			const projected = projectRecurrences(state.tasks, deps.schedule?.(), from, to);
			const tasks = [...state.tasks, ...projected].filter(
				(task) => !task.cancelled && matchesCalendarFilter(task, filter, today),
			);
			const byDay = indexTasksByDay(tasks);
			for (const [iso, entries] of byDay) entries.sort(byDayTaskTime(iso));
			value = {
				status: stopped ? 'unavailable' : state.status,
				tasks,
				byDay,
				unfilteredCount: state.tasks.length,
				filter,
				revision: state.revision,
				error: state.error,
			};
			state.views.set(key, value);
		}
		return value;
	};
	async function refresh(scope: CalendarScope = {}): Promise<CalendarSnapshot> {
		const state = get(scope);
		if (stopped) return snapshot(scope);
		if (!state.inflight) {
			const generation = state.generation;
			state.status = 'loading';
			state.views.clear();
			notify();
			state.inflight = (async () => {
				try {
					const tasks = await collectVaultTasks(
						app,
						deps.settings().calendarExcludeFolders,
						state.scope.boardPath,
						true,
					);
					if (stopped || generation !== state.generation) return;
					const registered = new Set(
						[deps.settings().dashboardFile, ...(deps.settings().workspaceFiles ?? [])].flatMap((path) => [
							markdownPath(dashboardPath(path)),
							markdownPath(path),
						]),
					);
					const lines = new Map<string, Set<number>>();
					for (const path of registered) {
						const file = files.getFileByPath(path);
						if (file) lines.set(path, boardTaskLines(await files.read(file)));
					}
					if (stopped || generation !== state.generation) return;
					state.tasks = tasks.filter((task) => !!task.id || !!lines.get(task.path)?.has(task.line));
					state.status = 'ready';
					state.error = undefined;
				} catch (error) {
					if (stopped || generation !== state.generation) return;
					state.status = 'error';
					state.error = error instanceof Error ? error.message : String(error);
				} finally {
					state.inflight = undefined;
					state.revision++;
					state.views.clear();
					notify();
				}
			})();
		}
		await state.inflight;
		return snapshot(scope);
	}
	function invalidate() {
		if (stopped || queued) return;
		queued = true;
		queueMicrotask(() => {
			queued = false;
			if (stopped) return;
			for (const state of sources.values()) {
				state.views.clear();
				void (state.inflight ?? Promise.resolve()).then(() => {
					if (!stopped) return refresh(state.scope);
					return undefined;
				});
			}
			notify();
		});
	}
	const stopFiles = files.subscribe((event) => {
		invalidatePath(app, event.path);
		invalidate();
	});
	const allowed = (target: CalendarTargetSnapshot): CalendarFailure | undefined => {
		if (
			isUnderExcludedFolder(target.path, normalizeExcludeFolders(deps.settings().calendarExcludeFolders)) &&
			target.path !== target.boardPath
		)
			return failure('source-excluded', 'unavailable');
		if (target.boardPath && !files.getFileByPath(target.boardPath)) return failure('source-missing', 'unavailable');
		return undefined;
	};
	async function resolveTargetUnchecked(input: CalendarTaskInput) {
		if (stopped || input.signal?.aborted) return failure('stopped', 'cancelled');
		if (!validInput(input)) return failure('invalid-input');
		if (input.recurrence) {
			try {
				const engine = deps.schedule?.();
				if (!engine) return failure('invalid-input');
				engine.validate(recurrenceSchedule(input.recurrence));
			} catch {
				return failure('invalid-input');
			}
		}
		const s = deps.settings();
		const custom = input.date ? s.calendarTaskTarget : { kind: 'file' as const, path: TASKS_PATH };
		if (custom && !custom.path.trim()) return failure('invalid-target');
		const id = input.effectKey ? `calendar:${input.effectKey}` : crypto.randomUUID();
		let path: string, template: string | undefined;
		const kind = custom?.kind ?? 'daily';
		if (custom) {
			const root = custom.path.trim().replace(/^\/+|\/+$/g, '');
			if (!validPath(root)) return failure('invalid-target');
			if (custom.kind === 'file') path = markdownPath(root);
			else if (custom.kind === 'folder') path = `${root}/${input.date}.md`;
			else {
				const title =
					input.text
						.trim()
						.replace(/[\s\\/:*?"<>|]+/g, '-')
						.replace(/^\.+/, '')
						.slice(0, 80) || input.date;
				path = `${root}/${title}-${suffix(id)}.md`;
				template = custom.template?.trim() || undefined;
			}
		} else {
			const journal = deps.journal();
			if (!journal) return failure('periodic-unavailable', 'unavailable');
			const info = journal.inspect('day', localDate(input.date)!);
			if (info.status === 'disabled') return failure('period-disabled', 'unavailable');
			if (info.status === 'unavailable') return failure('periodic-unavailable', 'unavailable');
			path = info.path;
			template = journal.template('day', localDate(input.date))?.trim() || undefined;
		}
		if (!validPath(path)) return failure('invalid-target');
		await files.refresh();
		if (kind === 'task' && template) {
			const source = files.resolveLink(template);
			if (!source) return failure('template-missing');
			template = source.path;
		}
		const target: CalendarTargetSnapshot = {
			version: 1,
			kind,
			path,
			position: s.calendarTaskInsertPosition === 'end' ? 'end' : 'start',
			date: input.date,
			id,
			boardPath: boardPath(input.boardPath),
			template,
			effectKey: input.effectKey,
		};
		return allowed(target) ?? { status: 'ready' as const, target };
	}
	async function resolveTarget(input: CalendarTaskInput) {
		try {
			return await resolveTargetUnchecked(input);
		} catch (error) {
			return failure('write-failed', 'failed', error instanceof Error ? error.message : String(error));
		}
	}
	const periodicAvailability = (target: CalendarTargetSnapshot): CalendarFailure | undefined => {
		if (target.kind !== 'daily') return undefined;
		const journal = deps.journal();
		if (!journal) return failure('periodic-unavailable', 'unavailable');
		const info = journal.inspect('day', localDate(target.date)!);
		if (info.status === 'disabled') return failure('period-disabled', 'unavailable');
		if (info.status === 'unavailable') return failure('periodic-unavailable', 'unavailable');
		return undefined;
	};

	async function createTask(input: CalendarTaskInput & { target?: unknown }): Promise<CalendarCreateResult> {
		if (stopped || input.signal?.aborted) return failure('stopped', 'cancelled');
		if (!validInput(input)) return failure('invalid-input');
		if (input.recurrence) {
			try {
				const engine = deps.schedule?.();
				if (!engine) return failure('invalid-input');
				engine.validate(recurrenceSchedule(input.recurrence));
			} catch {
				return failure('invalid-input');
			}
		}
		try {
			const resolved = input.target === undefined ? await resolveTarget(input) : undefined;
			if (resolved && resolved.status !== 'ready') return resolved;
			const target = resolved?.status === 'ready' ? resolved.target : restoredTarget(input.target, input);
			if (!target) return failure('invalid-target');
			await files.refresh();
			const same = (line: string) => {
				const meta = readTaskMeta(line);
				return input.effectKey ? meta.effectKey === input.effectKey : meta.id === target.id;
			};
			const existingFile = files.getFileByPath(target.path);
			const existing = existingFile ? await files.read(existingFile) : undefined;
			const alreadyCommitted = existing?.split('\n').some(same) ?? false;
			const denied = allowed(target) ?? periodicAvailability(target);
			if (denied && !alreadyCommitted) return denied;
			let seed = '';
			if (!existingFile) {
				if (target.kind === 'daily') {
					const journal = deps.journal();
					if (!journal) return failure('periodic-unavailable', 'unavailable');
					const prepared = await journal.prepare('day', localDate(input.date)!, {
						path: target.path,
						resolvedTemplate: target.template ?? null,
						interactive: input.interactive === true,
						values: input.values,
					});
					if (prepared.status !== 'ready') return prepared;
					if (prepared.path !== target.path) return failure('invalid-target');
					seed = prepared.content;
				} else if (target.template) {
					const template = files.getFileByPath(target.template);
					if (!template) return failure('template-missing');
					const raw = await files.read(template);
					if (/<%/.test(raw)) return failure('template-engine-unavailable', 'unavailable');
					if (/\{\{prompt:/.test(raw)) return failure('template-input-required', 'unavailable');
					seed = substituteTemplateVars(raw, {
						title: target.path.split('/').pop()!.replace(/\.md$/, ''),
						now: momentOf(input.date),
					});
					try {
						readYaml(readMarkdownDocument(seed).yaml);
					} catch {
						return failure('template-invalid');
					}
				}
			}
			if (stopped || input.signal?.aborted) return failure('stopped', 'cancelled');
			const line = `- [ ] ${input.text.trim()}${input.date ? ` [due:: ${input.date}${input.time ? ` ${input.time}` : ''}]` : ''}${input.reminder ? ` ⏰ ${input.reminder}` : ''}${taskMetaSuffix({ id: target.id, effectKey: input.effectKey, runId: input.runId, recurrence: input.recurrence, timezone: input.recurrence?.timezone, deviceId: deps.deviceId })}`;
			let existed = false;
			const raw = await files.process(target.path, (current) => {
				if (stopped || input.signal?.aborted) throw new Error('calendar.stopped');
				if (current !== null && current.split('\n').some(same)) {
					existed = true;
					return current;
				}
				const deniedNow = allowed(target) ?? periodicAvailability(target);
				if (deniedNow) throw new Error(`calendar.${deniedNow.code}`);
				return insert(current ?? seed, line, target.position);
			});
			const lines = raw.split('\n');
			const at = lines.findIndex(same);
			const receipt = {
				id: target.id,
				path: target.path,
				line: at,
				originalLine: lines[at]!,
				date: input.date,
				effectKey: input.effectKey,
			};
			// From here the effect is committed. A refresh failure must never be reported as a failed write.
			try {
				const file = files.getFileByPath(target.path);
				if (!file || at < 0) return { status: 'written-pending-refresh', receipt, target };
				primeTaskCache(app, file, raw);
				invalidate();
				const current = await refresh({ boardPath: target.boardPath, filter: 'all' });
				if (
					current.status !== 'ready' ||
					!current.tasks.some(
						(task) =>
							task.path === target.path &&
							(input.effectKey ? task.effectKey === input.effectKey : task.id === target.id),
					)
				)
					return { status: 'written-pending-refresh', receipt, target };
			} catch {
				return { status: 'written-pending-refresh', receipt, target };
			}
			return { status: existed ? 'already-exists' : 'created', receipt, target };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message === 'calendar.stopped') return failure('stopped', 'cancelled');
			for (const code of [
				'source-excluded',
				'source-missing',
				'period-disabled',
				'periodic-unavailable',
			] as const)
				if (message === `calendar.${code}`) return failure(code, 'unavailable');
			return failure('write-failed', 'failed', message);
		}
	}
	async function materialize(task: CalendarTask): Promise<CalendarTask | undefined> {
		if (!task.virtual || !task.id || !task.seriesId || stopped) return task.virtual ? undefined : task;
		let index = -1;
		const raw = await files.process(task.path, (current) => {
			if (current === null || stopped) throw new Error('calendar.source-missing');
			const lines = current.split('\n');
			index = lines.findIndex((line) => readTaskMeta(line).id === task.id);
			if (index >= 0) return current;
			const seed = lines.find((line) => readTaskMeta(line).id === task.seriesId);
			if (!seed || seed !== task.originalLine) throw new Error('calendar.conflict');
			const line = `- [ ] ${task.text} [due:: ${task.due}${task.time ? ` ${task.time}` : ''}]${task.reminder ? ` ⏰ ${task.reminder}` : ''}${taskMetaSuffix({ id: task.id, seriesId: task.seriesId, occurrence: task.occurrence, effectKey: task.effectKey, timezone: task.timezone, deviceId: task.deviceId })}`;
			return insert(current, line, 'end');
		});
		const file = files.getFileByPath(task.path);
		if (!file) return undefined;
		const result = primeTaskCache(app, file, raw).find((entry) => entry.id === task.id);
		invalidate();
		return result;
	}
	let reconciling: Promise<void> | undefined;
	/** Persist missed occurrences plus the nearest upcoming one before its reminder becomes due. */
	async function reconcile() {
		if (reconciling) return reconciling;
		reconciling = (async () => {
			await refresh({ filter: 'all' });
			const tasks = get().tasks,
				engine = deps.schedule?.();
			if (!engine || stopped) return;
			for (const seed of tasks) {
				if (!seed.recurrence || !(seed.seriesTemplate?.date ?? seed.due)) continue;
				try {
					engine.validate(recurrenceSchedule(seed.recurrence));
				} catch {
					continue;
				}
				const now = Date.now();
				const today = zonedTaskStamp(now, seed.recurrence.timezone).slice(0, 10);
				const nextKnown = [
					!seed.checked && !seed.cancelled ? seed.recurrence.start : 0,
					...tasks
						.filter(
							(entry) =>
								entry.seriesId === seed.id &&
								entry.path === seed.path &&
								!entry.checked &&
								!entry.cancelled,
						)
						.map((entry) => entry.occurrence ?? 0),
				]
					.filter((at) => at > now)
					.sort((a, b) => a - b)[0];
				const horizon = nextKnown
					? zonedTaskStamp(nextKnown, seed.recurrence.timezone).slice(0, 10)
					: `${Number(today.slice(0, 4)) + 9}${today.slice(4)}`;
				const projected = projectRecurrences(
					tasks.filter((entry) => entry === seed || !entry.recurrence),
					engine,
					seed.seriesTemplate?.date ?? seed.due!,
					horizon,
				);
				for (const task of projected.filter((entry) => entry.seriesId === seed.id)) {
					if (stopped) return;
					await materialize(task);
					if (task.due! >= today && (task.occurrence ?? 0) > Date.now()) break;
				}
			}
			await refresh({ filter: 'all' });
		})().finally(() => {
			reconciling = undefined;
		});
		return reconciling;
	}

	async function updateTask(
		task: CalendarTask,
		draft: TaskDraft,
		following = false,
	): Promise<import('../api').CalendarMutationResult> {
		if (stopped) return failure('stopped', 'unavailable');
		if (!validInput({ ...draft, date: draft.date || '' })) return failure('invalid-input');
		if (draft.recurrence) {
			try {
				const engine = deps.schedule?.();
				if (!engine) return failure('invalid-input');
				engine.validate(recurrenceSchedule(draft.recurrence));
			} catch {
				return failure('invalid-input');
			}
		}
		try {
			if (task.virtual) {
				const real = await materialize(task);
				if (!real) return failure('conflict');
				task = real;
			}
			let wrote = false;
			await files.process(task.path, (raw) => {
				if (raw === null) throw new Error('calendar.source-missing');
				const lines = raw.split('\n');
				const matches = lines.flatMap((line, index) => (line === task.originalLine ? [index] : []));
				const index =
					lines[task.line] === task.originalLine ? task.line : matches.length === 1 ? matches[0]! : -1;
				if (index < 0) return raw;
				const meta = readTaskMeta(lines[index]!);
				const isSeries = !!meta.recurrence || !!meta.seriesId;
				const ownerId = meta.seriesId ?? meta.id;
				if (following && isSeries) {
					const before = new Date(`${task.due}T12:00:00Z`);
					before.setUTCDate(before.getUTCDate() - 1);
					for (let i = 0; i < lines.length; i++) {
						const old = readTaskMeta(lines[i]!);
						if (i !== index && old.id === ownerId && old.recurrence)
							lines[i] =
								lines[i]!.replace(TASK_META_REGEX, '') +
								taskMetaSuffix({
									...old,
									recurrence: { ...old.recurrence, end: before.toISOString().slice(0, 10) },
								});
						else if (
							i !== index &&
							old.seriesId === ownerId &&
							(old.occurrence ?? 0) >= (task.occurrence ?? task.recurrence?.start ?? 0)
						)
							lines[i] =
								lines[i]!.replace(TASK_META_REGEX, '') + taskMetaSuffix({ ...old, cancelled: true });
					}
				}
				const recurrence = isSeries && !following ? meta.recurrence : draft.recurrence;
				const seriesTemplate =
					meta.recurrence && !following
						? (meta.seriesTemplate ?? {
								text: task.text,
								date: task.due,
								time: task.time,
								reminder: task.reminder,
							})
						: undefined;
				const priority = /\s*\[priority::[^\]]+\]/i.exec(task.originalLine)?.[0] ?? '';
				const completion =
					/\s*\[completion::[^\]]+\]/i.exec(task.originalLine)?.[0] ??
					/\s*✅\s*\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?/.exec(task.originalLine)?.[0] ??
					'';
				const prefix = /^(\s*- \[[ xX]\]\s*)/.exec(lines[index]!)?.[1];
				if (!prefix) return raw;
				lines[index] =
					`${prefix}${draft.text.trim()}${draft.date ? ` [due:: ${draft.date}${draft.time ? ` ${draft.time}` : ''}]` : ''}${priority}${completion}${draft.reminder ? ` ⏰ ${draft.reminder}` : ''}${task.originalLine.includes('<!--collapsed-->') ? ' <!--collapsed-->' : ''}${taskMetaSuffix({ ...meta, id: following && meta.recurrence ? crypto.randomUUID() : (meta.id ?? crypto.randomUUID()), deviceId: meta.deviceId ?? deps.deviceId, automation: undefined, recurrence, seriesTemplate, seriesId: following ? undefined : meta.seriesId, occurrence: following ? undefined : meta.occurrence, timezone: recurrence?.timezone ?? meta.timezone })}${task.originalLine.endsWith('\r') ? '\r' : ''}`;
				wrote = true;
				return lines.join('\n');
			});
			if (!wrote) return failure('conflict');
			invalidatePath(app, task.path);
			invalidate();
			await refresh();
			return { status: 'updated' };
		} catch (error) {
			return failure('write-failed', 'failed', String(error));
		}
	}

	async function mutate(task: CalendarTask, checked?: boolean, following = false) {
		if (stopped) return failure('stopped', 'unavailable');
		try {
			if (task.virtual) {
				const real = await materialize(task);
				if (!real) return failure('conflict');
				task = real;
			}
			if (!files.getFileByPath(task.path)) return failure('source-missing', 'unavailable');
			let wrote = false;
			if (checked === undefined && (task.recurrence || task.seriesId)) {
				await files.process(task.path, (raw) => {
					if (raw === null) throw new Error('calendar.source-missing');
					const lines = raw.split('\n'),
						index = lines.indexOf(task.originalLine);
					if (index < 0 || lines.lastIndexOf(task.originalLine) !== index) return raw;
					const ownerId = task.seriesId ?? task.id;
					const before = new Date(`${task.due}T12:00:00Z`);
					before.setUTCDate(before.getUTCDate() - 1);
					for (let i = 0; i < lines.length; i++) {
						const meta = readTaskMeta(lines[i]!);
						if (
							i === index ||
							(following &&
								meta.seriesId === ownerId &&
								(meta.occurrence ?? 0) >= (task.occurrence ?? task.recurrence?.start ?? 0))
						)
							lines[i] =
								lines[i]!.replace(TASK_META_REGEX, '') +
								taskMetaSuffix({
									...meta,
									cancelled: true,
									recurrence:
										following && meta.recurrence
											? { ...meta.recurrence, end: before.toISOString().slice(0, 10) }
											: meta.recurrence,
								});
						else if (following && meta.id === ownerId && meta.recurrence)
							lines[i] =
								lines[i]!.replace(TASK_META_REGEX, '') +
								taskMetaSuffix({
									...meta,
									recurrence: { ...meta.recurrence, end: before.toISOString().slice(0, 10) },
								});
					}
					wrote = true;
					return lines.join('\n');
				});
			} else
				wrote =
					checked === undefined
						? await removeTaskFromFile(app, task)
						: await toggleTaskInFile(app, { ...task }, checked, (line) => {
								line = withTaskCompletion(line, checked);
								if (checked || !task.reminder) return line;
								const at =
									task.timezone && deps.schedule?.()
										? deps.schedule()!.wallTime(task.reminder, task.timezone)
										: new Date(task.reminder.replace(' ', 'T')).getTime();
								if (at > Date.now()) return line;
								const meta = readTaskMeta(line);
								const seriesTemplate = meta.recurrence
									? (meta.seriesTemplate ?? {
											text: task.text,
											date: task.due,
											time: task.time,
											reminder: task.reminder,
										})
									: meta.seriesTemplate;
								return (
									line.replace(TASK_META_REGEX, '').replace(REMINDER_REGEX, '') +
									taskMetaSuffix({ ...meta, automation: undefined, seriesTemplate })
								);
							});
			if (!wrote) return failure('conflict');
			invalidatePath(app, task.path);
			invalidate();
			const state = await refresh();
			return { status: state.status === 'ready' ? ('updated' as const) : ('written-pending-refresh' as const) };
		} catch (error) {
			return failure('write-failed', 'failed', error instanceof Error ? error.message : String(error));
		}
	}
	return {
		defaultScope: () => ({ boardPath: deps.settings().dashboardFile, filter: deps.settings().calendarTaskFilter }),
		recurrenceFor: (task) =>
			task.recurrence ??
			get().tasks.find((entry) => entry.id === task.seriesId && entry.path === task.path)?.recurrence,
		dayTime: taskDayTime,
		async setFilter(filter) {
			if (stopped || !deps.writeFilter) return false;
			try {
				await deps.writeFilter(filter);
				invalidate();
				return true;
			} catch {
				return false;
			}
		},
		openEditor: deps.edit,
		openRemoval: deps.remove,
		snapshot,
		refresh,
		resolveTarget,
		createTask,
		updateTask,
		invalidate,
		reconcile,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		toggleTask: (task, checked) => mutate(task, checked),
		removeTask: (task, following) => mutate(task, undefined, following),
		async openSource(task, owner) {
			if (task.virtual) task = { ...task, id: task.seriesId, effectKey: undefined };
			for (let attempt = 0; attempt < 2; attempt++) {
				if (owner?.closed) throw new Error('calendar.source-missing');
				const file = files.getFileByPath(task.path);
				if (!file) throw new Error('calendar.source-missing');
				const { mtime, size } = file.stat;
				const content = await files.read(file);
				const current = files.getFileByPath(task.path);
				if (owner?.closed || file.path !== task.path || !current || current !== file)
					throw new Error('calendar.source-missing');
				if (current.stat.mtime !== mtime || current.stat.size !== size) continue;
				const line = locateTaskLine(content, task, mtime);
				if (line === undefined) throw new Error('calendar.source-missing');
				if (isManagedFile(file)) {
					await files.open(task.path, owner);
					return;
				}
				await openNoteAt(app, file, { owner, line });
				return;
			}
			throw new Error('calendar.source-conflict');
		},
		dispose() {
			stopped = true;
			stopFiles();
			for (const state of sources.values()) {
				state.generation++;
				state.views.clear();
			}
			listeners.clear();
			sources.clear();
		},
	};
}
