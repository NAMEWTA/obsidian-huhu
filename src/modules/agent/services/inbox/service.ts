import type { SpaceService, InboxListInput } from '../spaces/space-service';
import { SpaceError } from '../../core/space/errors';
import {
	validateInboxMessage,
	validateMessageId,
	INBOX_LIMITS,
	truncateUtf8,
	type InboxMessage,
	type InboxRecipient,
	type InboxSource,
	type VaultFileReference,
} from '../../core/inbox/model';
import { InboxPresentation, type InboxObservation } from './presentation';
import { validateInboxSource, type VaultInboxSourcePort } from '../../platform/vault/inbox-sources';

export interface InboxServiceOptions {
	readonly spaces: SpaceService;
	readonly sources?: VaultInboxSourcePort;
	readonly presentation?: InboxPresentation;
}
export interface InboxSendRequest {
	readonly messageId: string;
	readonly recipient: InboxRecipient;
	readonly source: InboxSource;
	readonly body: string;
	readonly references?: readonly VaultFileReference[];
	readonly viewId?: string;
}
export interface InboxOperationResult<T> {
	readonly value?: T;
	readonly effect: 'none' | 'completed' | 'unknown';
	readonly status: 'saved' | 'already-acked' | 'none' | 'unknown';
	readonly attemptId?: string;
	readonly error?: { readonly code: string; readonly reason: string; readonly diagnostic: string };
}

/** Thin facade over the SpaceService owner. It never creates a writer or a queue. */
export class InboxService {
	readonly presentation: InboxPresentation;
	private closed = false;
	constructor(private readonly options: InboxServiceOptions) {
		this.presentation = options.presentation ?? new InboxPresentation();
	}
	/** Availability follows this controller-owned service's lifecycle; it never infers a Space. */
	available(_consumer?: string): boolean { return !this.closed; }
	get isAvailable(): boolean { return !this.closed; }
	private ensureOpen(): void {
		if (this.closed) throw new SpaceError('SOURCE_UNAVAILABLE', 'module-closing');
	}
	private failObservation(error: unknown): { effect: 'none' | 'unknown'; status: 'none' | 'unknown'; error: InboxOperationResult<never>['error'] } {
		const space = error instanceof SpaceError ? error : undefined;
		const unknown = space?.code === 'EFFECT_UNKNOWN' || space?.code === 'PERSISTENCE_FAILED';
		return {
			effect: unknown ? 'unknown' : 'none',
			status: unknown ? 'unknown' : 'none',
			error: { code: space?.code ?? 'PERSISTENCE_FAILED', reason: space?.reason ?? 'inbox-failed', diagnostic: truncateUtf8(error instanceof Error ? error.message : String(error), INBOX_LIMITS.presentationDiagnosticBytes) },
		};
	}
	private diagnostic(failure: ReturnType<InboxService['failObservation']>): string {
		return truncateUtf8(failure.error?.diagnostic ?? 'inbox-failed', INBOX_LIMITS.presentationDiagnosticBytes);
	}
	async send(request: InboxSendRequest, options: { signal?: AbortSignal } = {}): Promise<InboxOperationResult<InboxMessage>> {
		this.ensureOpen();
		if (!request.recipient?.spaceId || !request.recipient.sessionId) throw new SpaceError('TARGET_REQUIRED', 'session-required');
		if (!validateMessageId(request.messageId) || !validateInboxMessage({ messageId: request.messageId, recipient: request.recipient, source: request.source, body: request.body, references: request.references ?? [], sendSequence: 1, createdAt: 0 }))
			throw new SpaceError('INVALID_ARGUMENT', 'inbox-message-invalid');
		const references = request.references ?? [];
		if (this.options.sources) {
			for (const reference of references) await validateInboxSource(this.options.sources, reference);
		}
		let observation: InboxObservation;
		try {
			observation = this.presentation.reserve({ action: 'send', messageId: request.messageId, recipient: request.recipient, body: request.body, source: request.source, references, viewId: request.viewId });
		} catch (error) {
			throw new SpaceError('INVALID_ARGUMENT', error instanceof Error && error.message === 'inbox-presentation-capacity' ? 'inbox-presentation-capacity' : 'inbox-view-pending');
		}
		try {
			const value = await this.options.spaces.sendInbox({ ...request, references }, options);
			this.presentation.complete(observation.attemptId, 'completed', 'completed');
			return { value, effect: 'completed', status: 'saved', attemptId: observation.attemptId };
		} catch (error) {
			const failure = this.failObservation(error);
			this.presentation.complete(observation.attemptId, failure.status, failure.effect, this.diagnostic(failure));
			if (failure.effect === 'none') throw error;
			return { effect: failure.effect, status: failure.status, attemptId: observation.attemptId, error: failure.error };
		}
	}
	async list(input: InboxListInput) { this.ensureOpen(); return this.options.spaces.listInbox(input); }
	async read(messageId: string, target?: InboxRecipient) { this.ensureOpen(); return this.options.spaces.readInbox(messageId, target); }
	async ack(messageId: string, target?: InboxRecipient, options: { viewId?: string; signal?: AbortSignal } = {}): Promise<InboxOperationResult<InboxMessage>> {
		this.ensureOpen();
		if (!validateMessageId(messageId)) throw new SpaceError('INVALID_ARGUMENT', 'message-id-invalid');
		let observation: InboxObservation | undefined;
		try {
			const current = await this.options.spaces.readInbox(messageId, target);
			if (current.ack) return { value: current, effect: 'none', status: 'already-acked' };
			observation = this.presentation.reserve({ action: 'ack', messageId, recipient: current.recipient, viewId: options.viewId });
			const result = await this.options.spaces.ackInbox(messageId, target, options);
			this.presentation.complete(observation.attemptId, result.effect === 'none' ? 'none' : 'completed', result.effect);
			return { value: result.message, effect: result.effect, status: result.status === 'already-acked' ? 'already-acked' : 'saved', attemptId: observation.attemptId };
		} catch (error) {
			const failure = this.failObservation(error);
			if (observation) this.presentation.complete(observation.attemptId, failure.status, failure.effect, this.diagnostic(failure));
			if (failure.effect === 'none') throw error;
			return { effect: failure.effect, status: failure.status, attemptId: observation?.attemptId, error: failure.error };
		}
	}
	freshPrimary() { this.ensureOpen(); return this.options.spaces.freshInboxPrimary(); }
	observations(): readonly InboxObservation[] { return this.presentation.list(); }
	sendMessage(request: InboxSendRequest, options: { signal?: AbortSignal } = {}) { return this.send(request, options); }
	listMessages(input: InboxListInput) { return this.list(input); }
	readMessage(messageId: string, target?: InboxRecipient) { return this.read(messageId, target); }
	ackMessage(messageId: string, target?: InboxRecipient, options: { viewId?: string; signal?: AbortSignal } = {}) { return this.ack(messageId, target, options); }
	dispose(): void { this.closed = true; this.presentation.dispose(); }
}
