import { t } from '../../../../shared/i18n';
import {
	controlDescriptor,
	CONTROL_ERROR_EXITS,
	type ControlErrorCode,
	controlJsonBytes,
	ControlProtocolError,
	type ControlRequest,
	type ControlTarget,
	type ControlProgress,
	type ControlJson,
} from '../../../../shared/native/control-wire';
import { AGENT_CATALOG } from '../../core/launch/catalog';
import type { ActivityWaitBaseline } from '../../core/control/terminal-coordination';
import {
	captureControlExecutionContext,
	captureTerminalCoordination,
	type CoordinationResult,
} from './terminal-coordination';
import type { ControlScope, CapturedManagedCreate, ControlExecutionContext } from '../../core/control/context';
import type { ManagedRuntimeRef, ManagedSessionTarget, ArchivePlan } from '../../core/workspace/managed-runtime';
import type { SpaceRecord } from '../../core/space/model';
import { SpaceError } from '../../core/space/errors';
import { PaneCommandError, type PaneDescriptor, type PaneOperationResult } from '../workspace-service-panes';
import { ManagedLaunchError } from '../launch/managed-errors';
import type { SpaceService } from '../spaces/space-service';
import type { WorkspaceService } from '../workspace-service';
import type { TerminalSessions } from '../terminal/sessions';
import { ControlPaging, controlData, type ResponseEnvelope } from './paging';
import { CONTROL_INBOX_OPERATIONS, ControlInboxHandler } from './inbox';
import type { InboxService } from '../inbox/service';
import type { HistoryCommands } from './history';

export interface PreparedControlCommand {
	readonly target: Readonly<ControlTarget>;
	readonly mutation: boolean;
	preflight(scope: Readonly<ControlScope>): Promise<void>;
	run(progress: (value: ControlProgress) => void): Promise<CoordinationResult>;
	dispose(): void;
}
export const CONTROL_HANDLERS = Object.freeze([
	'pane.list',
	'pane.attach',
	'pane.focus',
	'pane.split',
	'pane.resize',
	'pane.close',
	'message.send',
	'inbox.list',
	'inbox.read',
	'inbox.ack',
	'history.list',
	'history.preview',
	'history.open',
	'history.resume',
	'history.import',
	'capabilities',
	'doctor',
	'space.list',
	'space.get',
	'space.create',
	'space.rename',
	'space.archive',
	'session.list',
	'session.get',
	'session.rename',
	'session.archive',
	'terminal.start',
	'terminal.get',
	'terminal.read',
	'terminal.stop',
	'agent.start',
	'agent.list',
	'agent.get',
	'agent.explain',
	'agent.prompt',
	'agent.wait',
	'terminal.send-text',
	'terminal.send-keys',
] as const);
function text(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}
function number(value: unknown): number | undefined {
	return typeof value === 'number' ? value : undefined;
}
function needed(value: string | undefined): string {
	if (!value) throw new ControlProtocolError(t('agent.spaces.error.required'), 'TARGET_REQUIRED');
	return value;
}
/** Only public stable identity facts are duplicated in mutation receipts. */
function paneTarget(pane: Pick<PaneDescriptor, 'paneId' | 'spaceId' | 'sessionId' | 'runtimeId'>): ControlTarget {
	return { paneId: pane.paneId, spaceId: pane.spaceId, sessionId: pane.sessionId, runtimeId: pane.runtimeId };
}
export function paneControlError(
	error: unknown,
	effect?: PaneOperationResult['effect'],
): { code: ControlErrorCode; message: string; reason?: string } {
	const typed =
		error instanceof PaneCommandError || error instanceof SpaceError || error instanceof ControlProtocolError;
	let code: ControlErrorCode =
		typed && Object.hasOwn(CONTROL_ERROR_EXITS, error.code)
			? (error.code as ControlErrorCode)
			: 'SOURCE_UNAVAILABLE';
	// A later diagnostic cannot erase the original owner's confirmed publication/save/focus facts.
	if (effect !== undefined && effect !== 'unknown' && code === 'EFFECT_UNKNOWN') code = 'SOURCE_UNAVAILABLE';
	const key =
		code === 'CAPACITY_EXCEEDED'
			? 'agent.control.capacity'
			: code === 'WAIT_CANCELLED'
				? 'agent.coordination.observationCancelled'
				: code === 'WAIT_TIMEOUT'
					? 'agent.coordination.observationTimeout'
					: code === 'TARGET_REQUIRED'
						? 'agent.spaces.error.required'
						: code === 'SCOPE_MISMATCH'
							? 'agent.spaces.error.scope'
							: code === 'TARGET_NOT_FOUND'
								? 'agent.managed.targetMissing'
								: code === 'INVALID_ARGUMENT'
									? 'agent.managed.invalidInput'
									: code === 'CAPABILITY_UNAVAILABLE'
										? 'agent.control.unavailable'
										: 'agent.control.failed';
	return {
		code,
		message: t(key),
		...(typed && 'reason' in error
			? { reason: error.reason.slice(0, 256) }
			: !typed
				? { reason: effect === 'completed' ? 'post-effect-observation' : 'operation-failed' }
				: {}),
	};
}
export function controlSpaceRow(space: SpaceRecord): ControlJson {
	return controlData({
		id: space.id,
		name: space.name,
		archived: space.archived,
		directory:
			space.directory.kind === 'vault'
				? { kind: 'vault', relativePath: space.directory.relativePath }
				: { kind: 'external', grantId: space.directory.grantId },
	});
}

/** A thin adapter over the existing owners, not another runtime or persistence manager. */
export class ControlCommands {
	private readonly paging = new ControlPaging();
	private readonly inboxHandler?: ControlInboxHandler;
	private readonly historyCommands?: HistoryCommands;
	private lastRecords?: object;
	private recordRevision = 0;
	constructor(
		readonly spaces: SpaceService,
		readonly workspace: WorkspaceService,
		readonly sessions: TerminalSessions,
		inbox?: InboxService,
		historyCommands?: HistoryCommands,
	) {
		this.inboxHandler = inbox ? new ControlInboxHandler(inbox, spaces, this.paging) : undefined;
		this.historyCommands = historyCommands;
	}
	close(): void {
		this.paging.clear();
		this.inboxHandler?.clear();
	}
	private revision(): number {
		const records = this.spaces.store.getState().records;
		if (records !== this.lastRecords) {
			this.lastRecords = records;
			this.recordRevision++;
		}
		return this.recordRevision;
	}
	private capturePane(
		request: Readonly<ControlRequest>,
		execution: Readonly<ControlExecutionContext>,
	): PreparedControlCommand {
		const operation = request.operation,
			target = Object.freeze({ ...request.target }),
			params = Object.freeze({ ...request.params });
		const panes = this.workspace.panes;
		const invalid = () => {
			throw new ControlProtocolError(t('agent.managed.invalidInput'));
		};
		const listing = operation === 'pane.list',
			attaching = operation === 'pane.attach',
			splitting = operation === 'pane.split';
		if (
			listing
				? target.paneId || target.sessionId || target.runtimeId
				: attaching
					? target.paneId
					: !splitting && target.sessionId
		)
			invalid();
		const records = this.spaces.store.getState().records;
		const spaceId = listing ? needed(target.spaceId ?? records.selectedSpaceId) : target.spaceId;
		if (spaceId && !records.spaces[spaceId]) throw new PaneCommandError('TARGET_NOT_FOUND', 'missing-space');
		const source =
			!listing && !attaching
				? panes.capture({
						paneId: needed(target.paneId),
						spaceId,
						runtimeId: splitting ? undefined : target.runtimeId,
					})
				: undefined;
		const sessionId = attaching || splitting ? needed(target.sessionId) : undefined;
		const session = sessionId
			? panes.captureSession({
					spaceId: needed(spaceId ?? records.sessions[sessionId]?.spaceId),
					sessionId,
					runtimeId: target.runtimeId,
				})
			: undefined;
		if (splitting && source!.spaceId !== session!.spaceId)
			throw new PaneCommandError('SCOPE_MISMATCH', 'split-space-mismatch');
		if (
			operation === 'pane.resize' &&
			(typeof params.ratio !== 'number' ||
				!Number.isFinite(params.ratio) ||
				params.ratio < 0.15 ||
				params.ratio > 0.85)
		)
			invalid();
		if (splitting && params.direction !== 'row' && params.direction !== 'column') invalid();
		const focus = operation === 'pane.focus' ? panes.captureFocus(source!) : undefined;
		let resolved: Readonly<ControlTarget> = Object.freeze({
			vaultId: target.vaultId,
			instanceId: target.instanceId,
			...(source
				? paneTarget(source)
				: session
					? { spaceId: session.spaceId, sessionId: session.sessionId, runtimeId: session.observedRuntimeId }
					: { spaceId }),
		});
		let scope!: Readonly<ControlScope>;
		const context = Object.freeze({ signal: execution.signal, deadline: execution.deadline });
		const envelope = (effect: ResponseEnvelope['effect'] = 'completed'): ResponseEnvelope => ({
			protocolVersion: 1,
			requestId: request.requestId,
			operation,
			ok: true,
			target: resolved,
			phase: listing ? 'listed' : 'completed',
			effect,
		});
		const receipt = (result: PaneOperationResult) =>
			controlData({
				layoutPublished: result.layoutPublished,
				persisted: result.persisted,
				revision: result.revision,
				...(result.pane ? { pane: paneTarget(result.pane) } : {}),
				...(result.insertedPane ? { insertedPane: paneTarget(result.insertedPane) } : {}),
				...(result.focused === undefined ? {} : { focused: result.focused }),
				...(result.focusRequestId === undefined ? {} : { focusRequestId: result.focusRequestId }),
				...(result.error === undefined ? {} : { diagnostic: paneControlError(result.error, result.effect) }),
			});
		const budget = () => {
			// Every supported mutation returns only these bounded identity tuples, never titles or internal layout snapshots.
			// An existing attach can reveal any legal opaque ID. Backslashes reserve worst JSON escaping of all 4096 UTF-8 bytes.
			const future = session
				? {
						paneId: '\\'.repeat(4096),
						spaceId: session.spaceId,
						sessionId: session.sessionId,
						runtimeId: session.observedRuntimeId,
					}
				: undefined;
			const outer = attaching ? { ...resolved, ...future } : resolved;
			const data = {
				layoutPublished: true,
				persisted: true,
				revision: Number.MAX_SAFE_INTEGER,
				pane: source ? paneTarget(source) : future,
				...(splitting ? { insertedPane: future } : {}),
				focused: true,
				focusRequestId: Number.MAX_SAFE_INTEGER,
				diagnostic: {
					code: 'x'.repeat(64),
					message: '\\'.repeat(1024),
					reason: '\\'.repeat(256),
				},
			};
			controlJsonBytes({ ...envelope(), target: outer, data });
			controlJsonBytes({
				...envelope(),
				effect: 'unknown',
				target: outer,
				ok: false,
				data,
				error: { code: 'x'.repeat(64), message: '\\'.repeat(1024) },
			});
		};
		return {
			get target() {
				return resolved;
			},
			mutation: !listing,
			preflight: async (captured) => {
				scope = captured;
				if (
					(target.vaultId && target.vaultId !== captured.vaultId) ||
					(target.instanceId && target.instanceId !== captured.instanceId)
				)
					throw new PaneCommandError('SCOPE_MISMATCH', 'control-scope-mismatch');
				resolved = Object.freeze({ ...resolved, vaultId: captured.vaultId, instanceId: captured.instanceId });
				if (!listing) budget();
			},
			run: async () => {
				if (listing) {
					const list = await panes.list(spaceId, context);
					const data = this.paging.list(
						list.panes,
						{
							key: JSON.stringify([scope, operation, spaceId, params.limit ?? 100]),
							revision: list.revision,
							cursor: text(params.cursor),
							limit: number(params.limit),
						},
						envelope('none'),
					);
					return { phase: 'listed', effect: 'none', data };
				}
				let result: PaneOperationResult;
				switch (operation) {
					case 'pane.attach':
						result = await panes.attach(session!, context);
						break;
					case 'pane.split':
						result = await panes.split(source!, session!, params.direction as 'row' | 'column', context);
						break;
					case 'pane.resize':
						result = await panes.resize(source!, params.ratio as number, context);
						break;
					case 'pane.close':
						result = await panes.close(source!, context);
						break;
					case 'pane.focus':
						result = await focus!.execute(context);
						break;
					default:
						throw new PaneCommandError('CAPABILITY_UNAVAILABLE', 'unknown-operation');
				}
				if (attaching && result.pane)
					resolved = Object.freeze({
						vaultId: scope.vaultId,
						instanceId: scope.instanceId,
						...paneTarget(result.pane),
					});
				return {
					phase: result.error ? 'failed' : 'completed',
					effect: result.effect,
					data: receipt(result),
					...(result.error === undefined ? {} : { error: paneControlError(result.error, result.effect) }),
				};
			},
			dispose: () => focus?.dispose(),
		};
	}
	private captureHistory(
		request: Readonly<ControlRequest>,
		execution: Readonly<ControlExecutionContext>,
	): PreparedControlCommand {
		if (!this.historyCommands)
			throw new ControlProtocolError(t('agent.control.unavailable'), 'CAPABILITY_UNAVAILABLE');
		const operation = request.operation;
		const params = Object.freeze({ ...request.params });
		const requestTarget = request.target ?? {};
		const acting = operation === 'history.open' || operation === 'history.resume' || operation === 'history.import';
		// `history.open` addresses an existing Session; its Space is the Session's own, never a guess.
		const sessionRecord =
			operation === 'history.open'
				? this.spaces.store.getState().records.sessions[needed(requestTarget.sessionId)]
				: undefined;
		if (operation === 'history.open') {
			if (!sessionRecord) throw new ControlProtocolError(t('agent.managed.targetMissing'), 'TARGET_NOT_FOUND');
			if (requestTarget.spaceId && requestTarget.spaceId !== sessionRecord.spaceId)
				throw new ControlProtocolError(t('agent.spaces.error.scope'), 'SCOPE_MISMATCH');
		}
		// `history list --unassigned` is the one explicit way to discover rows no Space owns; it names no Space.
		const unassigned = operation === 'history.list' && params.unassigned === true;
		if (unassigned && requestTarget.spaceId)
			throw new ControlProtocolError(t('agent.historyControl.unassignedScope'), 'INVALID_ARGUMENT');
		const spaceId = sessionRecord?.spaceId ?? (unassigned ? undefined : needed(requestTarget.spaceId));
		let resolved: Readonly<ControlTarget> = Object.freeze({
			vaultId: requestTarget.vaultId,
			instanceId: requestTarget.instanceId,
			...(spaceId ? { spaceId } : {}),
			...(sessionRecord ? { sessionId: sessionRecord.id } : {}),
		});
		return {
			get target() {
				return resolved;
			},
			mutation: acting,
			preflight: async (scope) => {
				if (
					(requestTarget.vaultId && requestTarget.vaultId !== scope.vaultId) ||
					(requestTarget.instanceId && requestTarget.instanceId !== scope.instanceId)
				)
					throw new ControlProtocolError(t('agent.spaces.error.scope'), 'SCOPE_MISMATCH');
				if (spaceId && !this.spaces.store.getState().records.spaces[spaceId])
					throw new ControlProtocolError(t('agent.spaces.error.missing'), 'TARGET_NOT_FOUND');
				// The page itself is shrunk to the response budget; the limit only bounds how many rows a caller may ask for.
				const limit = number(params.limit) ?? 100;
				if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
					throw new ControlProtocolError(t('agent.managed.invalidInput'), 'INVALID_ARGUMENT');
			},
			run: async () => {
				if (operation === 'history.import') {
					const result = await this.historyCommands!.importSource(
						{ spaceId: needed(spaceId), source: needed(text(params.source)) },
						execution.signal,
					);
					resolved = Object.freeze({ ...resolved, sessionId: result.sessionId });
					return { phase: 'record-saved', effect: 'completed', data: controlData(result) };
				}
				if (operation === 'history.resume') {
					const result = await this.historyCommands!.resumeSource(
						{ spaceId: needed(spaceId), source: needed(text(params.source)) },
						execution.signal,
					);
					resolved = Object.freeze({
						...resolved,
						sessionId: result.sessionId,
						...(result.runtimeId ? { runtimeId: result.runtimeId } : {}),
					});
					return {
						phase:
							result.mode === 'attached'
								? 'running'
								: result.mode === 'resumed'
									? 'launch-pending'
									: 'cancelled',
						effect: result.mode === 'cancelled' ? 'none' : 'completed',
						data: controlData(result),
					};
				}
				if (operation === 'history.open') {
					const result = await this.historyCommands!.openSession({ sessionId: sessionRecord!.id, spaceId });
					if (result.runtimeId) resolved = Object.freeze({ ...resolved, runtimeId: result.runtimeId });
					return {
						phase: 'completed',
						effect: result.attached ? 'completed' : 'none',
						data: controlData(result),
					};
				}
				if (operation === 'history.list') {
					const result = await this.historyCommands!.list(
						{
							spaceId,
							unassigned,
							query: text(params.query),
							filter:
								params.filter === 'active' ||
								params.filter === 'archived' ||
								params.filter === 'favorite'
									? params.filter
									: 'all',
							provider: text(params.provider),
							cursor: text(params.cursor),
							limit: number(params.limit),
						},
						execution.signal,
					);
					return { phase: 'listed', effect: 'none', data: controlData(result) };
				}
				const key = needed(text(params.key));
				const result = await this.historyCommands!.preview(
					{ spaceId: needed(spaceId), key, sourceRef: text(params.sourceRef) },
					execution.signal,
				);
				return {
					phase: result.status === 'unavailable' ? 'unavailable' : 'read',
					effect: 'none',
					data: controlData(result),
				};
			},
			dispose: () => {},
		};
	}

	capture(
		request: Readonly<ControlRequest>,
		execution: Readonly<ControlExecutionContext> = captureControlExecutionContext(
			new AbortController().signal,
			request.timeoutMs,
		),
		after?: Readonly<ActivityWaitBaseline>,
	): PreparedControlCommand {
		const operation = request.operation,
			params = Object.freeze({ ...request.params }),
			target = Object.freeze({ ...request.target });
		if (!(CONTROL_HANDLERS as readonly string[]).includes(operation))
			throw new ControlProtocolError(t('agent.control.unavailable'), 'CAPABILITY_UNAVAILABLE');
		if (
			params.name !== undefined &&
			(!text(params.name)?.trim() ||
				text(params.name)!.trim().length > 200 ||
				text(params.name)!
					.split('')
					.some((char) => char.charCodeAt(0) < 32))
		)
			throw new ControlProtocolError(t('agent.managed.invalidInput'));
		if (operation.startsWith('pane.')) return this.capturePane(request, execution);
		if (operation.startsWith('history.')) return this.captureHistory(request, execution);
		if ((CONTROL_INBOX_OPERATIONS as readonly string[]).includes(operation)) {
			if (!this.inboxHandler)
				throw new ControlProtocolError(t('agent.control.unavailable'), 'CAPABILITY_UNAVAILABLE');
			return this.inboxHandler.capture(request, execution);
		}
		const records = this.spaces.store.getState().records;
		const record = target.sessionId ? records.sessions[target.sessionId] : undefined;
		if (target.sessionId && !record)
			throw new ControlProtocolError(t('agent.managed.targetMissing'), 'TARGET_NOT_FOUND');
		if (record && target.spaceId && record.spaceId !== target.spaceId)
			throw new ControlProtocolError(t('agent.spaces.error.scope'), 'SCOPE_MISMATCH');
		const spaceId = record?.spaceId ?? target.spaceId;
		let resolved: Readonly<ControlTarget> = Object.freeze({ ...target, ...(spaceId ? { spaceId } : {}) });
		const sessionTarget: ManagedSessionTarget | undefined = record
			? { spaceId: record.spaceId, sessionId: record.id }
			: undefined;
		const runtime: ManagedRuntimeRef | undefined =
			sessionTarget && target.runtimeId ? { ...sessionTarget, runtimeId: target.runtimeId } : undefined;
		const runtimeOperation =
			(operation.startsWith('terminal.') && operation !== 'terminal.start') ||
			['agent.get', 'agent.explain', 'agent.prompt', 'agent.wait'].includes(operation);
		if (runtimeOperation) {
			needed(target.sessionId);
			needed(target.runtimeId);
			this.sessions.checkManaged(runtime!);
		}
		if (operation.startsWith('session.') && operation !== 'session.list') needed(target.sessionId);
		if (
			['agent.get', 'agent.explain', 'agent.prompt', 'agent.wait'].includes(operation) &&
			record?.kind !== 'agent'
		)
			throw new ControlProtocolError(t('agent.managed.targetMissing'), 'TARGET_NOT_FOUND');
		if (['space.get', 'space.rename', 'space.archive', 'terminal.start', 'agent.start'].includes(operation))
			needed(spaceId);
		if (spaceId && !records.spaces[spaceId])
			throw new ControlProtocolError(t('agent.spaces.error.missing'), 'TARGET_NOT_FOUND');
		if (['session.list', 'agent.list'].includes(operation) && params.allSpaces !== true) needed(spaceId);
		let create: CapturedManagedCreate | undefined;
		if (operation === 'terminal.start')
			create = this.workspace.captureManagedCreate({
				kind: 'shell',
				spaceId: needed(spaceId),
				title: text(params.name),
				foreground: false,
			});
		if (operation === 'agent.start') {
			const provider = AGENT_CATALOG.find((agent) => agent.id === params.provider);
			if (!provider) throw new ControlProtocolError(t('agent.managed.invalidInput'));
			create = this.workspace.captureManagedCreate({
				kind: 'agent',
				spaceId: needed(spaceId),
				agentId: provider.id,
				accountId: text(params.account),
				title: text(params.name),
				foreground: params.foreground === true,
			});
		}
		const mutation = !controlDescriptor().operations[operation].readOnly;
		let scope!: Readonly<ControlScope>, plan: ArchivePlan | undefined;
		const envelope = (phase: ControlProgress['phase']): ResponseEnvelope => ({
			protocolVersion: 1,
			requestId: request.requestId,
			operation,
			ok: true,
			target: resolved,
			phase,
			effect: mutation ? 'completed' : 'none',
		});
		const key = () =>
			JSON.stringify([
				scope.vaultId,
				scope.deviceId,
				scope.instanceId,
				scope.rootPath,
				scope.physicalRoot.canonicalPath,
				scope.physicalRoot.dev,
				scope.physicalRoot.ino,
				operation,
				resolved.vaultId,
				resolved.instanceId,
				resolved.spaceId,
				resolved.sessionId,
				resolved.runtimeId,
				resolved.paneId,
				params.allSpaces === true,
			]);
		const session = () => {
			this.sessions.checkManaged(runtime!);
			const value = this.sessions.get(runtime!.runtimeId);
			if (!value) throw new ControlProtocolError(t('agent.control.notRunning'), 'SOURCE_UNAVAILABLE');
			return value;
		};
		const coordination = ['agent.prompt', 'agent.wait', 'terminal.send-text', 'terminal.send-keys'].includes(
			operation,
		)
			? captureTerminalCoordination(
					session(),
					runtime!,
					{ ...request, target, params },
					execution,
					() => resolved,
					after,
				)
			: undefined;
		const response = (
			phase: ControlProgress['phase'],
			data?: unknown,
			effect: ControlProgress['effect'] = mutation ? 'completed' : 'none',
		) => ({ phase, effect, ...(data === undefined ? {} : { data: controlData(data) }) });
		return {
			get target() {
				return resolved;
			},
			mutation,
			preflight: async (captured) => {
				scope = captured;
				if (
					(target.vaultId && target.vaultId !== scope.vaultId) ||
					(target.instanceId && target.instanceId !== scope.instanceId)
				)
					throw new ControlProtocolError(t('agent.spaces.error.scope'), 'SCOPE_MISMATCH');
				resolved = Object.freeze({ vaultId: scope.vaultId, instanceId: scope.instanceId, ...resolved });
				coordination?.preflight();
				if (operation === 'space.rename')
					controlJsonBytes({
						...envelope('renamed'),
						data: controlSpaceRow({
							...this.spaces.store.getState().records.spaces[spaceId!]!,
							name: needed(text(params.name)),
						}),
					});
				if (operation === 'space.archive' || operation === 'session.archive') {
					plan = await this.workspace.previewArchive(
						operation === 'space.archive'
							? { kind: 'space', spaceId: needed(spaceId) }
							: { kind: 'session', ...sessionTarget! },
					);
					const rows: unknown[] = [];
					for (const member of plan.members) {
						rows.push({
							target: member,
							status: 'incomplete',
							effect: 'unknown',
							persisted: false,
							termination: {
								root: { state: 'exited', code: Number.MAX_SAFE_INTEGER, signal: 'x'.repeat(64) },
								cleanup: { state: 'unknown', reason: 'unverifiable', remainingKnown: 32 },
								output: 'truncated',
							},
							error: {
								code: 'EFFECT_UNKNOWN',
								reason: 'x'.repeat(256),
								messageKey: 'x'.repeat(128),
								nextAction: 'inspect-runtime',
								details: { diagnostic: 'x'.repeat(256) },
							},
						});
						controlJsonBytes({
							...envelope('archived'),
							data: {
								scope: plan.scope,
								status: 'incomplete',
								effect: 'unknown',
								rows,
								error: {
									code: 'EFFECT_UNKNOWN',
									reason: 'x'.repeat(256),
									messageKey: 'x'.repeat(128),
									nextAction: 'inspect-runtime',
									details: {},
								},
							},
						});
					}
				}
				// Reserve enough metadata for generated IDs and every possible launch/failure stage, before effects.
				if (mutation) {
					const future = {
						...resolved,
						...(create ? { sessionId: 'x'.repeat(36), runtimeId: 'terminal-' + 'x'.repeat(36) } : {}),
					};
					if (controlJsonBytes({ target: future, phase: 'launch-pending', effect: 'partial' }) > 8192)
						throw new ControlProtocolError(t('agent.control.capacity'), 'CAPACITY_EXCEEDED');
					controlJsonBytes({
						...envelope('completed'),
						target: future,
						data: { name: text(params.name) ?? '', target: future, diagnostic: 'x'.repeat(2048) },
					});
				}
			},
			run: async (progress) => {
				if (runtime) this.sessions.checkManaged(runtime);
				if (coordination) return coordination.run(progress);
				if (create) {
					const result = await create.execute((ref) =>
						progress({ target: { ...resolved, ...ref }, phase: 'launch-pending', effect: 'partial' }),
					);
					if (result.status === 'created')
						return response(result.session.runtime.phase === 'exited' ? 'exited' : 'running', {
							spaceId: result.session.spaceId,
							sessionId: result.session.sessionId,
							title: result.session.title,
							kind: result.session.kind,
							runtime: {
								runtimeId: result.session.runtime.runtimeId,
								phase: result.session.runtime.phase,
								exit: result.session.runtime.exit,
							},
						});
					if (result.status === 'failed') throw new ManagedLaunchError(result.error, result.effect);
					return response('cancelled', result.session, result.effect);
				}
				switch (operation) {
					case 'capabilities':
						return response('listed', { operations: CONTROL_HANDLERS });
					case 'doctor':
						return response('read', {
							connected: true,
							scope: { vaultId: scope.vaultId, deviceId: scope.deviceId, instanceId: scope.instanceId },
						});
					case 'space.list': {
						const current = this.spaces.store.getState().records;
						return response(
							'listed',
							this.paging.list(
								(function* () {
									for (const id in current.spaces) yield controlSpaceRow(current.spaces[id]!);
								})(),
								{
									key: key(),
									revision: this.revision(),
									cursor: text(params.cursor),
									limit: number(params.limit),
								},
								envelope('listed'),
							),
						);
					}
					case 'space.get':
						return response(
							'read',
							controlSpaceRow(this.spaces.store.getState().records.spaces[spaceId!]!),
						);
					case 'space.create': {
						if (params.cwd !== undefined && params.directory !== undefined)
							throw new ControlProtocolError(t('agent.managed.invalidInput'));
						const space =
							params.directory !== undefined
								? await this.spaces.createFromGrant({
										name: needed(text(params.name)),
										grantId: needed(text(params.directory)),
									})
								: await this.spaces.create({
										name: needed(text(params.name)),
										relativePath: text(params.cwd),
									});
						return response('completed', controlSpaceRow(space));
					}
					case 'space.rename':
						await this.spaces.rename(needed(spaceId), needed(text(params.name)));
						return response(
							'renamed',
							controlSpaceRow(this.spaces.store.getState().records.spaces[spaceId!]!),
						);
					case 'session.rename': {
						const renamed = await this.workspace.renameManaged(sessionTarget!, needed(text(params.name)));
						return response('renamed', { ...sessionTarget, title: renamed.title });
					}
					case 'session.list':
					case 'agent.list': {
						const summaries = this.workspace.getManagedSnapshot();
						return response(
							'listed',
							this.paging.list(
								(function* () {
									for (const row of summaries.sessions)
										if (
											(params.allSpaces === true || row.spaceId === spaceId) &&
											(operation !== 'agent.list' || row.kind === 'agent')
										)
											yield row;
								})(),
								{
									key: key(),
									revision: summaries.revision,
									cursor: text(params.cursor),
									limit: number(params.limit),
								},
								envelope('listed'),
							),
						);
					}
					case 'session.get':
					case 'terminal.get':
					case 'agent.get':
					case 'agent.explain':
						return response('read', this.workspace.getManaged(sessionTarget!));
					case 'terminal.read':
						return response(
							'read',
							await this.paging.read(
								session(),
								runtime!,
								{
									key: key(),
									cursor: text(params.cursor),
									limit: number(params.limit),
									maxBytes: number(params.maxBytes),
								},
								envelope('read'),
							),
						);
					case 'terminal.stop': {
						const result = await this.workspace.stopManaged(runtime!, { force: params.force === true });
						if (result.status !== 'stopped')
							return {
								...response('stop-requested', result, result.effect),
								error: {
									code: result.error?.code ?? 'EFFECT_UNKNOWN',
									message: t(result.error?.messageKey ?? 'agent.managed.effectUnknown'),
								},
							};
						return response(
							result.termination?.root.state === 'not-started' ? 'completed' : 'exited',
							result,
							result.effect,
						);
					}
					case 'space.archive':
					case 'session.archive': {
						const result = await this.workspace.archiveManaged(plan!);
						if (result.status !== 'archived')
							return {
								...response('failed', result, result.effect),
								error: {
									code: result.error?.code ?? 'EFFECT_UNKNOWN',
									message: t(result.error?.messageKey ?? 'agent.managed.effectUnknown'),
								},
							};
						return response('archived', result, result.effect);
					}
					default:
						throw new ControlProtocolError(t('agent.control.unavailable'), 'CAPABILITY_UNAVAILABLE');
				}
			},
			dispose: () => {
				coordination?.dispose();
				create?.dispose();
			},
		};
	}
}
