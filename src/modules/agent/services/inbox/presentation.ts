import type { InboxRecipient, InboxSource, VaultFileReference } from '../../core/inbox/model';
import { INBOX_LIMITS, truncateUtf8, utf8Bytes } from '../../core/inbox/model';

export type InboxObservationStatus = 'pending' | 'unknown' | 'completed' | 'none';
export type InboxObservationAction = 'send' | 'ack';

export interface InboxObservation {
	readonly attemptId: string;
	readonly action: InboxObservationAction;
	readonly status: InboxObservationStatus;
	readonly messageId: string;
	readonly recipient: InboxRecipient;
	readonly body?: string;
	readonly source?: InboxSource;
	readonly references?: readonly VaultFileReference[];
	readonly diagnostic?: string;
	readonly effect?: 'none' | 'completed' | 'unknown';
}

export interface InboxObservationInput {
	readonly action: InboxObservationAction;
	readonly messageId: string;
	readonly recipient: InboxRecipient;
	readonly body?: string;
	readonly source?: InboxSource;
	readonly references?: readonly VaultFileReference[];
	readonly viewId?: string;
}

export class InboxPresentation {
	private readonly entries = new Map<string, InboxObservation>();
	private readonly viewInFlight = new Map<string, string>();
	private readonly listeners = new Set<() => void>();
	private bytes = 0;
	private closed = false;

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
	private changed(): void {
		for (const listener of [...this.listeners]) listener();
	}
	private encoded(value: InboxObservation): number {
		return utf8Bytes(JSON.stringify(value));
	}
	reserve(input: InboxObservationInput): InboxObservation {
		if (this.closed) throw new Error('inbox-presentation-closed');
		if (this.entries.size >= INBOX_LIMITS.presentationEntries) throw new Error('inbox-presentation-capacity');
		if (input.viewId && this.viewInFlight.has(input.viewId)) throw new Error('inbox-view-pending');
		const attempt: InboxObservation = {
			attemptId: crypto.randomUUID(),
			action: input.action,
			status: 'pending',
			messageId: input.messageId,
			recipient: { ...input.recipient },
			...(input.body === undefined ? {} : { body: input.body }),
			...(input.source === undefined ? {} : { source: input.source }),
			...(input.references === undefined ? {} : { references: structuredClone(input.references) }),
		};
		const bytes = this.encoded(attempt) + INBOX_LIMITS.presentationDiagnosticBytes;
		if (this.bytes + bytes > INBOX_LIMITS.presentationBytes) throw new Error('inbox-presentation-capacity');
		this.entries.set(attempt.attemptId, attempt);
		this.bytes += bytes;
		if (input.viewId) this.viewInFlight.set(input.viewId, attempt.attemptId);
		this.changed();
		return attempt;
	}
	update(attemptId: string, patch: Pick<InboxObservation, 'status'> & Partial<Pick<InboxObservation, 'diagnostic' | 'effect'>>): InboxObservation {
		const current = this.entries.get(attemptId);
		if (!current) throw new Error('inbox-attempt-missing');
		const next: InboxObservation = {
			...current,
			status: patch.status,
			...(patch.diagnostic === undefined ? {} : { diagnostic: truncateUtf8(patch.diagnostic, INBOX_LIMITS.presentationDiagnosticBytes) }),
			...(patch.effect === undefined ? {} : { effect: patch.effect }),
		};
		const oldBytes = this.encoded(current);
		const nextBytes = this.encoded(next);
		if (this.bytes - oldBytes + nextBytes > INBOX_LIMITS.presentationBytes) throw new Error('inbox-presentation-capacity');
		this.entries.set(attemptId, next);
		this.bytes += nextBytes - oldBytes;
		if (next.status !== 'pending') for (const [view, id] of this.viewInFlight) if (id === attemptId) this.viewInFlight.delete(view);
		this.changed();
		return next;
	}
	complete(attemptId: string, status: Exclude<InboxObservationStatus, 'pending'>, effect: InboxObservation['effect'], diagnostic?: string): InboxObservation {
		return this.update(attemptId, { status, effect, diagnostic });
	}
	get(attemptId: string): InboxObservation | undefined { return this.entries.get(attemptId); }
	list(): readonly InboxObservation[] { return [...this.entries.values()].map((entry) => structuredClone(entry)); }
	state(): readonly InboxObservation[] { return this.list(); }
	detach(_viewId: string): void { /* Detaching a leaf never drops pending or unknown observations. */ }
	remove(attemptId: string): boolean {
		const current = this.entries.get(attemptId);
		if (!current || current.status === 'unknown' || current.status === 'pending') return false;
		this.entries.delete(attemptId);
		this.bytes -= this.encoded(current) + INBOX_LIMITS.presentationDiagnosticBytes;
		this.changed();
		return true;
	}
	dispose(): void { this.closed = true; this.listeners.clear(); this.viewInFlight.clear(); }
}
