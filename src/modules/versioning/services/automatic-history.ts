import { createStore } from 'zustand/vanilla';
import type { SettingsHandle } from '../../../shared/settings/store';
import { textHash } from '../../../shared/storage/text-edits';
import type { SyncSettings } from '../settings';
import type { HistoryTrigger } from '../core/local-history';
import type { LocalHistoryStore } from './local-history-store';
import type { CaptureAllocation } from '../core/history-retention';
import type { RestoreCheckpointPort } from '../core/restore';

export interface HistoryCapture { path: string; text: string; sourceId: string }
export interface AutomaticHistoryState { enabled: boolean; phase: 'off' | 'ready' | 'capturing' | 'error'; error?: string; revision: number }
interface Dependencies {
	settings: SettingsHandle<SyncSettings>;
	history: LocalHistoryStore;
	capture(): readonly HistoryCapture[];
	assertProtection(signal: AbortSignal): Promise<void>;
	timers: Pick<Window, 'setTimeout' | 'clearTimeout'>;
	admit?(allocation: CaptureAllocation, checkpoints: RestoreCheckpointPort, signal: AbortSignal): Promise<void>;
	maintain?(signal: AbortSignal): Promise<void>;
}

/** Owns only local snapshots. No note writer, Git commit, or synchronization capability is accepted. */
export class AutomaticHistory {
	private readonly state = createStore<AutomaticHistoryState>(() => ({ enabled: false, phase: 'off', revision: 0 }));
	private timer?: number;
	private off?: () => void;
	private lifetime = new AbortController();
	private tail: Promise<void> = Promise.resolve();
	private readonly captured = new Map<string, string>();
	private readonly pending = new Map<string, Set<AbortController>>();
	private stopped = false;
	constructor(private readonly deps: Dependencies) {}
	get snapshot(): AutomaticHistoryState { return this.state.getState(); }
	subscribe = (listener: () => void) => this.state.subscribe(listener);
	invalidate(path: string): void {
		for (const controller of this.pending.get(path) ?? []) controller.abort();
		for (const key of this.captured.keys()) if (key.endsWith(`\0${path}`)) this.captured.delete(key);
		this.state.setState(state => ({ revision: state.revision + 1 }));
	}
	/** Retire old captures synchronously; persist identity changes in the same order as admitted samples. */
	relocate(from: string, to: string | null): Promise<void> {
		if (this.stopped) return Promise.resolve();
		this.invalidate(from);
		if (to) this.invalidate(to);
		const work = async () => {
			try {
				await this.deps.history.rename(from, to);
				this.state.setState(state => ({ revision: state.revision + 1 }));
			} catch (error) {
				if (this.snapshot.enabled) this.state.setState({ phase: 'error', error: error instanceof Error ? error.message : 'versioning.localHistory.failed' });
				throw error;
			}
		};
		this.tail = this.tail.then(work, work);
		return this.tail;
	}
	start(): void {
		this.stopped = false;
		this.off?.();
		this.off = this.deps.settings.subscribe(() => this.configure());
		this.configure();
	}
	private configure(): void {
		this.deps.timers.clearTimeout(this.timer);
		this.timer = undefined;
		this.lifetime.abort();
		this.lifetime = new AbortController();
		const enabled = this.deps.settings.get().localHistoryEnabled;
		this.state.setState({ enabled, phase: enabled ? this.snapshot.phase === 'error' ? 'error' : 'ready' : 'off', error: enabled ? this.snapshot.error : undefined });
		if (!enabled) this.captured.clear();
		else {
			this.arm();
			if (this.deps.maintain) void this.sample('interval', []);
		}
	}
	private arm(): void {
		if (!this.snapshot.enabled || this.lifetime.signal.aborted) return;
		const signal = this.lifetime.signal;
		this.timer = this.deps.timers.setTimeout(() => {
			this.timer = undefined;
			void this.sample('interval').finally(() => { if (signal === this.lifetime.signal) this.arm(); });
		}, this.deps.settings.get().localHistoryIntervalMinutes * 60_000);
	}
	sample(trigger: HistoryTrigger, captures?: readonly HistoryCapture[]): Promise<void> {
		const lifetime = this.lifetime.signal;
		if (!this.snapshot.enabled || lifetime.aborted) return Promise.resolve();
		let selected: readonly HistoryCapture[];
		try { selected = (captures ?? this.deps.capture()).map(item => ({ ...item })); }
		catch (error) {
			this.state.setState({ phase: 'error', error: error instanceof Error ? error.message : 'versioning.localHistory.failed' });
			return Promise.resolve();
		}
		if (!selected.length) {
			if (trigger === 'interval' && this.deps.maintain) {
				const maintain = async () => {
					try {
						if (lifetime.aborted) return;
						await this.deps.assertProtection(lifetime);
						await this.deps.maintain!(lifetime);
						if (!lifetime.aborted) this.maintained();
					} catch (error) {
						if (!lifetime.aborted) this.state.setState(state => ({ phase: 'error', error: error instanceof Error ? error.message : 'versioning.localHistory.failed', revision: state.revision + 1 }));
					}
				};
				this.tail = this.tail.then(maintain, maintain);
			}
			return this.tail.then(() => undefined, () => undefined);
		}
		const operation = new AbortController();
		const signal = operation.signal;
		const abort = () => operation.abort();
		lifetime.addEventListener('abort', abort, { once: true });
		const pending = selected.map(capture => {
			const controller = new AbortController();
			const abortCapture = () => controller.abort();
			signal.addEventListener('abort', abortCapture, { once: true });
			const set = this.pending.get(capture.path) ?? new Set<AbortController>();
			set.add(controller); this.pending.set(capture.path, set);
			return { capture, controller, abortCapture, set };
		});
		const retire = () => { if (pending.every(item => item.controller.signal.aborted)) operation.abort(); };
		for (const item of pending) item.controller.signal.addEventListener('abort', retire);
		if (lifetime.aborted) operation.abort();
		const work = async () => {
			const previous = this.snapshot;
			let verified = false, working = false;
			try {
				if (signal.aborted) return;
				if (trigger === 'interval' && this.deps.maintain) {
					await this.deps.assertProtection(signal);
					await this.deps.maintain(signal);
					if (signal.aborted) return;
					this.maintained();
				}
				const candidates = [];
				for (const item of pending) {
					if (item.controller.signal.aborted) continue;
					const key = `${item.capture.sourceId}\0${item.capture.path}`;
					const hash = await textHash(item.capture.text);
					if (this.captured.get(key) !== hash || previous.phase === 'error') candidates.push({ ...item, key, hash });
				}
				if (!candidates.length || signal.aborted) return;
				working = true;
				this.state.setState({ phase: 'capturing' });
				await this.deps.assertProtection(signal);
				for (const { capture, controller, key, hash } of candidates) {
					if (signal.aborted) return;
					if (controller.signal.aborted) continue;
					let saved;
					try { saved = await this.deps.history.capture(capture.path, capture.text, trigger, controller.signal,
						this.deps.admit ? (allocation, checkpoints) => this.deps.admit!(allocation, checkpoints, controller.signal) : undefined); }
					catch (error) { if (controller.signal.aborted) continue; throw error; }
					if (signal.aborted) return;
					if (controller.signal.aborted) continue;
					verified = true;
					this.captured.set(key, hash);
					if (this.captured.size > 1000) this.captured.delete(this.captured.keys().next().value!);
					if (saved) this.state.setState(state => ({ revision: state.revision + 1 }));
				}
				if (verified && !signal.aborted) this.state.setState({ phase: 'ready', error: undefined });
			} catch (error) {
				if (!signal.aborted) this.state.setState(state => ({ phase: 'error', error: error instanceof Error ? error.message : 'versioning.localHistory.failed', revision: state.revision + 1 }));
			} finally {
				if (working && !verified && this.snapshot.phase === 'capturing' && !lifetime.aborted)
					this.state.setState({ phase: previous.phase, error: previous.error });
				lifetime.removeEventListener('abort', abort);
				for (const item of pending) {
					signal.removeEventListener('abort', item.abortCapture);
					item.controller.signal.removeEventListener('abort', retire);
					item.set.delete(item.controller);
					if (!item.set.size && this.pending.get(item.capture.path) === item.set) this.pending.delete(item.capture.path);
				}
			}
		};
		this.tail = this.tail.then(work, work);
		return this.tail;
	}
	private maintained(): void {
		this.state.setState(state => ({ revision: state.revision + 1,
			...(state.error === 'versioning.localHistory.quota' ? { phase: 'ready' as const, error: undefined } : {}) }));
	}
	async stop(): Promise<void> {
		this.stopped = true;
		this.off?.(); this.off = undefined;
		this.lifetime.abort();
		this.deps.timers.clearTimeout(this.timer); this.timer = undefined;
		this.captured.clear();
		this.state.setState({ enabled: false, phase: 'off' });
		await this.tail;
	}
}
