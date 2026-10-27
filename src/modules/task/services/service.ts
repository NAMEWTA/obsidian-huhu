import {
	TaskError,
	emptyTaskState,
	type TaskCommand,
	type TaskRepository,
	type TaskResult,
	type TaskSchedule,
	type TaskSnapshot,
	type TaskState,
} from '../core/model';
import { applyTaskCommand } from '../core/commands';
import { queryTasks, taskView } from '../core/query';
import { catchupPending, previewOccurrences, reconcileOccurrences } from '../core/recurrence';
import { renamedResource, validResourcePath } from '../core/resources';
import type { TaskService } from '../api';

export interface TaskServiceDeps {
	repository: TaskRepository;
	deviceId: string;
	now?(this: void): number;
	schedule?(): TaskSchedule | undefined;
	remindersAvailable?(): boolean;
	report?(error: unknown): void;
}
export interface OwnedTaskService extends TaskService {
	load(): Promise<void>;
	tick(): void;
	renameResource(oldPath: string, path: string): Promise<void>;
	dispose(): Promise<void>;
}
export function createTaskService(deps: TaskServiceDeps): OwnedTaskService {
	const clock = deps.now ?? Date.now,
		listeners = new Set<() => void>();
	let state: TaskState = emptyTaskState(),
		closed = false,
		tail: Promise<unknown> = Promise.resolve();
	let snapshot: TaskSnapshot = {
		status: 'loading',
		revision: 0,
		now: clock(),
		capabilities: { recurrence: false, reminders: false },
		catchupPending: false,
	};
	function notify() {
		for (const listener of [...listeners]) {
			try {
				listener();
			} catch (error) {
				deps.report?.(error);
			}
		}
	}
	function publish(status: TaskSnapshot['status'] = 'ready', error?: TaskSnapshot['error']) {
		if (closed && status !== 'unavailable') return;
		snapshot = {
			status,
			revision: snapshot.revision + 1,
			now: clock(),
			error,
			capabilities: { recurrence: !!deps.schedule?.(), reminders: deps.remindersAvailable?.() ?? false },
			catchupPending: catchupPending(state, clock()),
		};
		notify();
	}
	function running(signal?: AbortSignal) {
		if (closed) throw new TaskError('unavailable');
		if (signal?.aborted) throw new TaskError('cancelled');
	}
	const failure = (error: unknown): Extract<TaskResult, { ok: false }> => {
		const cause =
			error instanceof TaskError
				? error
				: new TaskError('write-failed', error instanceof Error ? error.message : 'Task operation failed');
		return {
			ok: false,
			error: { code: cause.code, message: cause.message, currentRevision: cause.currentRevision },
		};
	};
	const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
		const result = tail.then(work);
		tail = result.catch(() => undefined);
		return result;
	};
	async function refresh() {
		await enqueue(async () => {
			try {
				running();
				const next = await deps.repository.read();
				running();
				state = next;
				publish();
			} catch (error) {
				publish('error', failure(error).error);
			}
		});
		return snapshot;
	}
	return {
		load: async () => {
			await refresh();
		},
		refresh,
		snapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		query: (query) => queryTasks(Object.values(state.tasks), query, clock()),
		get(id) {
			const task = Object.hasOwn(state.tasks, id) ? state.tasks[id] : undefined;
			return task ? taskView(task, clock()) : undefined;
		},
		getSeries(id) {
			return Object.hasOwn(state.series, id) ? structuredClone(state.series[id]) : undefined;
		},
		history(id, offset = 0, limit = 100) {
			if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 500)
				throw new TaskError('invalid-input');
			return structuredClone(
				state.events
					.filter((event) => !id || event.taskId === id || event.seriesId === id)
					.slice()
					.reverse()
					.slice(offset, offset + limit),
			);
		},
		preview(from, to) {
			return previewOccurrences(state, deps.schedule?.(), from, to).map((task) => ({
				...taskView(task, clock()),
				virtual: true,
				seriesRevision: state.series[task.seriesId!]!.revision,
			}));
		},
		async execute(command: TaskCommand, signal?: AbortSignal): Promise<TaskResult> {
			return enqueue(async () => {
				try {
					running(signal);
					let applied: ReturnType<typeof applyTaskCommand> | undefined;
					const next = await deps.repository.transact((latest) => {
						running(signal);
						applied = applyTaskCommand(latest, command, {
							now: clock(),
							deviceId: deps.deviceId,
							schedule: deps.schedule?.(),
						});
					});
					// The transaction is the commit point. Disposal after commit cannot turn it into a failed write.
					state = next;
					publish();
					const { receipt, replayed } = applied!;
					return {
						ok: true,
						receipt: structuredClone(receipt),
						replayed,
						task: receipt.taskId ? structuredClone(state.tasks[receipt.taskId]) : undefined,
						series: receipt.seriesId ? structuredClone(state.series[receipt.seriesId]) : undefined,
					};
				} catch (error) {
					const result = failure(error);
					if (['corrupt-store', 'missing-store', 'write-failed'].includes(result.error.code))
						publish('error', result.error);
					return result;
				}
			});
		},
		async reconcile() {
			return enqueue(async () => {
				const engine = deps.schedule?.();
				if (closed || !engine || !Object.keys(state.series).length) return;
				try {
					state = await deps.repository.transact((latest) => {
						running();
						reconcileOccurrences(latest, engine, clock());
					});
					publish();
				} catch (error) {
					publish('error', failure(error).error);
				}
			});
		},
		tick() {
			if (!closed) publish(snapshot.status, snapshot.error);
		},
		async renameResource(oldPath, path) {
			if (!validResourcePath(oldPath) || !validResourcePath(path) || oldPath === path || closed) return;
			await enqueue(async () => {
				try {
					state = await deps.repository.transact((latest) => {
						running();
						for (const task of Object.values(latest.tasks)) {
							const relations = task.relations.map((resource) =>
								renamedResource(resource, oldPath, path),
							);
							if (JSON.stringify(relations) === JSON.stringify(task.relations)) continue;
							task.relations = relations;
							task.updatedAt = clock();
							task.revision++;
							latest.events.push({ at: clock(), kind: 'resource-renamed', taskId: task.id });
						}
						for (const series of Object.values(latest.series)) {
							const relations = series.template.relations.map((resource) =>
								renamedResource(resource, oldPath, path),
							);
							if (JSON.stringify(relations) !== JSON.stringify(series.template.relations)) {
								series.template.relations = relations;
								series.updatedAt = clock();
								series.revision++;
							}
						}
					});
					publish();
				} catch (error) {
					publish('error', failure(error).error);
				}
			});
		},
		async dispose() {
			closed = true;
			publish('unavailable');
			listeners.clear();
			await tail;
		},
	};
}
