// Adapted from yeshimei/bz (MIT), commit d76a0870329403247917a00c43019e203a2560a4:
// src/core/domain-bus.ts. Copyright (c) 2026 叫我包仔.
// HUHU changes: instance-owned typed keys, subscription ownership, cancellation and async failure isolation.

/** Declare keys in the owning domain's api.ts. Payloads carry IDs/versions/hashes/operation IDs/reasons, never secrets or content. */
export interface DomainEventKey<T> {
	readonly id: symbol;
	readonly name: string;
	/** Invariant type marker; no runtime payload is stored on a key. */
	readonly __payload?: (payload: T) => T;
}

/** Keep the returned key as a domain constant; equal names do not alias different keys. */
export function domainEventKey<T>(name: string): DomainEventKey<T> {
	return { id: Symbol(name), name };
}

export interface EventSubscriptionOptions {
	readonly signal?: AbortSignal;
	/** Structural match for context.lifetime; shared never imports Obsidian. */
	readonly lifetime?: { register(cleanup: () => void): void };
}

interface Subscription {
	handler?: (payload: unknown) => void | Promise<void>;
	off: () => void;
}

/** One owner per plugin instance. Events invalidate reads; they are not a write or transaction channel. */
export class DomainEvents {
	private readonly channels = new Map<symbol, Set<Subscription>>();
	private disposed = false;

	/** Optional sanitized diagnostics: only a static key name is reported, never payloads or thrown values. */
	constructor(private readonly onSubscriberError?: (keyName: string) => void | Promise<void>) {}

	/** Subscriptions are independent, even for the same handler. Off/abort/dispose take effect immediately. */
	on<T>(key: DomainEventKey<T>, handler: (payload: T) => void | Promise<void>, options: EventSubscriptionOptions = {}): () => void {
		if (this.disposed || options.signal?.aborted) return () => {};
		let channel = this.channels.get(key.id);
		if (!channel) {
			channel = new Set();
			this.channels.set(key.id, channel);
		}
		const subscription: Subscription = {
			// Erase only the internal payload type: a wrapper would keep handler in the disposer's shared closure.
			handler: handler as (payload: unknown) => void | Promise<void>,
			off: () => {},
		};
		let signal = options.signal;
		const off = () => {
			if (!subscription.handler) return;
			subscription.handler = undefined;
			signal?.removeEventListener('abort', off);
			signal = undefined;
			channel.delete(subscription);
			if (!channel.size) this.channels.delete(key.id);
		};
		subscription.off = off;
		channel.add(subscription);
		signal?.addEventListener('abort', off, { once: true });
		options.lifetime?.register(off);
		return off;
	}

	/** Synchronous fan-out; new subscriptions wait for the next emit. Callers own reentrancy and loop prevention. */
	emit<T>(key: DomainEventKey<T>, payload: T): void {
		for (const subscription of [...(this.channels.get(key.id) ?? [])]) {
			if (!subscription.handler) continue;
			try {
				void Promise.resolve(subscription.handler(payload)).catch(() => this.reportFailure(key.name));
			} catch {
				this.reportFailure(key.name);
			}
		}
	}

	private reportFailure(keyName: string): void {
		try {
			void Promise.resolve(this.onSubscriberError?.(keyName)).catch(() => {
				// A diagnostic sink must not turn an isolated subscriber failure into an unhandled rejection.
			});
		} catch {
			// Diagnostics have no authority to interrupt domain-event delivery.
		}
	}

	/** Terminal and idempotent; detaches abort listeners and releases handlers. Cannot cancel already running work. */
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		for (const channel of this.channels.values()) for (const subscription of [...channel]) subscription.off();
		this.channels.clear();
	}
}
