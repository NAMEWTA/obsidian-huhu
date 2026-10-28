import { t } from '../../../../shared/i18n';
import {
	ControlProtocolError,
	controlJsonBytes,
	type ControlJson,
	type ControlProgress,
	type ControlRequest,
	type ControlTarget,
} from '../../../../shared/native/control-wire';
import type { ControlExecutionContext } from '../../core/control/context';
import { truncateUtf8, type InboxMessage, type InboxRecipient } from '../../core/inbox/model';
import { SpaceError } from '../../core/space/errors';
import type { WorkbenchRecords } from '../spaces/records';
import type { SpaceService } from '../spaces/space-service';
import type { InboxService } from '../inbox/service';
import { ControlPaging, controlData, type ResponseEnvelope } from './paging';

export const CONTROL_INBOX_OPERATIONS = Object.freeze(['message.send', 'inbox.list', 'inbox.read', 'inbox.ack'] as const);
export type ControlInboxOperation = (typeof CONTROL_INBOX_OPERATIONS)[number];

export interface PreparedInboxCommand {
	readonly target: Readonly<ControlTarget>;
	readonly mutation: boolean;
	preflight(scope: Readonly<import('../../core/control/context').ControlScope>): Promise<void>;
	run(progress: (value: ControlProgress) => void): Promise<{
		phase: ControlProgress['phase'];
		effect: ControlProgress['effect'];
		data?: ControlJson;
		error?: { code: import('../../../../shared/native/control-wire').ControlErrorCode; message: string };
	}>;
	dispose(): void;
}

interface GenerationState {
	fingerprint: string;
	highWaterSequence: number;
	generation: number;
}

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const recipientKey = (recipient: InboxRecipient): string => `${recipient.spaceId}\u0000${recipient.sessionId}`;
const recipientEqual = (a: InboxRecipient, b: InboxRecipient): boolean =>
	a.spaceId === b.spaceId && a.sessionId === b.sessionId;
const inboxRecord = (message: InboxMessage): ControlJson =>
	controlData({
		messageId: message.messageId,
		recipient: { ...message.recipient },
		source: message.source,
		text: message.body,
		references: message.references,
		sendSequence: message.sendSequence,
		createdAt: message.createdAt,
		...(message.ack ? { ack: { ...message.ack } } : {}),
	});
const inboxSummary = (message: InboxMessage): ControlJson =>
	controlData({
		messageId: message.messageId,
		recipient: { ...message.recipient },
		source: message.source,
		sendSequence: message.sendSequence,
		createdAt: message.createdAt,
		acked: message.ack !== undefined,
	});
const identityData = (messageId: string, recipient?: InboxRecipient, diagnostic?: string, body?: string): ControlJson =>
	controlData({
		messageId,
		...(recipient ? { recipient: { ...recipient } } : {}),
		...(body === undefined ? {} : { text: body }),
		...(diagnostic ? { diagnostic: truncateUtf8(diagnostic, 4096) } : {}),
	});

/** The handler is a thin adapter over the one controller-owned InboxService. */
export class ControlInboxHandler {
	private readonly generations = new Map<string, GenerationState>();
	constructor(
		private readonly inbox: InboxService,
		private readonly spaces: SpaceService,
		private readonly paging: ControlPaging,
	) {}
	clear(): void {
		this.generations.clear();
	}
	private requireRecipient(target: Readonly<ControlTarget>, allowArchived = false): InboxRecipient {
		if (!target.sessionId) throw new ControlProtocolError(t('agent.spaces.error.required'), 'TARGET_REQUIRED');
		if (target.runtimeId || target.paneId) throw new ControlProtocolError(t('agent.managed.invalidInput'), 'INVALID_ARGUMENT');
		const records = this.spaces.store.getState().records;
		const session = records.sessions[target.sessionId];
		if (!session) throw new ControlProtocolError(t('agent.managed.targetMissing'), 'TARGET_NOT_FOUND');
		if (target.spaceId && session.spaceId !== target.spaceId) throw new ControlProtocolError(t('agent.spaces.error.scope'), 'SCOPE_MISMATCH');
		const space = records.spaces[session.spaceId];
		if (!space) throw new ControlProtocolError(t('agent.spaces.error.missing'), 'TARGET_NOT_FOUND');
		if (!allowArchived && (space.archived || session.archived))
			throw new ControlProtocolError(t('agent.control.failed'), 'SOURCE_UNAVAILABLE');
		return { spaceId: session.spaceId, sessionId: target.sessionId };
	}
	private currentGeneration(recipient: InboxRecipient, messages: readonly InboxMessage[], fence = recipientKey(recipient)): GenerationState {
		const key = fence;
		const ordered = [...messages].sort((a, b) => a.sendSequence - b.sendSequence);
		const withoutAck = ordered.map((message) => ({
			messageId: message.messageId,
			recipient: message.recipient,
			source: message.source,
			body: message.body,
			references: message.references,
			sendSequence: message.sendSequence,
			createdAt: message.createdAt,
		}));
		const fingerprint = JSON.stringify(withoutAck);
		const highWaterSequence = ordered.at(-1)?.sendSequence ?? 0;
		const previous = this.generations.get(key);
		if (!previous) {
			const value = { fingerprint, highWaterSequence, generation: 1 };
			this.generations.set(key, value);
			return value;
		}
		let generation = previous.generation;
		const oldRows = JSON.parse(previous.fingerprint) as unknown[];
		const appended = withoutAck.length >= oldRows.length && oldRows.every((row, index) => JSON.stringify(row) === JSON.stringify(withoutAck[index]));
		if (!appended || highWaterSequence < previous.highWaterSequence) generation++;
		const value = { fingerprint, highWaterSequence, generation };
		this.generations.set(key, value);
		return value;
	}
	private async primary(): Promise<WorkbenchRecords> {
		const view = await this.inbox.freshPrimary();
		if (view.freshness !== 'fresh' || !view.records) throw new SpaceError('SOURCE_UNAVAILABLE', view.reason ?? 'inbox-primary-unknown');
		return view.records;
	}
	capture(request: Readonly<ControlRequest>, execution: Readonly<ControlExecutionContext>): PreparedInboxCommand {
		const operation = request.operation as ControlInboxOperation;
		const target = Object.freeze({ ...(request.target ?? {}) });
		const params = Object.freeze({ ...(request.params ?? {}) });
		if (operation === 'message.send' || operation === 'inbox.list') this.requireRecipient(target);
		if ((operation === 'inbox.read' || operation === 'inbox.ack') && (target.runtimeId || target.paneId))
			throw new ControlProtocolError(t('agent.managed.invalidInput'), 'INVALID_ARGUMENT');
		if ((operation === 'inbox.read' || operation === 'inbox.ack') && target.spaceId && !target.sessionId)
			throw new ControlProtocolError(t('agent.spaces.error.required'), 'TARGET_REQUIRED');
		const explicitRecipient = operation === 'inbox.read' || operation === 'inbox.ack'
			? target.sessionId
				? this.requireRecipient(target, true)
				: undefined
			: undefined;
		const messageId = asString(params.message);
		if ((operation === 'inbox.read' || operation === 'inbox.ack') && !messageId)
			throw new ControlProtocolError(t('agent.managed.invalidInput'), 'INVALID_ARGUMENT');
		const sendId = operation === 'message.send' ? messageId : undefined;
		if (operation === 'message.send' && !sendId) throw new ControlProtocolError(t('agent.managed.invalidInput'), 'INVALID_ARGUMENT');
		let resolved: Readonly<ControlTarget> = Object.freeze({ ...target });
		const mutation = operation === 'message.send' || operation === 'inbox.ack';
		const envelope = (phase: ControlProgress['phase'], effect: ControlProgress['effect']): ResponseEnvelope => ({
			protocolVersion: 1,
			requestId: request.requestId,
			operation,
			ok: true,
			target: resolved,
			phase,
			effect: effect === 'partial' ? 'completed' : effect === 'unknown' ? 'completed' : effect,
		});
		return {
			get target() {
				return resolved;
			},
			mutation,
			preflight: async (scope) => {
				if ((target.vaultId && target.vaultId !== scope.vaultId) || (target.instanceId && target.instanceId !== scope.instanceId))
					throw new ControlProtocolError(t('agent.spaces.error.scope'), 'SCOPE_MISMATCH');
				const resolvedRecipient = operation === 'message.send' || operation === 'inbox.list'
					? this.requireRecipient(target)
					: explicitRecipient;
				resolved = Object.freeze({
					vaultId: scope.vaultId,
					instanceId: scope.instanceId,
					...resolved,
					...(resolvedRecipient ? { spaceId: resolvedRecipient.spaceId, sessionId: resolvedRecipient.sessionId } : {}),
				});
				const future = operation === 'message.send' ? identityData(sendId!, resolvedRecipient) : undefined;
				if (future) controlJsonBytes({ ...envelope('record-saved', 'completed'), data: future });
			},
			run: async (progress) => {
				if (operation === 'message.send') {
					if (execution.signal?.aborted) throw new ControlProtocolError(t('agent.coordination.observationCancelled'), 'WAIT_CANCELLED');
					let recipient: InboxRecipient | undefined;
					let body: string | undefined;
					try {
						recipient = this.requireRecipient(target);
						body = asString(params.text);
						if (!body) throw new ControlProtocolError(t('agent.managed.invalidInput'), 'INVALID_ARGUMENT');
						const source = asString(params.source) ?? 'control';
						const refs = params.references === undefined ? [] : params.references;
						if (!Array.isArray(refs)) throw new ControlProtocolError(t('agent.managed.invalidInput'), 'INVALID_ARGUMENT');
						const result = await this.inbox.send({
							messageId: sendId!,
							recipient,
							source,
							body,
							references: refs,
						}, { signal: execution.signal });
						if (result.status === 'unknown')
							return { phase: 'failed', effect: 'unknown', data: identityData(sendId!, recipient, result.error?.diagnostic, body), error: { code: 'EFFECT_UNKNOWN', message: t('agent.managed.effectUnknown') } };
						const saved = result.value!;
						resolved = Object.freeze({ ...resolved, spaceId: saved.recipient.spaceId, sessionId: saved.recipient.sessionId });
						const data = controlData({ messageId: saved.messageId, recipient: saved.recipient, source: saved.source, sendSequence: saved.sendSequence, createdAt: saved.createdAt, fact: 'record-saved' });
						progress({ target: resolved, phase: 'record-saved', effect: 'completed', data });
						return { phase: 'record-saved', effect: 'completed', data };
					} catch (error) {
						const code = error instanceof SpaceError
							? error.code
							: error instanceof ControlProtocolError
								? error.code
								: 'SOURCE_UNAVAILABLE';
						const diagnostic = error instanceof Error ? error.message : String(error);
						const fallback = recipient ?? (resolved.spaceId && target.sessionId ? { spaceId: resolved.spaceId, sessionId: target.sessionId } : undefined);
					return { phase: 'failed', effect: 'none', data: identityData(sendId!, fallback, diagnostic, body), error: { code, message: t('agent.control.failed') } };
					}
				}
				if (operation === 'inbox.list') {
					const recipient = this.requireRecipient(target);
					const records = await this.primary();
					const rows = (records.inbox?.messages ?? []).filter((message) => recipientEqual(message.recipient, recipient)).sort((a, b) => a.sendSequence - b.sendSequence);
					const fence = `${resolved.vaultId ?? ''}\u0000${resolved.instanceId ?? ''}\u0000${recipientKey(recipient)}`;
					const state = this.currentGeneration(recipient, rows, fence);
					const limit = params.limit === undefined ? undefined : Number(params.limit);
					const data = this.paging.listInbox(rows.map(inboxSummary), {
						key: fence,
						revision: state.generation,
						recipient,
						highWaterSequence: state.highWaterSequence,
						generation: state.generation,
						cursor: asString(params.cursor),
						limit,
					},
						envelope('listed', 'none'));
					return { phase: 'listed', effect: 'none', data };
				}
				const message = await this.inbox.read(messageId!, explicitRecipient);
				resolved = Object.freeze({ ...resolved, spaceId: message.recipient.spaceId, sessionId: message.recipient.sessionId });
				if (operation === 'inbox.read') {
					const data = inboxRecord(message);
					return { phase: 'read', effect: 'none', data };
				}
				const result = await this.inbox.ack(message.messageId, message.recipient, { signal: execution.signal });
				if (result.status === 'unknown')
					return { phase: 'failed', effect: 'unknown', data: identityData(message.messageId, message.recipient, result.error?.diagnostic, message.body), error: { code: 'EFFECT_UNKNOWN', message: t('agent.managed.effectUnknown') } };
				const value = result.value ?? message;
				const data = controlData({ messageId: value.messageId, recipient: value.recipient, acked: value.ack !== undefined, fact: result.status === 'already-acked' ? 'already-acked' : 'ack-saved' });
				progress({ target: resolved, phase: result.status === 'already-acked' ? 'read' : 'record-saved', effect: result.effect, data });
				return { phase: result.status === 'already-acked' ? 'read' : 'record-saved', effect: result.effect, data };
			},
			dispose: () => {},
		};
	}
}
