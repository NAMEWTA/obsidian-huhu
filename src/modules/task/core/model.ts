/** The task domain's JSON-safe public vocabulary. UI, tools and calendars share it. */
export type TaskStatus = 'open' | 'completed' | 'cancelled';
export interface TaskDue {
	date: string;
	time?: string;
}
export type TaskResource = { kind: 'file' | 'folder'; path: string } | { kind: 'archive'; id: string };
export interface TaskFields {
	title: string;
	description: string;
	timezone: string;
	due?: TaskDue;
	planDate?: string;
	reminderAt?: number;
	relations: TaskResource[];
}
export interface TaskRecurrence {
	expression: string;
	start: number;
	/** Inclusive local last date; never a timezone-less instant. */
	end?: string;
}
export interface TaskDraft extends TaskFields {
	recurrence?: TaskRecurrence;
}
export interface Task extends TaskFields {
	id: string;
	revision: number;
	status: TaskStatus;
	createdAt: number;
	updatedAt: number;
	completedAt?: number;
	cancelledAt?: number;
	deviceId: string;
	seriesId?: string;
	occurrenceAt?: number;
}
export interface TaskSeries {
	id: string;
	revision: number;
	template: TaskFields;
	rule: TaskRecurrence;
	deviceId: string;
	createdAt: number;
	updatedAt: number;
	/** Exclusive occurrence cutoff, used by "this and following". */
	until?: number;
	nextAt: number | null;
	stopped: boolean;
}
export type TaskCommand =
	| { kind: 'create'; commandId: string; draft: TaskDraft }
	| { kind: 'update'; commandId: string; id: string; expectedRevision: number; fields: TaskFields }
	| { kind: 'complete' | 'reopen' | 'cancel'; commandId: string; id: string; expectedRevision: number }
	| { kind: 'update-series'; commandId: string; id: string; expectedRevision: number; draft: TaskDraft; from: number }
	| { kind: 'cancel-series'; commandId: string; id: string; expectedRevision: number; from: number }
	| { kind: 'materialize'; commandId: string; id: string; expectedRevision: number; at: number };
export interface TaskReceipt {
	commandId: string;
	kind: TaskCommand['kind'];
	taskId?: string;
	taskRevision?: number;
	seriesId?: string;
	committedAt: number;
}
export interface TaskEvent {
	at: number;
	kind: TaskCommand['kind'] | 'occurrence' | 'resource-renamed';
	taskId?: string;
	seriesId?: string;
	commandId?: string;
	previousDue?: TaskDue;
	due?: TaskDue;
}
export interface TaskState {
	version: 1;
	revision: number;
	tasks: Record<string, Task>;
	series: Record<string, TaskSeries>;
	receipts: Record<string, { fingerprint: string; receipt: TaskReceipt }>;
	events: TaskEvent[];
}
export type TaskErrorCode =
	| 'invalid-input'
	| 'not-found'
	| 'conflict'
	| 'idempotency-conflict'
	| 'invalid-transition'
	| 'schedule-unavailable'
	| 'corrupt-store'
	| 'missing-store'
	| 'write-failed'
	| 'unavailable'
	| 'forbidden'
	| 'cancelled';
export class TaskError extends Error {
	constructor(
		readonly code: TaskErrorCode,
		message: string = code,
		readonly currentRevision?: number,
	) {
		super(message);
		this.name = 'TaskError';
	}
}
export type TaskResult =
	| { ok: true; receipt: TaskReceipt; replayed: boolean; task?: Task; series?: TaskSeries }
	| { ok: false; error: { code: TaskErrorCode; message: string; currentRevision?: number } };
export type TaskFilter = 'all' | 'open' | 'completed' | 'overdue';
export interface TaskQuery {
	filter?: TaskFilter;
	text?: string;
	/** Date filtering/sorting defaults to the effective handling day, not creation time. */
	timeField?: 'effectiveDate' | 'due' | 'createdAt' | 'reminderAt' | 'completedAt';
	from?: string;
	to?: string;
	related?: TaskResource;
	recursive?: boolean;
	includeCancelled?: boolean;
	order?: 'asc' | 'desc';
	offset?: number;
	limit?: number;
}
export interface TaskView extends Task {
	overdue: boolean;
	overdueDays: number;
	effectiveDate?: string;
	virtual?: boolean;
	/** Template revision attached to a read-only occurrence projection. */
	seriesRevision?: number;
}
export interface TaskPage {
	items: readonly TaskView[];
	total: number;
	offset: number;
	limit: number;
	nextOffset?: number;
	counts: { all: number; open: number; completed: number; overdue: number };
}
export interface TaskSnapshot {
	status: 'loading' | 'ready' | 'error' | 'unavailable';
	revision: number;
	now: number;
	capabilities: { recurrence: boolean; reminders: boolean };
	catchupPending: boolean;
	error?: { code: TaskErrorCode; message: string };
}
export interface TaskResourceResolution {
	resource: TaskResource;
	status: 'available' | 'missing' | 'unavailable';
	label: string;
	path?: string;
}
export interface TaskSchedule {
	validate(rule: TaskRecurrence, timezone: string): void;
	next(rule: TaskRecurrence, timezone: string, after: number): number | null;
}
export interface TaskRepository {
	read(): Promise<TaskState>;
	/** The callback sees the latest committed state and must be synchronous. */
	transact(change: (latest: TaskState) => void): Promise<TaskState>;
}
export const emptyTaskState = (): TaskState => ({
	version: 1,
	revision: 0,
	tasks: {},
	series: {},
	receipts: {},
	events: [],
});
