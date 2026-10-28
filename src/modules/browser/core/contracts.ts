/** Browser-owned domain and process ports. No renderer, Electron or Agent-session objects. */
export type SpaceKind = 'personal' | 'task';
export type Retention = 'persistent' | 'ephemeral';
export type SpaceStatus =
	| 'provisioning'
	| 'starting'
	| 'hydrating'
	| 'ready'
	| 'closing'
	| 'stopped'
	| 'faulted'
	| 'quarantined'
	| 'cleanup_pending';
export type ControlMode = 'paused' | 'agent' | 'human' | 'quiescing' | 'blocked';
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface ControlLease {
	spaceId: string;
	runtimeId: string;
	epoch: number;
	leaseId: string;
	controllerId: string;
	mode: 'agent' | 'human' | 'workspace';
	expiresAt: number;
	viewerId?: string;
	windowId?: string;
}
export interface BrowserPage {
	id: string;
	spaceId: string;
	url: string;
	title: string;
	documentId: string;
	status: 'pending' | 'open' | 'failed' | 'closed';
	error?: string;
	zoom: number;
	viewportVersion: number;
}
export interface BrowserSpace {
	id: string;
	label: string;
	kind: SpaceKind;
	retention: Retention;
	status: SpaceStatus;
	runtimeId?: string;
	identityVersionId?: string;
	identityImport?: import('./identity').IdentityProvisionProgress;
	pages: BrowserPage[];
	control: { mode: ControlMode; epoch: number; lease?: ControlLease };
	createdAt: number;
	updatedAt: number;
	error?: string;
}
export interface BrowserRun {
	id: string;
	spaceId: string;
	runtimeId: string;
	issuerId: string;
	epoch: number;
	leaseId: string;
	state: 'active' | 'revoked' | 'stopped';
	expiresAt: number;
	externalTaskId?: string;
}
export interface RunGrant {
	run: BrowserRun;
	capability: string;
}
export interface PendingHumanRequest {
	id: string;
	spaceId: string;
	pageId: string;
	runtimeId: string;
	documentId: string;
	epoch: number;
	revision: number;
	kind: 'dialog' | 'file-chooser' | 'permission' | 'http-auth';
	message: string;
	expiresAt: number;
	status: 'pending' | 'denied' | 'resolved';
}
export interface BrowserFrame {
	spaceId: string;
	pageId: string;
	runtimeId: string;
	documentId: string;
	epoch: number;
	viewportVersion: number;
	frameId: string;
	width: number;
	height: number;
	cssWidth: number;
	cssHeight: number;
	mime: 'image/jpeg' | 'image/png';
	data: Uint8Array;
	capturedAt: number;
	inputSequence: number;
}
export type HumanInput =
	| { kind: 'click'; x: number; y: number; button?: 'left' | 'right' | 'middle'; clickCount?: 1 | 2 }
	| { kind: 'scroll'; x: number; y: number; deltaX: number; deltaY: number }
	| { kind: 'key'; key: string; modifiers?: number }
	| { kind: 'composition'; phase: 'start' | 'update' | 'end' | 'cancel'; text: string; selectionStart: number; selectionEnd: number }
	| { kind: 'text'; text: string };
export interface HumanPageRequest {
	spaceId: string;
	pageId: string;
	viewerId: string;
	leaseId: string;
	epoch: number;
}
export interface SnapshotNode {
	ref: string;
	frameId: string;
	role: string;
	name: string;
	value?: string;
	visible: boolean;
	/** Frame-local document CSS coordinates, never top-level input coordinates. */
	bounds?: { x: number; y: number; width: number; height: number };
}
/** Omitted fields select all frames, semantic mode, 512 nodes and a 64 KiB JSON result budget.
 * Budgets are 1–512 nodes and 1024–65536 bytes including coverage metadata; if metadata alone
 * cannot fit, observation rejects with browser_observation_budget_too_small.
 * rootRef is a still-valid opaque ref from this Page, and restricts observation to its DOM subtree.
 */
export interface SnapshotOptions {
	frameId?: string;
	rootRef?: string;
	mode?: 'interactive' | 'semantic' | 'visible';
	maxNodes?: number;
	maxBytes?: number;
}
export interface SnapshotScope extends SnapshotOptions {
	spaceId: string;
	pageId: string;
	mode: 'interactive' | 'semantic' | 'visible';
	maxNodes: number;
	maxBytes: number;
}
export interface SnapshotFrameCoverage {
	frameId: string;
	documentId: string;
	status: 'complete' | 'partial' | 'failed' | 'omitted';
	nodes: number;
}
export interface SnapshotFrameError {
	frameId: string;
	code: 'frame_unavailable' | 'frame_tree_unavailable' | 'accessibility_unavailable' | 'dom_unavailable' | 'closed_shadow_root' | 'budget_exceeded';
}
export interface BrowserObservation {
	id: string;
	spaceId: string;
	pageId: string;
	runtimeId: string;
	documentId: string;
	epoch: number;
	viewportVersion: number;
	scope: SnapshotScope;
	coverage: SnapshotFrameCoverage[];
	frameErrors: SnapshotFrameError[];
	url: string;
	title: string;
	nodes: SnapshotNode[];
	text?: string;
	truncated: boolean;
}
/** All executable page actions are fixed code. Raw JS/CDP and host paths have no public variant. */
export type BrowserCommand =
	| { kind: 'navigate'; url: string }
	| { kind: 'back' | 'forward' | 'reload' | 'stop' | 'text' | 'selection' | 'screenshot' }
	| { kind: 'snapshot'; scope?: SnapshotOptions }
	/** Trusted human material capture only; excluded from Agent command schema. */
	| { kind: 'material'; observationId: string; ref: string }
	| { kind: 'find'; text: string; forward?: boolean }
	| { kind: 'click'; observationId: string; ref: string }
	| { kind: 'fill' | 'type'; observationId: string; ref: string; text: string }
	| { kind: 'select'; observationId: string; ref: string; values: string[] }
	| {
			kind: 'wait';
			condition: { kind: 'url'; url: string } | { kind: 'text'; text: string } | { kind: 'load' };
			timeoutMs: number;
	  }
	| { kind: 'press'; key: string; modifiers?: number }
	| { kind: 'scroll'; x: number; y: number; deltaX: number; deltaY: number }
	| { kind: 'zoom'; factor: number }
	| { kind: 'viewport'; width: number; height: number }
	| { kind: 'input'; input: HumanInput; inputSequence: number }
	| { kind: 'dialog'; requestId: string; revision: number; accept: boolean; text?: string }
	| { kind: 'chooser'; requestId: string; revision: number; fileIds: string[] }
	| { kind: 'upload'; observationId: string; ref: string; fileIds: string[] };

export interface RuntimePage {
	id: string;
	url: string;
	title: string;
	documentId: string;
	zoom: number;
	viewportVersion: number;
}
export interface RevocationAck {
	runtimeId: string;
	epoch: number;
	lastDispatchedSequence: number;
	transportState: 'open' | 'closed';
}
export type RuntimeEvent =
	| { kind: 'page'; runtimeId: string; page: RuntimePage }
	| { kind: 'page-closed'; runtimeId: string; pageId: string }
	| { kind: 'frame'; frame: BrowserFrame }
	| { kind: 'request'; request: PendingHumanRequest }
	| { kind: 'request-resolved'; runtimeId: string; requestId: string }
	| {
			kind: 'download';
			runtimeId: string;
			pageId: string;
			epoch: number;
			controllerId: string;
			id: string;
			name: string;
			received: number;
			total: number;
			state: 'progressing' | 'completed' | 'cancelled';
	  }
	| { kind: 'fault'; runtimeId: string; code: string };

/** Cookie seed stays on trusted internal ports; never part of workspace snapshots or Agent protocol. */
export interface RuntimeCookie {
	name: string;
	value: string;
	domain: string;
	path: string;
	secure: boolean;
	httpOnly: boolean;
	sameSite?: 'Strict' | 'Lax' | 'None';
	expires?: number;
	hostOnly?: boolean;
	session?: boolean;
	priority?: 'Low' | 'Medium' | 'High';
	sourceScheme?: 'Unset' | 'NonSecure' | 'Secure';
	sourcePort?: number;
	partitionKey?: { topLevelSite: string; hasCrossSiteAncestor: boolean };
}
export interface RuntimeIdentityState {
	cookies: RuntimeCookie[];
}
export interface BrowserRuntime {
	readonly id: string;
	readonly spaceId: string;
	onEvent(listener: (event: RuntimeEvent) => void): () => void;
	setControl(lease: ControlLease | undefined, epoch: number): Promise<RevocationAck>;
	createPage(pageId: string, url: string, authority?: ControlLease): Promise<RuntimePage>;
	closePage(pageId: string, authority: ControlLease): Promise<void>;
	execute(
		pageId: string,
		command: BrowserCommand,
		authority: ControlLease,
		options?: { uploadPaths?: string[] },
	): Promise<JsonValue>;
	observe(pageId: string, authority: ControlLease, scope?: SnapshotOptions): Promise<BrowserObservation>;
	watch(pageId: string, enabled: boolean): Promise<void>;
	readIdentity(): Promise<RuntimeIdentityState>;
	writeIdentity(seed: RuntimeIdentityState): Promise<void>;
	cancelDownload(id: string): Promise<void>;
	stop(): Promise<void>;
}
export interface RuntimeAvailability {
	state: 'ready' | 'missing' | 'unsupported' | 'invalid';
	code?: string;
	version?: string;
	platform?: string;
}
export interface BrowserRuntimeFactory {
	availability(): Promise<RuntimeAvailability>;
	start(options: {
		spaceId: string;
		runtimeId: string;
		ephemeral: boolean;
		purpose?: 'space' | 'staging';
	}): Promise<BrowserRuntime>;
	reclaim(spaceId: string, runtimeId?: string): Promise<void>;
	removeProfile(spaceId: string): Promise<void>;
	installBundle(): Promise<void>;
	dispose(): Promise<void>;
}
export interface BrowserWorkspaceState {
	ready: boolean;
	readOnly: boolean;
	availability: RuntimeAvailability;
	persistence: 'secure' | 'unavailable';
	ephemeralConsent: boolean;
	spaces: BrowserSpace[];
	requests: PendingHumanRequest[];
	cleanupPending: number;
	identityRefreshPending?: boolean;
	error?: string;
}
export interface BrowserReadableStore<T> {
	getState(): T;
	subscribe(listener: () => void): () => void;
}
export interface CreateSpaceRequest {
	/** Trusted local UI cancellation only; never included in ledger payloads or RPC schemas. */
	signal?: AbortSignal;
	kind: SpaceKind;
	label?: string;
	identityVersionId?: string;
	ephemeral?: boolean;
	url?: string;
}
export type OperationState =
	'prepared' | 'dispatching' | 'completed' | 'rejected' | 'failed' | 'cancelled_before_dispatch' | 'outcome_unknown';
export interface OperationScope {
	principal: 'agent' | 'human' | 'workspace';
	issuerId: string;
	/** Concrete grant/lease incarnation; never reused after that authority stops being writable. */
	authorityId?: string;
	spaceId?: string;
	pageId?: string;
	runtimeId?: string;
	epoch?: number;
}
export interface OperationRecord {
	id: string;
	requestId: string;
	digest: string;
	scope: OperationScope;
	state: OperationState;
	createdAt: number;
	updatedAt: number;
	/** Absent only on legacy UUID tickets. New tickets are issued monotonically per scope/issuer. */
	sequence?: number;
	expiresAt?: number;
	error?: string;
	result?: JsonValue;
}
export interface BrowserPersistence {
	readonly readOnly: boolean;
	readonly ownerId: string;
	initialize(): Promise<void>;
	security(): Promise<'secure' | 'unavailable'>;
	id(): string;
	digest(value: string): Promise<string>;
	read<T>(key: string): Promise<T | undefined>;
	write(key: string, value: unknown): Promise<void>;
	remove(key: string): Promise<void>;
	keys(prefix: string): Promise<string[]>;
	dispose(): Promise<void>;
}
export interface FrameSubscription {
	ack(frameId: string): void;
	dispose(): void;
}
export type BrowserEventType = 'spaceChanged' | 'pageChanged' | 'controlChanged' | 'operationChanged' | 'humanRequest' | 'downloadChanged' | 'runtimeFault' | 'cleanupChanged';
export type BrowserEventState = SpaceStatus | ControlMode | OperationState | BrowserPage['status'] | 'denied' | 'resolved' | 'progressing' | 'cancelled' | 'removed' | 'revoked';
export interface BrowserOperationSummary {
	id: string;
	state: OperationState;
	updatedAt: number;
	sequence?: number;
}
/** Metadata only: no page text, URL/title, request message, filename, command or credential. */
export interface BrowserRunEvent {
	eventId: string;
	streamId: string;
	streamSequence: number;
	/** Monotonic projection version within this stream; a new stream establishes a new version namespace. */
	entityVersion: number;
	sequence: number;
	at: number;
	type: BrowserEventType;
	/** Existing page/page-closed kinds remain readable; type is the canonical projection notification. */
	kind: BrowserEventType | 'page' | 'page-closed';
	spaceId: string;
	runtimeId: string;
	epoch: number;
	entityId?: string;
	pageId?: string;
	state?: BrowserEventState;
	code?: 'runtime_fault';
}
export interface BrowserEventSnapshot {
	runId: string;
	spaceId: string;
	runtimeId: string;
	runEpoch: number;
	generation: number;
	active: boolean;
	streamId: string;
	cursor: number;
	space: { status: SpaceStatus | 'removed'; kind: SpaceKind };
	control: { mode: ControlMode; epoch: number };
	cleanup: { state: 'pending' | 'failed' | 'completed' };
	pages: Array<Pick<BrowserPage, 'id' | 'documentId' | 'status' | 'viewportVersion'>>;
	requests: Array<Pick<PendingHumanRequest, 'id' | 'pageId' | 'kind' | 'status' | 'revision' | 'expiresAt'>>;
	downloads: Array<{ id: string; pageId: string; state: 'in-progress' | 'completed' | 'canceled' | 'failed'; receivedBytes: number; totalBytes: number }>;
	operations: BrowserOperationSummary[];
}
export interface BrowserRunHealth {
	runId: string;
	runtimeId: string;
	epoch: number;
	eventCursor: number;
	pages: number;
	viewers: number;
	framesReceived: number;
	framesReplaced: number;
	queuedFrameBytes: number;
	pendingRequests: number;
}
export class AgentBrowserError extends Error {
	constructor(public readonly code: string) {
		super(code);
		this.name = 'AgentBrowserError';
	}
}
export function browserErrorCode(error: unknown): string {
	return error instanceof AgentBrowserError ? error.code : 'operation_failed';
}
