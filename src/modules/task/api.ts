/** Public task-domain contracts. No UI, repository implementation or startup side effects. */
import { serviceKey } from '../../app/contracts/module';
import type {
	TaskCommand,
	TaskDraft,
	TaskEvent,
	TaskPage,
	TaskQuery,
	TaskResource,
	TaskResourceResolution,
	TaskResult,
	TaskSeries,
	TaskSnapshot,
	TaskView,
} from './core/model';
export type {
	Task,
	TaskCommand,
	TaskDraft,
	TaskDue,
	TaskFields,
	TaskFilter,
	TaskPage,
	TaskQuery,
	TaskResource,
	TaskResourceResolution,
	TaskResult,
	TaskSeries,
	TaskSnapshot,
	TaskView,
	TaskErrorCode,
} from './core/model';

export interface TaskService {
	snapshot(this: void): TaskSnapshot;
	subscribe(this: void, listener: () => void): () => void;
	refresh(): Promise<TaskSnapshot>;
	query(query?: TaskQuery): TaskPage;
	get(id: string): TaskView | undefined;
	getSeries(id: string): TaskSeries | undefined;
	history(id?: string, offset?: number, limit?: number): readonly TaskEvent[];
	/** Future occurrences are explicit read-only projections, not persisted tasks. */
	preview(from: string, to: string): readonly TaskView[];
	/** Captures caller-owned command data synchronously; the signal stays live until commit. */
	execute(command: TaskCommand, signal?: AbortSignal): Promise<TaskResult>;
	reconcile(): Promise<void>;
}
export interface TaskResources {
	search(text: string, kind?: TaskResource['kind']): Promise<readonly TaskResourceResolution[]>;
	resolve(resource: TaskResource): Promise<TaskResourceResolution>;
	open(resource: TaskResource, owner?: Window): Promise<void>;
}
export interface TaskViews {
	edit(request: {
		owner: HTMLElement;
		id?: string;
		draft?: Partial<TaskDraft>;
		onSaved?(this: void): void;
	}): Promise<void>;
	mount(host: HTMLElement, options?: { compact?: boolean; signal?: AbortSignal }): () => void;
	open(id?: string, owner?: Window): Promise<void>;
}
export interface TaskToolDescriptor {
	name: string;
	description: string;
	inputSchema: Readonly<Record<string, unknown>>;
	outputSchema: Readonly<Record<string, unknown>>;
	annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean };
}
/** Grants come from the host, never from the model's tool arguments. No grant means no access. */
export interface TaskToolContext {
	grants: readonly ('task:read' | 'task:write')[];
	signal?: AbortSignal;
}
export interface TaskTools {
	readonly version: 1;
	list(): readonly TaskToolDescriptor[];
	call(name: string, arguments_: unknown, context: TaskToolContext): Promise<unknown>;
}
export const TASKS = serviceKey<TaskService>('task', 'tasks');
export const TASK_RESOURCES = serviceKey<TaskResources>('task', 'resources');
export const TASK_VIEWS = serviceKey<TaskViews>('task', 'views');
export const TASK_TOOLS = serviceKey<TaskTools>('task', 'tools');

import type {
	CalendarTask,
	CalendarScope,
	CalendarSnapshot,
	CalendarTaskFilter,
	CalendarTaskInput,
	CalendarCreateResult,
	CalendarMutationResult,
} from './core/calendar';
export type {
	CalendarTask,
	CalendarScope,
	CalendarSnapshot,
	CalendarTaskFilter,
	CalendarTaskInput,
	CalendarCreateResult,
	CalendarMutationResult,
	CalendarFailure,
} from './core/calendar';
/** Date-grid adapter, not a second task repository. Source opening goes to the task workbench. */
export interface TaskCalendarService {
	defaultScope(): CalendarScope;
	dayTime(task: CalendarTask, iso: string): string | undefined;
	setFilter(filter: CalendarTaskFilter): Promise<boolean>;
	snapshot(scope?: CalendarScope): CalendarSnapshot;
	subscribe(this: void, listener: () => void): () => void;
	refresh(scope?: CalendarScope): Promise<CalendarSnapshot>;
	createTask(input: CalendarTaskInput): Promise<CalendarCreateResult>;
	toggleTask(task: CalendarTask, checked: boolean): Promise<CalendarMutationResult>;
	removeTask(task: CalendarTask, following?: boolean): Promise<CalendarMutationResult>;
	openEditor(request: {
		task?: CalendarTask;
		date?: string;
		text?: string;
		owner: HTMLElement;
		onSaved?(this: void): void;
	}): Promise<void>;
	openRemoval(request: { task: CalendarTask; owner: HTMLElement }): Promise<void>;
	openSource(
		task: Pick<CalendarTask, 'id'> & Partial<Pick<CalendarTask, 'virtual' | 'seriesId'>>,
		owner?: Window,
	): Promise<void>;
}
export const TASK_CALENDAR = serviceKey<TaskCalendarService>('task', 'calendar');
