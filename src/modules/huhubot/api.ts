import { serviceKey } from '../../app/contracts/module';

/** Decimal strings preserve SQLite's 64-bit sequence/revision precision in JavaScript. */
export type Decimal = string;
export type BotErrorKind =
	| 'INVALID_ARGUMENT'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'SESSION_BUSY'
	| 'RUN_TERMINAL'
	| 'IDEMPOTENCY_CONFLICT'
	| 'CAPABILITY_DENIED'
	| 'APPROVAL_EXPIRED'
	| 'HOST_UNAVAILABLE'
	| 'SOURCE_CHANGED'
	| 'UNSAVED_EDITOR_CHANGES'
	| 'MODEL_UNAVAILABLE'
	| 'RESOURCE_LIMIT'
	| 'UNKNOWN_EFFECT'
	| 'RECOVERY_BLOCKED'
	| 'INSTANCE_CONFLICT'
	| 'PROTOCOL_INCOMPATIBLE'
	| 'CURSOR_EXPIRED'
	| 'STREAM_SLOW_CONSUMER';
export interface BotErrorData {
	kind: BotErrorKind;
	reason: string;
	retryable: boolean;
	correlationId: string;
	details?: EventCursorRecovery;
}
export interface CallOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
}
export interface ProfileMetadata {
	profileId: string;
	commandEpoch: Decimal;
	revision: Decimal;
	createdAt: string;
}
export interface HelloRequest {
	protocolVersion: '0.1';
	client: { name: string; version: string };
}
export interface RuntimePolicyStatus {
	limits: ExecutionLimits;
	budgetConfigured: boolean;
	budgetPaused: boolean;
}
export interface HelloResult {
	policy?: RuntimePolicyStatus;
	protocolVersion: '0.1';
	buildVersion: string;
	schemaVersion: number;
	profile: ProfileMetadata;
	capabilities: string[];
	limits: { maxFrameBytes: number; maxBatchItems: number };
}
export interface CleanupStatus {profile:boolean;sessionIds:string[]}
export interface ServiceStatus {
 cleanup?: CleanupStatus;
	policy?: RuntimePolicyStatus;
	schemaVersion: number;
	state: 'ready';
	profile: ProfileMetadata;
	hostAttached: boolean;
}
export interface ServiceDiagnostics {
	protocolVersion: string;
	schemaVersion: number;
	activeConnections: number;
	hostAttached: boolean;
}
export interface CommandMeta {
	commandId: string;
	idempotencyKey: string;
	profileId: string;
	commandEpoch: Decimal;
	expectedRevision?: Decimal;
}
export interface Receipt {
	commandId: string;
	receiptId: string;
	revision: Decimal;
}
export interface PageQuery {
	profileId: string;
	cursor?: string;
	limit?: number;
}
export interface IdQuery {
	profileId: string;
	id: string;
}
export interface Page<T> {
	items: T[];
	nextCursor?: string;
}
export interface SourceRef {
	resourceId: string;
	revision?: Decimal;
	title?: string;
	hash?: string;
	originViewId?: string;
	workspaceId?: string;
}
export interface SourceIdentity {
	resourceId: string;
	workspaceId: string;
	originClientId: string;
	originViewId: string;
	hostConnectionId: string;
	hostLeaseId: string;
	hostLeaseEpoch: Decimal;
	revision: Decimal;
	hash: string;
	title?: string;
}
export interface SourceRange {
	start: number;
	end: number;
}
export interface SourceSnapshot extends SourceIdentity {
	kind: 'note' | 'selection';
	scopeResourceIds: string[];
	range?: SourceRange;
}
export interface SourceScope extends SourceIdentity {
	kind: 'folder' | 'vault';
}
export interface SourceOpenResult {
	source: SourceSnapshot;
	changed: boolean;
}
export interface ArtifactRef {
	artifactId: string;
	mediaType: string;
	size: Decimal;
}
export interface CredentialStatus {
	mode: 'protected' | 'session-memory' | 'none';
	state: 'available' | 'missing' | 'failed' | 'unknown';
	reason?: string;
}
export interface ModelBindingDraft {
	modelId: string;
	providerId: string;
	endpoint: string;
	credentialRef?: string;
	capabilities: string[];
	protocol: 'openai-chat-completions' | 'openai-responses' | 'anthropic-messages';
}
export interface ModelBinding extends ModelBindingDraft {
	revision: Decimal;
	credentialStatus: CredentialStatus;
}
export interface AgentDraft {
	name: string;
	description: string;
	persona: string;
	model?: ModelBindingDraft;
	allowedTools?: string[];
	allowedCollaborationTargets?: string[];
}
export interface Agent extends AgentDraft {
	model?: ModelBinding;
	isDefault: boolean;
	id: string;
	revision: Decimal;
	personaRevision: Decimal;
	modelBindingRevision: Decimal;
	enabled: boolean;
}
export interface ModelInfo extends ModelBinding {
	capabilities: string[];
	available: boolean;
}
export interface GroupHistoryScope {
	kind: 'none' | 'range';
	afterSeq?: Decimal;
	throughSeq?: Decimal;
}
export interface GroupMemberIdentity {
	agentId: string;
	incarnation: Decimal;
	historyRevision: Decimal;
}
export interface GroupMember extends GroupMemberIdentity {
	historyScope: GroupHistoryScope;
}
export interface GroupBinding {
	sessionId: string;
	members: GroupMemberIdentity[];
}
export interface Session {
	groupMembers?: GroupMember[];
	id: string;
	revision: Decimal;
	kind: 'direct' | 'group';
	title: string;
	memberIds: string[];
	coordinatorId?: string;
	archived: boolean;
	workspaceId?: string;
}
export interface MessageAttachments {
	sourceRefs: SourceSnapshot[];
	sourceScopes: SourceScope[];
}
export interface VisibleMessage {
	attachments?: MessageAttachments;
	seq?: Decimal;
	runId?: string;
	id: string;
	sessionId: string;
	role: 'user' | 'assistant' | 'system';
	text: string;
	createdAt: string;
	agentId?: string;
	sourceRefs: SourceSnapshot[];
	partial?: boolean;
	supersedesMessageId?: string;
}
export interface RunUsage {
	knowledge?: 'known' | 'estimate' | 'unknown';
	inputTokens?: Decimal;
	outputTokens?: Decimal;
	estimated: boolean;
}
export interface RecoveryStatus {
 runId: string;
 rootRunId: string;
 revision: Decimal;
 state: 'none' | 'checking' | 'ready' | 'blocked' | 'resuming';
 generation: Decimal;
 treeRevision?: string;
 affectedRunIds: string[];
 reason?: string;
 checkedAt?: string;
}
export interface Run {
	contextUsage?: ContextUsage;
 recovery?: RecoveryStatus;
	role?: 'execution' | 'orchestration';
	group?: GroupBinding;
	limits?: ExecutionLimits;
	budgetRootRunId?: string;
	id: string;
	agentId: string;
	personaRevision: Decimal;
	modelBindingRevision: Decimal;
	reason?: string;
	usage?: RunUsage;
	sessionId: string;
	status:
		| 'accepted'
		| 'preparing'
		| 'running'
		| 'waiting_approval'
		| 'waiting_children'
		| 'interrupted'
		| 'recovering'
		| 'blocked'
		| 'canceling'
		| 'succeeded'
		| 'failed'
		| 'canceled';
	revision: Decimal;
	parentRunId?: string;
	rootRunId?: string;
	retryOfRunId?: string;
	effectsUnresolved?: boolean;
}
export interface RunEvent {
	runId: string;
	seq: Decimal;
	type: string;
	createdAt: string;
	text?: string;
	sourceRefs?: SourceSnapshot[];
	status?: string;
	reason?: string;
	messageId?: string;
	approvalId?: string;
	effectId?: string;
	usage?: RunUsage;
}
export interface EventTailQuery {
	profileId: string;
	runId: string;
	afterSeq?: Decimal;
	limit?: number;
	maxBytes?: number;
	waitMillis?: number;
}
export interface EventPage {
	runId: string;
	subscriptionId: string;
	events: RunEvent[];
	nextSeq: Decimal;
	headSeq: Decimal;
	hasMore: boolean;
}
export interface RunSnapshot {
	run: Run;
	messages: VisibleMessage[];
	pendingText: string;
	events: RunEvent[];
}
export interface EventCursorRecovery {
	type: 'run-cursor';
	runId: string;
	snapshotSeq: Decimal;
	snapshot: RunSnapshot;
}
export interface RunReceipt extends Receipt {
	targetRunIds?: string[];
	runId: string;
	status: Run['status'];
}
export interface ContextEnvelope {
	messageIds: string[];
	sourceRefs: SourceSnapshot[];
	excerpts: Array<{ text: string; sourceRef: SourceSnapshot }>;
	parentRunId?: string;
	grantIds?: string[];
	sourceScopes?: SourceScope[];
}
export type DelegationTarget = { kind: 'existing'; agentId: string } | { kind: 'temporary'; draft: AgentDraft };
export interface DerivedInput {
	kind: 'message' | 'task_result' | 'memory_revision';
	id: string;
	revision: Decimal;
	hash: string;
	namespace: string;
	workThreadId: string;
}
export interface TaskOutcome {
	runId: string;
	status: Run['status'];
	text: string;
	reason?: string;
	partial: boolean;
	effectsUnresolved: boolean;
	usage?: RunUsage;
	derived: DerivedInput[];
}
export interface Delegation {
	requesterKind?: 'user' | 'agent';
	id: string;
	revision: Decimal;
	parentRunId: string;
	childRunId: string;
	rootRunId: string;
	requesterAgentId: string;
	executorAgentId: string;
	workThreadId: string;
	targetAgentId?: string;
	status: Run['status'];
	result?: TaskOutcome;
}
export interface DirectoryEntry {
	id: string;
	revision: Decimal;
	name: string;
	description: string;
	available: boolean;
	allowedTools: string[];
}
export interface AgentProposal {
	proposalId: string;
	revision: Decimal;
	previewHash: string;
	draft: AgentDraft;
}
export interface AgentMessage {
	id: string;
	fromAgentId: string;
	toAgentId: string;
	text: string;
	createdAt: string;
	kind: string;
	status: string;
	delegationId?: string;
	questionId?: string;
	workThreadId: string;
}
export type GrantOperation = 'read' | 'search' | 'send' | 'summarize' | 'memory' | 'delegate' | 'deliver';
export interface ExecutionLimits {
	maxDepth: number;
	maxChildren: number;
	rootChildren: number;
	profileChildren: number;
	maxWakes: number;
}
export interface BudgetPolicy {
	rootTokenLimit: Decimal;
	profileTokenLimit: Decimal;
	maintenanceTokenLimit: Decimal;
	paused: boolean;
}
export interface BudgetSettings {
	rootRunId?: string;
	accountId?: string;
	rootTokenLimit?: Decimal;
	reservedTokens?: Decimal;
	chargedTokens?: Decimal;
	knowledge?: 'known' | 'estimate' | 'unknown';
	revision: Decimal;
	policy: BudgetPolicy;
	limits: ExecutionLimits;
}
export interface TaskConfigDraft {
	sponsorAgentId: string;
	draft: AgentDraft;
}
export interface GrantRecipient {
	subjectKind?: 'temporary';
	sponsorAgentId?: string;
	configurationHash?: string;
	agentId: string;
	modelBindingRevision: Decimal;
	providerId: string;
	modelId: string;
	protocol: ModelBindingDraft['protocol'];
	endpoint: string;
}
export interface Grant {
	id: string;
	revision: Decimal;
	workspaceId: string;
	scope: 'source' | 'folder' | 'vault';
	resourceId: string;
	recipientIds: string[];
	recipients: GrantRecipient[];
	operations: GrantOperation[];
	sessionId?: string;
	taskId?: string;
	state: 'active' | 'revoked';
	expiresAt?: string;
}
export interface EffectTarget {
	workspaceId: string;
	resourceId: string;
	operation: 'create' | 'update';
	baseRevision: Decimal;
}
export interface ToolDescriptor {
	name: string;
	capability: string;
	capabilityVersion: string;
	implementationVersion: string;
	policyVersion: string;
}
export interface ApprovalPreview {
	binding?: NoteWriteBinding;
	target: EffectTarget;
	tool: ToolDescriptor;
	parametersHash: string;
	previewHash: string;
	diff: string;
	content: string;
	sourceRefs: SourceSnapshot[];
}
export interface Approval {
	id: string;
	revision: Decimal;
	runId: string;
	effectId: string;
	preview: ApprovalPreview;
	expiresAt: string;
	status: 'pending' | 'approved' | 'rejected' | 'expired' | 'canceled';
}
export type MemoryNamespace = { kind: 'agent' | 'temporary' | 'global'; id: string };
export type MemoryScope = { kind: 'profile' } | { kind: 'session' | 'work_thread'; id: string };
export interface MemorySettings {
 namespace: MemoryNamespace; revision: Decimal; enabled: boolean; eligible: boolean; reason?: string;
}
export interface MemoryBody {
 text: string; hash: string; provenance: 'observation' | 'inference' | 'user'; creatorKind: 'user' | 'agent' | 'temporary'; creatorAgentId?: string; jobId?: string;
 sourceRefs: SourceSnapshot[]; sourceScopes: SourceScope[]; derived: DerivedInput[];
}
interface MemoryItemBase { id: string; revision: Decimal; namespace: MemoryNamespace; scope: MemoryScope; pinned: boolean }
export type MemoryItem = MemoryItemBase & (
 { state: 'active'; revisionId: string; body: MemoryBody } | { state: 'forgotten' }
);
interface MemoryCandidateBase { id: string; revision: Decimal; namespace: MemoryNamespace; scope: MemoryScope; jobId: string; reason?: string }
type MemoryCandidateTarget = { operation: 'create' } | { operation: 'correct'; targetItemId: string; targetRevision: Decimal };
export type MemoryCandidate = MemoryCandidateBase & MemoryCandidateTarget & (
 { state: 'pending' | 'applied'; body: MemoryBody } | { state: 'blocked' | 'superseded' }
);
export interface MemoryJobRun { id: string; status: Run['status']; reason?: string; usage?: RunUsage }
export interface MemoryJob {
 id: string; revision: Decimal; namespace: MemoryNamespace; sourceRunId: string;
 admission: 'pending' | 'bound' | 'blocked'; commit: 'pending' | 'committed' | 'candidate' | 'discarded'; reason?: string; run?: MemoryJobRun;
}
export interface MemoryProposal {
 id: string; revision: Decimal; operation: 'create' | 'update' | 'delete'; targetItemId?: string; targetRevision?: Decimal; scope: MemoryScope; body?: MemoryBody; previewHash: string; expiresAt: string;
 state: 'pending' | 'accepted' | 'rejected' | 'expired' | 'conflicted';
}
export interface ContextUsage { policyVersion: 'extractive-v1'; selected: number; excerpted: number; omittedAuthorized: number; windowLimited: boolean }
export interface ContextTextSpan { start: number; end: number }
interface ExecutionContextEntryBase {
 id: string; kind: 'intent' | 'inbox' | 'recent' | 'working_summary' | 'memory_recall' | 'attachment';
 representation: 'full' | 'excerpt' | 'intent_alias' | 'metadata'; revision: Decimal; scope: MemoryScope; partial?: boolean; reason?: string;
}
export type ExecutionContextEntryView = ExecutionContextEntryBase & (
 { state: 'redacted' } |
 { state: 'readable'; text?: string; source?: DerivedInput; sourceRefs?: SourceSnapshot[]; contentHash?: string; sourceSpans?: ContextTextSpan[]; displaySlice?: ContextTextSpan; partIndex?: number; partCount?: number;
 creatorKind: 'user' | 'agent' | 'temporary'; preparationKind: 'explicit' | 'selected' | 'automatic_extractive' | 'memory_recall'; provenance?: 'observation' | 'inference' | 'user' }
);
interface ExecutionContextBase { runId: string; runRevision: Decimal; namespace: MemoryNamespace; scope: { kind: 'session' | 'work_thread'; id: string }; reason?: string; nextCursor?: string }
export type ExecutionContextView = ExecutionContextBase & (
 { state: 'pending' | 'legacy_untracked'; entries: ExecutionContextEntryView[] } |
 { state: 'sealed' | 'redacted'; manifestRevision: '1'; usage?: ContextUsage; entries: ExecutionContextEntryView[] }
);
export type MemoryObject =
 { kind: 'item'; item: MemoryItem } | { kind: 'candidate'; candidate: MemoryCandidate } |
 { kind: 'job'; job: MemoryJob } | { kind: 'settings'; settings: MemorySettings } |
 { kind: 'proposal'; proposal: MemoryProposal } | { kind: 'context'; context: ExecutionContextView };
export interface MemoryPage { namespaceRevision: Decimal; settings?: MemorySettings; items: MemoryObject[]; nextCursor?: string }
export interface MemoryQuery { profileId: string; namespace: MemoryNamespace; kind: 'item' | 'candidate' | 'job' | 'proposal' | 'context'; scope?: MemoryScope; query?: string; limit?: number; cursor?: string }
export type MemoryGet = { profileId: string; namespace: MemoryNamespace } & (
 { kind: 'settings' } | { kind: 'item' | 'candidate' | 'job' | 'proposal'; id: string } |
 { kind: 'context'; id: string; limit?: number; cursor?: string }
);
type MemoryCommand = CommandMeta & { expectedRevision: Decimal; namespace: MemoryNamespace };
export type MemoryPin = MemoryCommand & { id: string; pinned: boolean };
export type MemoryForget = MemoryCommand & { id: string };
export type MemoryCorrect = MemoryCommand & (
 { action: 'add'; scope: MemoryScope; text: string } | { action: 'correct'; id: string; text: string } |
 { action: 'apply_candidate'; id: string; candidateId: string; candidateRevision: Decimal }
);
export type MemorySetAuto = MemoryCommand & { enabled: boolean };
export interface MemoryReferenceSelection { kind: 'message' | 'task_result' | 'memory_revision'; id: string; revision: Decimal }
export type MemoryGlobalProposal = CommandMeta & { expectedRevision: Decimal; scope: MemoryScope; sources: MemoryReferenceSelection[] } & (
 { operation: 'create'; text: string } | { operation: 'update'; targetItemId: string; text: string } |
 { operation: 'delete'; targetItemId: string }
);
export type MemoryResolve = CommandMeta & { expectedRevision: Decimal; id: string; decision: 'approve' | 'reject'; previewHash: string };

export interface DeletionPreview {
	token: string;
	revision: Decimal;
	expiresAt: string;
	categories: Array<{ kind: string; count: number; retained: boolean; reason?: string }>;
}
export interface DeleteCommand extends CommandMeta {
	id?: string;
	previewToken: string;
	retainMemoryIds?: string[];
}
export interface PortablePreview {
	token: string;
	/** The frozen target IDs below are candidates for copy, before conflict resolution. */
	mappingMode: 'copy-candidate';
	mappings: Array<{ kind: 'agent' | 'session' | 'memory'; from: string; to: string }>;
	conflicts: Array<{
		id: string;
		revision: Decimal;
		hash: string;
		kind: 'agent' | 'session' | 'memory';
		existingId: string;
		reason: string;
		needsReview: boolean;
	}>;
}
export interface HostLease {
	leaseId: string;
	hostConnectionId: string;
	leaseEpoch: Decimal;
	workspaceId: string;
	capabilities: string[];
	expiresAt: string;
}
export interface NoteWriteBinding {
	deviceId: string;
	profileId: string;
	commandEpoch: Decimal;
	workspaceId: string;
	originClientId: string;
	originViewId: string;
	leaseId: string;
	hostConnectionId: string;
	leaseEpoch: Decimal;
	targetResourceId: string;
	preparationId: string;
	baseHash: string;
	contentHash: string;
	targetVersion: Decimal;
	capabilityVersion: string;
	implementationVersion: string;
	policyVersion: string;
}
export interface HostWriteAuthority {
	profileId: string;
	commandEpoch: Decimal;
	leaseId: string;
	hostConnectionId: string;
	leaseEpoch: Decimal;
	workspaceId: string;
}
export interface HostPrepareWriteRequest extends HostWriteAuthority {
	target: EffectTarget;
	tool: ToolDescriptor;
	content: string;
}
export interface NoteTargetPreview {
	target: EffectTarget;
	tool: ToolDescriptor;
	contentHash: string;
	diff: string;
	lease: HostLease;
	binding: NoteWriteBinding;
}
export interface HostCheckWriteRequest extends HostWriteAuthority {
	preview: ApprovalPreview;
}
export interface HostCheckWriteResult {
	valid: true;
}
export interface HostInvoke extends HostWriteAuthority {
	capability: string;
	effectId: string;
	resource: { resourceId: string; revision?: Decimal };
	expectedRevision?: Decimal;
	content: string;
	preview: ApprovalPreview;
	runId: string;
	approvalId: string;
	approvalRevision: Decimal;
	expiresAt: string;
	fingerprint: string;
}
export interface HostReceiptQuery extends HostWriteAuthority {
	effectId: string;
	fingerprint: string;
	preview: ApprovalPreview;
}
export interface HostReceipt {
	effectId: string;
	status: 'committed' | 'reconciled' | 'rejected' | 'unknown_outcome' | 'failed_no_effect';
	revision?: Decimal;
	receiptId?: string;
	fingerprint?: string;
	reason?: string;
}
export interface EffectView {
	id: string;
	runId: string;
	revision: Decimal;
	status:
		| 'prepared'
		| 'awaiting_approval'
		| 'dispatching'
		| 'committed'
		| 'reconciled'
		| 'rejected'
		| 'failed_no_effect'
		| 'unknown_outcome';
	reason?: string;
	receipt?: HostReceipt;
}
export interface HapCancelNotification {
	jsonrpc: '2.0';
	method: '$/cancelRequest';
	params: { requestId: string };
}
export interface HostReadRequest {
	leaseId: string;
	hostConnectionId: string;
	leaseEpoch: Decimal;
	workspaceId: string;
	source: SourceSnapshot;
	maxBytes: number;
}
export interface HostReadResult {
	source: SourceSnapshot;
	text: string;
	format: 'text/markdown';
	truncated: boolean;
}
export interface HostSearchRequest {
	leaseId: string;
	hostConnectionId: string;
	leaseEpoch: Decimal;
	workspaceId: string;
	sources: SourceSnapshot[];
	scopes: SourceScope[];
	query: string;
	limit: number;
	maxBytes: number;
	cursor?: string;
}
export interface HostSearchResult {
	matches: Array<{ source: SourceSnapshot; text: string; range: SourceRange }>;
	truncated: boolean;
	nextCursor?: string;
}
/** Implemented only by the trusted module Host; receipt lookup must not repeat a write. */
export interface BotHost {
	leaseChanged?(lease: HostLease | undefined): void;
	profileChanged?(profile: ProfileMetadata): void;
	prepareWrite?(request: HostPrepareWriteRequest, signal: AbortSignal): Promise<NoteTargetPreview>;
	checkWrite?(request: HostCheckWriteRequest, signal: AbortSignal): Promise<HostCheckWriteResult>;
	invoke(request: HostInvoke, signal: AbortSignal): Promise<HostReceipt>;
	queryReceipt(request: HostReceiptQuery, signal: AbortSignal): Promise<HostReceipt>;
	read?(request: HostReadRequest, signal: AbortSignal): Promise<HostReadResult>;
	search?(request: HostSearchRequest, signal: AbortSignal): Promise<HostSearchResult>;
}

/** Serializable method contract. Unavailable methods reject; capability discovery never promises placeholders. */
export interface BotMethodMap {
	'protocol.hello': { params: HelloRequest; result: HelloResult };
	'service.health': { params: Record<string, never>; result: { status: 'ok' } };
	'service.status': { params: Record<string, never>; result: ServiceStatus };
	'service.diagnostics': { params: Record<string, never>; result: ServiceDiagnostics };
	'service.shutdown': { params: Record<string, never>; result: { accepted: true } };
	'agents.create': { params: CommandMeta & { draft: AgentDraft }; result: Agent };
	'agents.list': { params: PageQuery; result: Page<Agent> };
	'agents.get': { params: IdQuery; result: Agent };
	'agents.update': {
		params: CommandMeta & { expectedRevision: Decimal; id: string; draft: AgentDraft };
		result: Agent;
	};
	'agents.disable': { params: CommandMeta & { expectedRevision: Decimal; id: string }; result: Agent };
	'agents.deletePreview': { params: IdQuery; result: DeletionPreview };
	'agents.delete': { params: DeleteCommand & { id: string; expectedRevision: Decimal }; result: Receipt };
	'models.list': { params: PageQuery; result: Page<ModelInfo> };
	'models.test': {
		params: { profileId: string; model: ModelBindingDraft };
		result: { available: boolean; capabilities: string[]; credentialStatus: CredentialStatus };
	};
	'models.bind': {
		params: CommandMeta & { expectedRevision: Decimal; agentId: string; model: ModelBindingDraft };
		result: Agent;
	};
	'sessions.create': {
		params: CommandMeta & {
			kind: Session['kind'];
			title: string;
			memberIds: string[];
			coordinatorId?: string;
			workspaceId?: string;
		};
		result: Session;
	};
	'sessions.list': { params: PageQuery; result: Page<Session> };
	'sessions.get': { params: IdQuery; result: Session };
	'sessions.history': { params: PageQuery & { sessionId: string }; result: Page<VisibleMessage> };
	'sessions.archive': { params: CommandMeta & { expectedRevision: Decimal; id: string }; result: Session };
	'sessions.updateMembers': {
		params: CommandMeta & {
			id: string;
			expectedRevision: Decimal;
			memberIds: string[];
			historyScope: GroupHistoryScope;
		};
		result: Session;
	};
	'sessions.setCoordinator': { params: CommandMeta & { expectedRevision: Decimal; id: string; coordinatorId: string }; result: Session };
	'sessions.deletePreview': { params: IdQuery; result: DeletionPreview };
	'sessions.delete': { params: DeleteCommand; result: Receipt };
	'runs.start': {
		params: CommandMeta & {
			sessionId: string;
			expectedRevision: Decimal;
			intent: string;
			sourceRefs: SourceSnapshot[];
			sourceScopes?: SourceScope[];
			grantIds?: string[];
			supersedesMessageId?: string;
			targetAgentIds?: string[];
			workspaceId?: string;
			originClientId?: string;
			originViewId?: string;
			hostConnectionId?: string;
			hostLeaseEpoch?: Decimal;
			retryOfRunId?: string;
		};
		result: RunReceipt;
	};
	'runs.get': { params: IdQuery; result: Run };
	'runs.subscribe': { params: EventTailQuery; result: EventPage };
	'runs.cancel': { params: CommandMeta & { expectedRevision: Decimal; id: string }; result: RunReceipt };
	'runs.recovery': { params: IdQuery; result: RecoveryStatus };
	'runs.resume': { params: CommandMeta & { id: string; expectedRevision: Decimal; recoveryGeneration: Decimal }; result: RunReceipt };
	'collaboration.budget': { params: { profileId: string; runId?: string }; result: BudgetSettings };
	'collaboration.configureBudget': {
		params: CommandMeta & { expectedRevision: Decimal; policy: BudgetPolicy };
		result: BudgetSettings;
	};
	'collaboration.configurationHash': {
		params: { profileId: string; config: TaskConfigDraft };
		result: { configurationHash: string };
	};
	'collaboration.discover': { params: PageQuery & { runId?: string }; result: Page<DirectoryEntry> };
	'collaboration.message': {
		params: CommandMeta & {
			runId: string;
			targetAgentId: string;
			kind: 'notify' | 'question' | 'reply';
			questionId?: string;
			text: string;
			sourceRefs: SourceSnapshot[];
			delegationId?: string;
			messageIds?: string[];
		};
		result: AgentMessage;
	};
	'collaboration.delegate': {
		params: CommandMeta & {
			runId: string;
			target: DelegationTarget;
			task: string;
			constraints: string[];
			expectedOutput: string;
			context: ContextEnvelope;
		};
		result: Delegation;
	};
	'collaboration.get': { params: IdQuery; result: Delegation };
	'collaboration.list': { params: PageQuery & { runId: string }; result: Page<Delegation> };
	'collaboration.reply': {
		params: CommandMeta & { delegationId: string; questionId?: string; text: string; sourceRefs: SourceSnapshot[] };
		result: AgentMessage;
	};
	'collaboration.cancel': {
		params: CommandMeta & { id: string; expectedRevision: Decimal; scope?: 'task' | 'descendants' };
		result: Delegation;
	};
	'collaboration.proposeCreate': {
		params: CommandMeta & { runId: string; draft: AgentDraft };
		result: AgentProposal;
	};
	'collaboration.proposals': { params: PageQuery & { runId?: string }; result: Page<AgentProposal> };
	'collaboration.confirmProposal': {
		params: CommandMeta & { proposalId: string; previewHash: string; expectedRevision: Decimal };
		result: Agent;
	};
	'collaboration.rejectProposal': {
		params: CommandMeta & { proposalId: string; previewHash: string; expectedRevision: Decimal };
		result: Receipt;
	};
	'grants.list': { params: PageQuery; result: Page<Grant> };
	'grants.create': {
		params: CommandMeta & {
			workspaceId: string;
			scope: Grant['scope'];
			resourceId: string;
			recipients: GrantRecipient[];
			operations: GrantOperation[];
			sessionId?: string;
			taskId?: string;
			expiresAt?: string;
		};
		result: Grant;
	};
	'grants.revoke': { params: CommandMeta & { expectedRevision: Decimal; id: string }; result: Receipt };
	'approvals.list': { params: PageQuery; result: Page<Approval> };
	'approvals.get': { params: IdQuery; result: Approval };
	'approvals.resolve': {
		params: CommandMeta & {
			expectedRevision: Decimal;
			id: string;
			effectId: string;
			decision: 'approve' | 'reject';
			previewHash: string;
		};
		result: Approval;
	};
	'memory.list': { params: MemoryQuery; result: MemoryPage };
	'memory.get': { params: MemoryGet; result: MemoryObject };
	'memory.pin': { params: MemoryPin; result: MemoryItem };
	'memory.correct': { params: MemoryCorrect; result: MemoryItem };
	'memory.forget': { params: MemoryForget; result: MemoryItem };
	'memory.setAutoMaintenance': { params: MemorySetAuto; result: MemorySettings };
	'memory.proposeGlobal': { params: MemoryGlobalProposal; result: MemoryProposal };
	'memory.resolveGlobal': { params: MemoryResolve; result: Receipt };
	'profile.deletePreview': { params: { profileId: string }; result: DeletionPreview };
	'profile.delete': { params: DeleteCommand; result: Receipt };
	'profile.status': {
		params: Record<string, never>;
		result: { state: 'ready'; schemaVersion: number; profile: ProfileMetadata; policy?: RuntimePolicyStatus;cleanup?:CleanupStatus };
	};
	'portable.stage': {
        params: {profileId:string;commandEpoch:Decimal;uploadId?:string;size:Decimal;offset:Decimal;dataBase64:string;final:boolean};
        result: {uploadId:string;nextOffset:Decimal;artifact?:ArtifactRef};
    };
	'portable.export': {
		params: CommandMeta & { agentIds: string[]; memoryIds: string[]; sessionIds: string[] };
		result: { artifact: ArtifactRef };
	};
	'portable.importPreview': { params: { profileId: string; artifact: ArtifactRef }; result: PortablePreview };
	'portable.import': {
		params: CommandMeta & {
			previewToken: string;
			resolutions: Array<{ id: string; action: 'keep' | 'replace' | 'copy' }>;
		};
		result: Receipt;
	};
	'host.attach': { params: { workspaceId: string; capabilities: string[]; renewLeaseId?: string }; result: HostLease };
	'host.detach': { params: { leaseId: string }; result: { detached: true } };
	'host.prepareWrite': { params: HostPrepareWriteRequest; result: NoteTargetPreview };
	'host.checkWrite': { params: HostCheckWriteRequest; result: HostCheckWriteResult };
	'effects.get': { params: IdQuery; result: EffectView };
	'effects.reconcile': { params: CommandMeta & { id: string; expectedRevision: Decimal }; result: EffectView };
	'host.invoke': { params: HostInvoke; result: HostReceipt };
	'host.queryReceipt': { params: HostReceiptQuery; result: HostReceipt };
	'host.read': { params: HostReadRequest; result: HostReadResult };
	'host.search': { params: HostSearchRequest; result: HostSearchResult };
}

export type BotMethod = keyof BotMethodMap;
type GroupMethods<G extends string> = {
	readonly [M in BotMethod as M extends `${G}.${infer Name}` ? Name : never]: (
		params: BotMethodMap[M]['params'],
		options?: CallOptions,
	) => Promise<BotMethodMap[M]['result']>;
};
export type BotConnectionState = 'connecting' | 'ready' | 'closed';
/** Calls never replay automatically. Abort/timeout only end the wait, not an accepted business effect. */
export interface BotClient {
	onClose(listener: () => void): () => void;
	readonly hello: HelloResult;
	readonly state: BotConnectionState;
	readonly service: GroupMethods<'service'>;
	readonly agents: GroupMethods<'agents'>;
	readonly models: GroupMethods<'models'>;
	readonly sessions: GroupMethods<'sessions'>;
	readonly runs: GroupMethods<'runs'>;
	readonly collaboration: GroupMethods<'collaboration'>;
	readonly grants: GroupMethods<'grants'>;
	readonly approvals: GroupMethods<'approvals'>;
	readonly effects: GroupMethods<'effects'>;
	readonly memory: GroupMethods<'memory'>;
	readonly profile: GroupMethods<'profile'>;
	readonly portable: GroupMethods<'portable'>;
	readonly host: Pick<GroupMethods<'host'>, 'attach' | 'detach'>;
	/** Installs the trusted reverse-request handler. Does not acquire a Host lease. */
	setHost(host: BotHost | undefined): void;
	/** Closing the owning module closes its transport; page consumers only unsubscribe. */
	close(): void;
}
export const BOT_CLIENT = serviceKey<BotClient>('huhubot', 'client');

/** On-demand connection owner. Looking up this service starts no process. Secrets
 * use the private desktop channel; registerCredential consumes the mutable bytes.
 */
export interface BotRuntimeAccess {
	readonly client?: BotClient;
	connect(): Promise<BotClient>;
	registerCredential(secret: Uint8Array, mode: 'protected' | 'session-memory'): Promise<CredentialStatus & { credentialRef: string }>;
	deleteCredential(reference: string): Promise<CredentialStatus & { credentialRef: string }>;
}
export const BOT_RUNTIME = serviceKey<BotRuntimeAccess>('huhubot', 'runtime');
