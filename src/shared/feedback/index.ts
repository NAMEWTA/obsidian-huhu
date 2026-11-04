// Behavior adapted from yeshimei/bz d76a0870329403247917a00c43019e203a2560a4 (MIT): src/core/notice.ts.
// Copyright (c) 2026 叫我包仔
// Changes: instance/window/source scopes, operation identity, commit receipts, privacy and injected presentation/timers.
// Source: https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/notice.ts
import { FEEDBACK_DEDUPE_WINDOW_MS, feedbackDuration } from './policy';

export type FeedbackOutcome = 'success' | 'partial' | 'failed' | 'cancelled' | 'locked';
export type FeedbackLevel = 'info' | 'warning' | 'error';
export type FeedbackParameter = string | number | { sensitive: true; value: string | number };
export interface FeedbackMessage {
	key: string;
	params?: Record<string, FeedbackParameter>;
}
export interface FeedbackInput {
	/** Unique within target/source for the target lifetime. Terminal IDs are retained until closeTarget/dispose; retries use a new ID. */
	operationId: string;
	source: string;
	target: string;
	message: FeedbackMessage;
	level?: FeedbackLevel;
	privacy?: 'public' | 'sensitive';
	/** Required public replacement when the whole message is sensitive. */
	publicMessage?: FeedbackMessage;
	/** Source scope coalesces informational messages only; progress and terminal results retain operation identity. */
	dedupe?: { key: string; scope: 'operation' | 'source'; windowMs?: number };
	progress?: { completed: number; total?: number };
	actions?: ReadonlyArray<{ id: string; label: FeedbackMessage; run(this: void): void | Promise<void> }>;
}
export type FeedbackResult =
	| { outcome?: undefined; receipt?: undefined }
	| { outcome: Exclude<FeedbackOutcome, 'success'>; receipt?: undefined }
	| { outcome: 'success'; receipt: { committed: true } };
export type FeedbackUpdate = FeedbackInput & FeedbackResult;
export interface FeedbackView {
	id: string;
	target: string;
	text: string;
	level: FeedbackLevel;
	outcome?: FeedbackOutcome;
	progress?: { completed: number; total?: number };
	actions: ReadonlyArray<{ id: string; label: string; run(this: void): void | Promise<void> }>;
	durationMs: number;
}
export interface FeedbackOptions {
	translate(key: string, params?: Record<string, string | number>): string;
	present(view: FeedbackView): void;
	remove(id: string, target: string): void;
	now(): number;
	timers: { set(target: string, callback: () => void, ms: number): number; clear(target: string, id: number): void };
}

export function createFeedback(options: FeedbackOptions) {
	const translate = (message: FeedbackMessage) => options.translate(message.key, message.params && Object.fromEntries(
		Object.entries(message.params).map(([key, value]) => [key, typeof value === 'object' ? '[redacted]' : value]),
	));
	const activities = new Map<string, { operationKey: string; view: FeedbackView; timer?: number }>();
	let sequence = 0;
	const operations = new Map<string, string>();
	const terminalOperations = new Map<string, string>();
	const recent = new Map<string, { id: string; until: number; target: string }>();
	const closed = new Set<string>();
	let disposed = false;
	const dismiss = (id: string) => {
		const entry = activities.get(id);
		if (!entry) return;
		if (entry.timer !== undefined) options.timers.clear(entry.view.target, entry.timer);
		activities.delete(id);
		for (const [key, value] of operations) if (value === id) operations.delete(key);
		options.remove(id, entry.view.target);
	};
	return {
		publish(input: FeedbackUpdate): void {
			if (disposed || closed.has(input.target)) return;
			const message = input.privacy === 'sensitive' ? input.publicMessage : input.message;
			if (!message) return;
			const key = JSON.stringify([input.target, input.source, input.operationId]);
			if (terminalOperations.has(key)) return;
			const now = options.now();
			for (const [key, value] of recent) if (value.until <= now) recent.delete(key);
			const coalescible = !input.outcome && !input.progress && input.level !== 'error' ? input.dedupe : undefined;
			const dedupeKey = coalescible
				? JSON.stringify([input.target, input.source, coalescible.scope === 'operation' ? input.operationId : null, coalescible.key])
				: `operation:${key}`;
			const match = recent.get(dedupeKey);
			if (!input.progress && !input.outcome && !operations.has(key) && match && !activities.has(match.id)) return;
			const associatedId = operations.get(key);
			// A shared information display may have changed owners; its other operations retain independent lifecycles.
			const ownedId = associatedId && activities.get(associatedId)?.operationKey === key ? associatedId : undefined;
			const matched = match ? activities.get(match.id) : undefined;
			const sharedId = coalescible && matched && !matched.view.progress && !matched.view.outcome && matched.view.level !== 'error'
				? matched.view.id : undefined;
			const id = ownedId ?? sharedId ?? `feedback-${++sequence}`;
			const previous = activities.get(id);
			if (previous?.view.outcome) return;
			if (input.outcome === 'success' && input.receipt?.committed !== true) return;
			if (previous?.timer !== undefined) options.timers.clear(input.target, previous.timer);
			const view: FeedbackView = {
				id, target: input.target, text: translate(message),
				level: input.outcome === 'failed' ? 'error' : input.outcome === 'partial' || input.outcome === 'locked' ? 'warning' : input.level ?? 'info', outcome: input.outcome,
				progress: input.outcome ? undefined : input.progress,
				actions: input.privacy === 'sensitive' ? [] : (input.actions ?? []).map(action => ({ id: action.id, label: translate(action.label), run: action.run })),
				durationMs: 0,
			};
			view.durationMs = feedbackDuration(view.text, view.level, !!view.progress);
			const entry = { operationKey: key, view, timer: undefined as number | undefined };
			activities.set(id, entry);
			operations.set(key, id);
			if (input.outcome) terminalOperations.set(key, input.target);
			// Source hints must not outlive promotion of their display into an operation status.
			if (view.progress || view.outcome || view.level === 'error') {
				for (const [recentKey, entry] of recent) if (entry.id === id) recent.delete(recentKey);
			}
			recent.set(dedupeKey, { id, target: input.target, until: now + Math.max(0, input.dedupe?.windowMs ?? FEEDBACK_DEDUPE_WINDOW_MS) });
			while (recent.size > 256) recent.delete(recent.keys().next().value!);
			options.present(view);
			if (view.durationMs > 0) entry.timer = options.timers.set(input.target, () => dismiss(id), view.durationMs);
		},
		dismiss,
		closeTarget(target: string): void {
			closed.add(target);
			for (const [id, entry] of activities) if (entry.view.target === target) dismiss(id);
			for (const [key, entry] of recent) if (entry.target === target) recent.delete(key);
			for (const [key, operationTarget] of terminalOperations) if (operationTarget === target) terminalOperations.delete(key);
		},
		dispose(): void {
			disposed = true;
			for (const id of activities.keys()) dismiss(id);
			recent.clear();
			terminalOperations.clear();
			closed.clear();
		},
	};
}
