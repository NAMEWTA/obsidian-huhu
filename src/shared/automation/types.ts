export interface AgentUsage {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number | null;
	known: boolean;
	partial?: boolean;
}
export type NotificationChannelId = 'in-app' | 'system';
export type ScheduleSpec =
	| { kind: 'manual' }
	| { kind: 'once'; at: number }
	| { kind: 'recurring'; expression: string; start: number; timezone?: string };
export interface SourceRef {
	kind: 'dashboard' | 'contacts' | 'widget' | 'task';
	path: string;
	id: string;
}
/** A place in a note a reminder points back to (`line` is 0-based). */
export interface NoteLink {
	path: string;
	line?: number;
}
export interface AgentSessionRef {
	agentId: string;
	sessionId: string;
	cwd: string;
	title: string;
	modifiedAtMs: number;
	accountKey: string;
	transcriptPath?: string;
	terminalId?: string;
}
/** A task-domain command template. Scheduling this action and the task deadline are distinct. */
export interface CreateTaskAction {
	kind: 'create-task';
	text: string;
	timezone: string;
	/** Unset uses the admitted run's local date. */
	date?: string;
	time?: string;
	/** Absolute reminder instant, never inferred from the automation trigger. */
	reminderAt?: number;
}

export type AutomationAction =
	| { kind: 'script'; script: string; cwd: string; shell: 'powershell' | 'bash'; spaceId?: string }
	| { kind: 'obsidian-command'; command: string }
	| { kind: 'open-file'; path: string }
	| { kind: 'open-url'; url: string }
	| { kind: 'notify'; body: string }
	| CreateTaskAction
	| {
			kind: 'agent';
			agentId: string;
			cwd: string;
			prompt: string;
			sessionMode: 'fresh' | 'reuse' | 'specific';
			session?: AgentSessionRef;
			extraArgs?: string;
			/**
			 * The Space the run belongs to. Older definitions have none and stay readable but cannot start until
			 * the user chooses one; it is never filled in from `cwd`, the focused page or a lone Space.
			 */
			spaceId?: string;
	  };
export interface AutomationActionCompletion extends AutomationMessage {
	status: 'succeeded' | 'failed' | 'cancelled' | 'interrupted';
	output?: string;
}
/** A non-terminal action remains owned until its actual completion or cancellation. */
export interface AutomationActionHandle {
	completion: Promise<AutomationActionCompletion>;
	cancel(): Promise<void>;
	open(): Promise<void>;
}
export interface AutomationDefinition {
	/** Removed actions are read-only tombstones; retain their original document until explicit deletion. */
	removedAction?: import('../storage/document-collection').CollectionDocument;
	id: string;
	name: string;
	enabled: boolean;
	deviceId: string;
	revision: number;
	schedule: ScheduleSpec;
	action: AutomationAction;
	channels: NotificationChannelId[];
	notifyOn: 'always' | 'failure' | 'never';
	graceMinutes: number;
	precheck?: { command: string; shell: 'powershell' | 'bash' };
	templateId?: string;
	source?: SourceRef;
	/** The note this automation was made from; opening its notification opens the note. */
	link?: NoteLink;
	createdAt: number;
	updatedAt: number;
}
export type RunStatus =
	'pending' | 'running' | 'unknown' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted' | 'skipped' | 'delivered';
export interface AutomationMessage {
	message: string;
	errorCode?: string;
	errorParams?: Record<string, string | number>;
}
export interface AutomationRun extends AutomationMessage {
	/** A retry is a new attempt at the same effect and destination, not a new scheduled task. */
	retryOf?: string;
	taskDelivery?: AutomationTaskDelivery;
	timeline?: Array<{ phase: 'queued' | 'precheck' | 'launching' | 'submitted' | 'completed'; at: number }>;
	precheckResult?: { exitCode: number | null; timedOut: boolean; output: string };
	invocation?: { request: AgentDispatchRequest; receipt?: AgentDispatchReceipt };
	definition?: AutomationDefinition;
	notificationAttempted?: boolean;
	id: string;
	automationId: string;
	revision: number;
	title: string;
	scheduledFor: number;
	trigger: 'manual' | 'scheduled';
	status: RunStatus;
	startedAt: number;
	endedAt?: number;
	usage?: AgentUsage;
	output?: string;
	terminalId?: string;
	session?: AgentSessionRef;
	source?: SourceRef;
}
export interface AgentDescription {
	id: string;
	title: string;
	enabled: boolean;
	installed?: boolean;
}
export interface AgentRunHandle {
	onRunning?(listener: () => void): () => void;
	terminalId: string;
	session?: AgentSessionRef;
	completion: Promise<{
		status: 'succeeded' | 'failed' | 'cancelled' | 'interrupted';
		message: string;
		errorCode?: string;
		errorParams?: Record<string, string | number>;
		output?: string;
		usage?: AgentUsage;
		session?: AgentSessionRef;
	}>;
}
/** A Space as the automation editor lists it: the stable id is what is stored. */
export interface AgentSpaceChoice {
	id: string;
	name: string;
	directoryLabel: string;
}
export interface AgentRuntimePort {
	/** Active Spaces a definition may bind to; absent when the agent module cannot list them. */
	listSpaces?(): AgentSpaceChoice[];
	/**
	 * The directory a Space-bound terminal action really starts in (so its precheck runs there too). Rejects with the
	 * run's `spaceRequired` / `spaceUnavailable` / `cwdInvalid` error when the binding cannot be honoured.
	 */
	boundCwd?(spaceId: string | undefined, cwd: string): Promise<string>;
	startScript?(action: Extract<AutomationAction, { kind: 'script' }>, run: AutomationRun): Promise<AgentRunHandle>;
	listAgents(): AgentDescription[];
	listSessions(cwd: string): Promise<AgentSessionRef[]>;
	start(
		action: Extract<AutomationAction, { kind: 'agent' }>,
		run: AutomationRun,
		previous?: AutomationRun,
	): Promise<AgentRunHandle>;
	stop(terminalId: string): Promise<void>;
	open(terminalId: string): Promise<void>;
}
export interface AutomationSourcePort {
	list(): Promise<AutomationDefinition[]>;
	save(definition: AutomationDefinition): Promise<void>;
	remove(definition: AutomationDefinition): Promise<void>;
	open(source: SourceRef): Promise<void>;
	createTask(
		action: CreateTaskAction,
		runId: string,
		execution?: AutomationTaskExecution,
	): Promise<AutomationMessage | void>;
}

/** JSON-safe task-domain command checkpoint. No file line or board destination. */
export interface AutomationTaskDelivery {
	effectKey: string;
	date: string;
	timezone: string;
	target?: unknown;
	result?: 'created' | 'already-exists';
	receipt?: { commandId: string; taskId?: string; taskRevision?: number; seriesId?: string; committedAt: number };
}

export interface AutomationTaskExecution {
	run: AutomationRun;
	signal: AbortSignal;
	/** Must finish durably before any write to the resolved destination. */
	checkpoint(this: void, delivery: AutomationTaskDelivery): Promise<void>;
}
export interface AutomationUiPort {
	actions?(): Array<{ id: string; name: string; status?: string; running: boolean; unavailable?: string }>;
	subscribe?(listener: () => void): () => void;
	runAction?(id: string): Promise<void>;
	stopAction?(id: string): Promise<void>;
	openAction?(id: string): Promise<void>;
	open(): Promise<void>;
}
export function isActiveRun(run: AutomationRun): boolean {
	return run.status === 'pending' || run.status === 'running' || run.status === 'unknown';
}
import type { AgentDispatchRequest, AgentDispatchReceipt } from '../agent-dispatch';
