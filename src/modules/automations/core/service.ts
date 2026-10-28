import { AutomationError, automationFailure } from '../../../shared/automation/errors';
import {
	AUTOMATION_DEFINITIONS_OWNER,
	AUTOMATION_RUNTIME_OWNER,
	automationRuntimePath,
	isAutomationDefinitionPath,
} from '../api';
import type { RecoveryOwner } from '../../../shared/storage/recovery-contracts';
import { PRECHECK_TIMEOUT_MS, type PrecheckRunner } from './precheck';
import { isDefinition } from '../../../shared/automation/metadata';
import {
	isActiveRun,
	type AgentRuntimePort,
	type AutomationDefinition,
	type AutomationRun,
	type AutomationSourcePort,
	type AutomationActionHandle,
	type AutomationMessage,
} from '../../../shared/automation/types';
import { t } from '../../../shared/i18n/index';
import { JsonStore } from '../../../shared/json-store';
import type { TextStorage } from '../../../shared/storage/ports';
import { latestOccurrence, validateSchedule } from './schedule';
import type { AutomationDefinitionsRepository } from './documents';
import { actionAvailability, actionDefinition } from './actions/registry';
import type { ActionHost } from './actions/definition';
import { calendarDeliveryForRun, canRetryCalendarDelivery } from './calendar-run';
import {
	dispatchIdentity,
	dispatchMaterial,
	type AgentDispatchRequest,
	type AgentDispatchReceipt,
} from '../../../shared/agent-dispatch';

export interface AutomationState {
	definitions: AutomationDefinition[];
	runs: AutomationRun[];
	cursors: Record<string, number>;
	/**
	 * Runs brought in by a backup restore (contracts section 6). Their result is a historical fact: a restart never
	 * publishes a notification for them, and `from` keeps the status they had in the source before they were shown
	 * as non-active. Written only by the restore, never by a normal run.
	 */
	restored?: Record<string, { at: number; from?: AutomationRun['status'] }>;
}
export function validDefinition(value: unknown): value is AutomationDefinition {
	if (!isDefinition(value)) return false;
	const d = value;
	try {
		validateSchedule(d.schedule);
		return true;
	} catch {
		return false;
	}
}
/** Stands in for the host where none was given: actions that need it fail as invalid. */
const unavailableHost: ActionHost = {
	openFile: () => Promise.reject(new AutomationError('invalid')),
	openUrl: () => Promise.reject(new AutomationError('invalid')),
	runCommand: () => {
		throw new AutomationError('invalid');
	},
};
export class AutomationService {
	loadError = '';
	private loaded = false;
	state: AutomationState = { definitions: [], runs: [], cursors: {} };
	private sourceDefinitions: AutomationDefinition[] = [];
	private savedDefinitions: AutomationDefinition[] = [];
	private store: JsonStore<AutomationState>;
	private listeners = new Set<() => void>();
	private evaluating = false;
	private stopped = false;
	private launching = new Set<string>();
	private refreshing?: Promise<void>;
	private writes: Promise<void> = Promise.resolve();
	private launches = new Set<Promise<unknown>>();
	private ownedAgents = new Map<string, { agent: AgentRuntimePort; terminalId: string }>();
	private transitions: Promise<void> = Promise.resolve();
	private needsShutdown = false;
	private invocations = new Map<string, { identity: string; result: Promise<AgentDispatchReceipt> }>();
	private pendingMaterials = new Map<string, AbortController>();
	private pendingActions = new Map<string, AbortController>();
	private ownedActions = new Map<string, { handle: AutomationActionHandle; abort: AbortController }>();
	/** Recovery hold: every state change fails visibly until `resumeWrites` (no silent drop). */
	private recoveryHold = false;
	constructor(
		storage: TextStorage,
		path: string,
		readonly deviceId: string,
		readonly sources: AutomationSourcePort,
		readonly agent: () => AgentRuntimePort | undefined,
		private notify: (run: AutomationRun, definition: AutomationDefinition) => Promise<void>,
		private enabled = true,
		private options: {
			definitions?: AutomationDefinitionsRepository;
			/** What in-process actions do to the host (open a note or address, run a command). */
			host?: ActionHost;
			desktop?: boolean;
			precheck?: PrecheckRunner;
			vaultName?: string;
			attachMaterial?: (request: AgentDispatchRequest, signal: AbortSignal) => Promise<void>;
		} = {},
	) {
		this.store = new JsonStore(storage, path, (value): value is AutomationState => {
			if (!value || typeof value !== 'object') return false;
			const s = value as AutomationState;
			return (
				Array.isArray(s.definitions) &&
				s.definitions.every(validDefinition) &&
				Array.isArray(s.runs) &&
				s.runs.every((r) => r && typeof r.id === 'string' && typeof r.status === 'string') &&
				!!s.cursors &&
				typeof s.cursors === 'object'
			);
		});
	}
	get executionEnabled(): boolean {
		return this.enabled && !this.stopped;
	}
	/** Close admission immediately; await starts, owned processes and durable cancellation. */
	setExecutionEnabled(enabled: boolean): Promise<void> {
		if (!enabled) {
			this.enabled = false;
			for (const pending of this.pendingActions.values()) pending.abort('cancelled');
			this.needsShutdown = true;
			this.emit();
		}
		const transition = this.transitions.then(async () => {
			if (this.stopped) return;
			if (this.needsShutdown) {
				// Stop known processes while an in-flight start finishes. A later pass
				// also catches handles returned after the gate closed.
				const stopping = this.state.runs.filter(isActiveRun).map((run) => this.stop(run));
				const results = await Promise.allSettled([...stopping, ...this.launches]);
				const failure = results.slice(0, stopping.length).find((result) => result.status === 'rejected');
				if (failure?.status === 'rejected') throw failure.reason;
				for (const run of this.state.runs) {
					if (isActiveRun(run) || this.ownedAgents.has(run.id) || this.ownedActions.has(run.id))
						await this.stop(run);
				}
				await this.writes;
				this.needsShutdown = false;
			}
			this.enabled = enabled;
			this.emit();
		});
		this.transitions = transition.catch(() => {});
		return transition;
	}
	private requireExecution(): void {
		if (!this.executionEnabled) throw new AutomationError('moduleOff');
		if (this.recoveryHold) throw new Error('automation-recovery-busy');
	}
	/** Close admission for a backup/restore operation. Nothing is stopped; see `recoveryBusy`. */
	quiesceWrites(): void {
		this.recoveryHold = true;
	}
	resumeWrites(): void {
		this.recoveryHold = false;
	}
	/** Work that blocks a recovery operation; the user stops it, it is never stopped here. */
	recoveryBusy(): string[] {
		const busy = this.state.runs.filter(isActiveRun).map((run) => run.title);
		if (this.launches.size) busy.push(`launches:${this.launches.size}`);
		for (const id of this.ownedActions.keys()) busy.push(`action:${id}`);
		return busy;
	}
	/** Strict drain: every queued transition is awaited and a failed persist rejects. */
	async drainWrites(): Promise<void> {
		await this.transitions;
		await this.writes;
		await this.store.flush();
	}
	/**
	 * Adopt the file after a restore replaced it. Unlike `load` this interrupts nothing, commits nothing and
	 * publishes no notification, so reading imported history can never cause a side effect.
	 */
	async adoptFromDisk(): Promise<void> {
		const state = await this.store.load({ definitions: [], runs: [], cursors: {} });
		this.state = state;
		this.saved = structuredClone(state);
		this.loaded = true;
		this.loadError = '';
		await this.refresh();
		this.emit();
	}
	async load(): Promise<void> {
		try {
			await this.loadData();
			this.loaded = true;
			this.loadError = '';
		} catch (error) {
			this.loadError = String(error);
			throw error;
		} finally {
			this.emit();
		}
	}
	private async loadData(): Promise<void> {
		this.state = await this.store.load(this.state);
		this.saved = structuredClone(this.state);
		await this.commit((state) => {
			for (const run of state.runs)
				if (isActiveRun(run)) {
					run.status = 'interrupted';
					run.endedAt = Date.now();
					run.message = '';
				}
		});
		await this.refresh();
		// Delivery uses run IDs as idempotency keys, including recovery after a crash
		// between committing the run and committing its notification.
		for (const run of this.state.runs) {
			const d = run.definition ?? this.definitions.find((d) => d.id === run.automationId);
			if (d && run.status !== 'skipped') await this.publish(run, d);
		}
	}
	get definitions(): AutomationDefinition[] {
		const rows = [
			...(this.options.definitions ? this.savedDefinitions : this.state.definitions),
			...this.sourceDefinitions,
		];
		const counts = new Map<string, number>();
		for (const d of rows) counts.set(d.id, (counts.get(d.id) ?? 0) + 1);
		return rows.filter((d) => counts.get(d.id) === 1);
	}
	subscribe(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}
	private emit(): void {
		for (const fn of this.listeners) fn();
	}
	refresh(): Promise<void> {
		return (
			this.refreshing ??
			(this.refreshing = Promise.all([
				this.sources.list(),
				this.options.definitions?.list() ?? Promise.resolve([]),
			])
				.then(([rows, saved]) => {
					this.sourceDefinitions = rows;
					this.savedDefinitions = saved;
					this.emit();
				})
				.finally(() => {
					this.refreshing = undefined;
				}))
		);
	}
	async save(d: AutomationDefinition): Promise<void> {
		this.requireExecution();
		if (d.removedAction) throw new AutomationError('removedAction');
		if (!this.loaded) throw new AutomationError('failedLoad');
		if (!validDefinition(d)) throw new AutomationError('invalid');
		this.verifyAction(d);
		const unavailable = actionAvailability(
			d.action.kind,
			d.schedule.kind === 'manual' ? 'manual' : 'scheduled',
			this.options.desktop !== false,
		);
		if (unavailable) throw new Error(t(unavailable));
		const old = this.definitions.find((item) => item.id === d.id);
		if (old && old.deviceId !== this.deviceId) throw new AutomationError('otherDevice');
		const changed =
			!old ||
			JSON.stringify(old.schedule) !== JSON.stringify(d.schedule) ||
			JSON.stringify(old.action) !== JSON.stringify(d.action) ||
			JSON.stringify(old.precheck) !== JSON.stringify(d.precheck);
		const next = { ...d, revision: old ? old.revision + (changed ? 1 : 0) : 1, updatedAt: Date.now() };
		if (!next.source && this.options.definitions) {
			await this.options.definitions.save(next);
			await this.refresh();
		}
		if (next.source) {
			await this.sources.save(next);
			if (this.refreshing) await this.refreshing;
			await this.refresh();
		}
		await this.commit((state) => {
			if (old && changed && JSON.stringify(old.schedule) === JSON.stringify(next.schedule)) {
				const cursor = state.cursors[`${old.id}:${old.revision}`];
				if (cursor !== undefined) state.cursors[`${next.id}:${next.revision}`] = cursor;
			}
			if (!next.source && !this.options.definitions) {
				const index = state.definitions.findIndex((item) => item.id === next.id);
				if (index < 0) state.definitions.push(next);
				else state.definitions[index] = next;
			}
		});
	}
	async remove(d: AutomationDefinition): Promise<void> {
		this.requireExecution();
		if (d.deviceId !== this.deviceId) throw new AutomationError('otherDevice');
		if (this.state.runs.some((r) => r.automationId === d.id && isActiveRun(r)))
			throw new AutomationError('stopFirst');
		if (d.source) {
			await this.sources.remove(d);
			await this.refresh();
		} else if (this.options.definitions) {
			await this.options.definitions.remove(d);
			await this.refresh();
		}
		await this.commit((state) => {
			state.definitions = state.definitions.filter((item) => item.id !== d.id);
		});
	}
	async clearHistory(): Promise<void> {
		this.requireExecution();
		if (!this.loaded) throw new AutomationError('failedLoad');
		await this.commit((state) => {
			state.runs = state.runs.filter(isActiveRun);
		});
	}

	async tick(now = Date.now()): Promise<void> {
		if (!this.loaded || !this.executionEnabled || this.recoveryHold || this.evaluating) return;
		this.evaluating = true;
		try {
			await this.refresh();
			const launches: Promise<unknown>[] = [];
			for (const d of this.definitions) {
				if (!this.executionEnabled) break;
				if (!d.enabled || d.deviceId !== this.deviceId || d.removedAction) continue;
				try {
					const at = latestOccurrence(d.schedule, now);
					const key = `${d.id}:${d.revision}`;
					if (at === null || at <= (this.state.cursors[key] ?? -Infinity)) continue;
					launches.push(
						this.run(d, 'scheduled', at, now).catch((error) =>
							console.error('[HUHU automation]', d.id, error),
						),
					);
				} catch (error) {
					console.error('[HUHU automation]', d.id, error);
				}
			}
			await Promise.all(launches);
		} finally {
			this.evaluating = false;
		}
	}
	run(
		d: AutomationDefinition,
		trigger: 'manual' | 'scheduled' = 'manual',
		at = Date.now(),
		now = Date.now(),
	): Promise<AutomationRun | undefined> {
		const launch = this.execute(d, trigger, at, now);
		this.launches.add(launch);
		void launch.finally(() => this.launches.delete(launch)).catch(() => {});
		return launch;
	}
	retryRun(original: AutomationRun): Promise<AutomationRun | undefined> {
		this.requireExecution();
		const recorded = this.state.runs.find((row) => row.id === original.id);
		if (!recorded || !canRetryCalendarDelivery(recorded) || !recorded.definition)
			return Promise.reject(new AutomationError('calendarRetryUnavailable'));
		const launch = this.execute(recorded.definition, recorded.trigger, recorded.scheduledFor, Date.now(), undefined, undefined, recorded);
		this.launches.add(launch);
		void launch.finally(() => this.launches.delete(launch)).catch(() => {});
		return launch;
	}
	/** Dynamic deliveries use the same durable journal and owned runtime as saved automations. */
	invokeAgent(request: AgentDispatchRequest, signal?: AbortSignal): Promise<AgentDispatchReceipt> {
		this.requireExecution();
		if (!this.loaded || this.loadError) return Promise.reject(new AutomationError('failedLoad'));
		const snapshot = structuredClone(request);
		const identity = dispatchIdentity(snapshot);
		const rejected = (errorCode: string, runId?: string): AgentDispatchReceipt => ({
			invocationId: snapshot.invocationId,
			delivery: 'rejected',
			errorCode,
			runId,
		});
		if (signal?.aborted) return Promise.resolve(rejected('cancelled'));
		if (
			!snapshot.invocationId ||
			!snapshot.agentId ||
			!snapshot.finalPrompt.trim() ||
			snapshot.files.some((file) => !file || /[\r\n\0]/.test(file))
		)
			return Promise.resolve(rejected('invalid'));
		const material = dispatchMaterial(snapshot);
		if (material.length > 64_000) return Promise.resolve(rejected('promptTooLarge'));
		if (
			[...material].some((char) => {
				const code = char.charCodeAt(0);
				return (code < 32 && code !== 9 && code !== 10) || code === 127 || (code >= 128 && code <= 159);
			})
		)
			return Promise.resolve(rejected('invalid'));
		const pending = this.invocations.get(snapshot.invocationId);
		if (pending)
			return pending.identity === identity ? pending.result : Promise.resolve(rejected('invocationConflict'));
		const recorded = this.state.runs.find((run) => run.invocation?.request.invocationId === snapshot.invocationId);
		if (recorded?.invocation) {
			if (dispatchIdentity(recorded.invocation.request) !== identity)
				return Promise.resolve(rejected('invocationConflict', recorded.id));
			return Promise.resolve(recorded.invocation.receipt ?? rejected(recorded.status, recorded.id));
		}
		// Only a NEW invocation needs a Space. An exact repeat of an older accepted request was answered above.
		if (snapshot.destination.kind === 'fresh' && !snapshot.destination.spaceId)
			return Promise.resolve(rejected('spaceRequired'));
		const now = Date.now();
		const definition: AutomationDefinition = {
			id: `invocation:${snapshot.invocationId}`,
			name: snapshot.title,
			enabled: true,
			deviceId: this.deviceId,
			revision: 1,
			schedule: { kind: 'manual' },
			action: {
				kind: 'agent',
				agentId: snapshot.agentId,
				cwd: snapshot.destination.kind === 'fresh' ? snapshot.destination.cwd : '',
				prompt: material,
				sessionMode: 'fresh',
				...(snapshot.destination.kind === 'fresh' ? { spaceId: snapshot.destination.spaceId } : {}),
			},
			source: snapshot.source,
			channels: ['in-app'],
			notifyOn: 'always',
			graceMinutes: 0,
			createdAt: now,
			updatedAt: now,
		};
		const launch = this.execute(definition, 'manual', now, now, snapshot, signal);
		this.launches.add(launch);
		const result = launch.then(
			(run) => run?.invocation?.receipt ?? rejected(run?.status ?? 'invalid', run?.id),
			(error) => {
				// A failed notification cannot turn a durably recorded delivery into a failed delivery.
				const receipt = this.state.runs.find(
					(run) => run.invocation?.request.invocationId === snapshot.invocationId,
				)?.invocation?.receipt;
				if (receipt) return receipt;
				throw error;
			},
		);
		this.invocations.set(snapshot.invocationId, { identity, result });
		void result
			.finally(() => {
				this.invocations.delete(snapshot.invocationId);
				this.launches.delete(launch);
			})
			.catch(() => {});
		return result;
	}
	private async execute(
		d: AutomationDefinition,
		trigger: 'manual' | 'scheduled' = 'manual',
		at = Date.now(),
		now = Date.now(),
		invocation?: AgentDispatchRequest,
		deliverySignal?: AbortSignal,
		retry?: AutomationRun,
	): Promise<AutomationRun | undefined> {
		this.requireExecution();
		if (d.removedAction) throw new AutomationError('removedAction');
		if (!this.loaded || this.stopped || this.launching.has(d.id)) return undefined;
		if (!validDefinition(d)) throw new AutomationError('invalid');
		this.verifyAction(d);
		const unavailable = actionAvailability(d.action.kind, trigger, this.options.desktop !== false);
		if (unavailable) throw new Error(t(unavailable));
		if (d.deviceId !== this.deviceId) throw new AutomationError('otherDevice');
		if (!retry && trigger === 'scheduled' && d.action.kind === 'create-task' && d.action.target === 'calendar') {
			const recorded = this.state.runs.find((row) => row.automationId === d.id && row.revision === d.revision &&
				row.trigger === 'scheduled' && row.scheduledFor === at);
			if (recorded) return recorded;
		}
		const active = this.state.runs.find((r) => r.automationId === d.id && isActiveRun(r));
		if (active && trigger === 'manual') {
			await this.openRun(active);
			return active;
		}
		this.launching.add(d.id);
		d = structuredClone(d);
		const run: AutomationRun = {
			...(invocation ? { invocation: { request: invocation } } : {}),
			definition: d,
			id: crypto.randomUUID(),
			automationId: d.id,
			revision: d.revision,
			title: d.name,
			scheduledFor: at,
			trigger,
			status: 'pending',
			startedAt: now,
			timeline: [{ phase: 'queued', at: now }],
			message: '',
			source: d.source,
			...(retry ? { retryOf: retry.id } : {}),
		};
		const previous = [...this.state.runs].reverse().find((r) => r.automationId === d.id && r.terminalId);
		const runner = actionDefinition(d.action.kind)?.run;
		try {
			run.taskDelivery = retry?.taskDelivery
				? structuredClone(retry.taskDelivery)
				: calendarDeliveryForRun(d, run);
			// No process or external effect may start before the run and cursor are durable.
			await this.commit((state) => {
				state.runs.push(run);
				if (trigger === 'scheduled' && !retry) state.cursors[`${d.id}:${d.revision}`] = at;
			});
		} catch (error) {
			this.launching.delete(d.id);
			throw error;
		}
		try {
			if (!this.executionEnabled || !isActiveRun(run)) return run;
			if (invocation && deliverySignal?.aborted) {
				const timeout = deliverySignal.reason === 'timeout';
				await this.updateRun(run, {
					status: timeout ? 'failed' : 'cancelled',
					endedAt: Date.now(),
					invocation: {
						request: invocation,
						receipt: {
							invocationId: invocation.invocationId,
							runId: run.id,
							delivery: timeout ? 'timeout' : 'rejected',
							errorCode: timeout ? 'timeout' : 'cancelled',
						},
					},
				});
				return run;
			}
			// Before any user precheck command runs: a terminal action with no bound Space is a configuration problem.
			// The run is recorded as failed (`spaceRequired`) and notified; nothing starts and nothing is retried blindly.
			if (
				(d.action.kind === 'agent' || d.action.kind === 'script') &&
				!d.action.spaceId &&
				invocation?.destination.kind !== 'existing'
			)
				throw new AutomationError('spaceRequired');
			if (
				!active &&
				!(!retry && trigger === 'scheduled' && now - at > d.graceMinutes * 60_000 + 120_000) &&
				d.precheck?.command.trim()
			) {
				if (!this.options.precheck) throw new AutomationError('desktopOnly');
				const abort = new AbortController();
				this.pendingActions.set(run.id, abort);
				try {
					await this.updateRun(run, {
						timeline: [...(run.timeline ?? []), { phase: 'precheck', at: Date.now() }],
					});
					// A Space-bound action starts in its Space-bound directory; its precheck runs in that same place.
					const precheckCwd =
						(d.action.kind === 'agent' || d.action.kind === 'script') && this.agent()?.boundCwd
							? await this.agent()!.boundCwd!(d.action.spaceId, d.action.cwd)
							: 'cwd' in d.action
								? d.action.cwd
								: undefined;
					const result = await this.options.precheck({
						precheck: d.precheck,
						cwd: precheckCwd,
						signal: abort.signal,
						timeoutMs: PRECHECK_TIMEOUT_MS,
					});
					if (abort.signal.aborted || !this.executionEnabled || !isActiveRun(run)) return run;
					await this.updateRun(run, { precheckResult: result });
					if (result.exitCode !== 0 || result.timedOut) {
						await this.updateRun(run, {
							status: 'skipped',
							endedAt: Date.now(),
							errorCode: 'precheckFailed',
							message: '',
						});
						return run;
					}
				} finally {
					this.pendingActions.delete(run.id);
				}
			}
			if (!this.executionEnabled || !isActiveRun(run)) return run;
			if (active || (!retry && trigger === 'scheduled' && now - at > d.graceMinutes * 60_000 + 120_000)) {
				await this.updateRun(run, {
					status: 'skipped',
					message: t(active ? 'automation.busy' : 'automation.missed'),
					errorCode: active ? 'busy' : 'missed',
					endedAt: Date.now(),
				});
			} else if (invocation?.destination.kind === 'existing') {
				if (!this.options.attachMaterial) throw new AutomationError('agentUnavailable');
				const abort = new AbortController();
				const cancel = () => abort.abort(deliverySignal?.reason);
				deliverySignal?.addEventListener('abort', cancel, { once: true });
				this.pendingMaterials.set(run.id, abort);
				try {
					await this.options.attachMaterial(invocation, abort.signal);
					if (isActiveRun(run))
						await this.updateRun(run, {
							status: 'delivered',
							endedAt: Date.now(),
							terminalId: invocation.destination.sessionId,
							invocation: {
								request: invocation,
								receipt: {
									invocationId: invocation.invocationId,
									runId: run.id,
									terminalId: invocation.destination.sessionId,
									delivery: 'pasted',
								},
							},
						});
				} finally {
					deliverySignal?.removeEventListener('abort', cancel);
					this.pendingMaterials.delete(run.id);
				}
			} else if (runner?.mode === 'terminal') {
				await this.updateRun(run, {
					timeline: [...(run.timeline ?? []), { phase: 'launching', at: Date.now() }],
				});
				const agent = this.agent();
				if (!agent) throw new AutomationError('agentUnavailable');
				const handle = await runner.start(d.action, {
					agent,
					run,
					previous,
					now,
					vaultName: this.options.vaultName ?? '',
					invocation: !!invocation,
				});
				if (!handle) throw new AutomationError('agentUnavailable');
				this.ownedAgents.set(run.id, { agent, terminalId: handle.terminalId });
				if (!this.executionEnabled && !this.stopped) return run;
				if (this.stopped || !isActiveRun(run)) {
					await agent.stop(handle.terminalId);
					this.ownedAgents.delete(run.id);
					return run;
				}
				try {
					await this.updateRun(run, {
						...(invocation
							? {
									invocation: {
										request: invocation,
										receipt: {
											invocationId: invocation.invocationId,
											delivery: 'started' as const,
											runId: run.id,
											terminalId: handle.terminalId,
										},
									},
								}
							: {}),
						terminalId: handle.terminalId,
						session: handle.session,
						status: 'unknown',
						timeline: [...(run.timeline ?? []), { phase: 'submitted', at: Date.now() }],
					});
				} catch (error) {
					await agent.stop(handle.terminalId);
					this.ownedAgents.delete(run.id);
					throw error;
				}
				const unsubscribe = handle.onRunning?.(() => {
					if (isActiveRun(run)) {
						void this.updateRun(run, { status: 'running' }).catch(console.error);
					}
				});
				void handle.completion
					.then(async (result) => {
						unsubscribe?.();
						this.ownedAgents.delete(run.id);
						if (!isActiveRun(run)) return;
						await this.updateRun(run, { ...result, endedAt: Date.now() });
						if (!this.stopped) await this.publish(run, d);
					})
					.catch(console.error);
			} else {
				if (runner?.mode !== 'direct') throw new AutomationError('invalid');
				let outcome: AutomationMessage = { message: '' };
				const abort = new AbortController();
				const cancel = () => {
					abort.abort('cancelled');
					void this.stop(run).catch(console.error);
				};
				deliverySignal?.addEventListener('abort', cancel, { once: true });
				let retained = false;
				this.pendingActions.set(run.id, abort);
				try {
					if (deliverySignal?.aborted || !this.executionEnabled || !isActiveRun(run)) {
						cancel();
						return run;
					}
					const result = await runner.execute(d.action, {
						run,
						desktop: this.options.desktop !== false,
						signal: abort.signal,
						sources: this.sources,
						host: this.options.host ?? unavailableHost,
						checkpointTask: async (delivery) => {
							const written = !!delivery.receipt;
							if (!written && (abort.signal.aborted || !this.executionEnabled || !isActiveRun(run)))
								throw new AutomationError('cancelled');
							await this.updateRun(run, { taskDelivery: delivery }, written);
						},
					});
					outcome = { message: result.message, errorCode: result.errorCode, errorParams: result.errorParams };
					if (result.handle) {
						void result.handle.completion.catch(() => undefined);
						const owned = { handle: result.handle, abort };
						this.ownedActions.set(run.id, owned);
						if (!this.executionEnabled || !isActiveRun(run) || abort.signal.aborted) {
							abort.abort();
							await result.handle.cancel();
							this.ownedActions.delete(run.id);
							return run;
						}
						try {
							await this.updateRun(run, { status: 'running', ...outcome });
						} catch (error) {
							abort.abort();
							await result.handle.cancel();
							this.ownedActions.delete(run.id);
							throw error;
						}
						retained = true;
						void result.handle.completion
							.then(
								async (completion) => {
									if (isActiveRun(run))
										await this.updateRun(run, { ...completion, endedAt: Date.now() });
									if (!this.stopped) await this.publish(run, d);
								},
								async (error) => {
									if (isActiveRun(run))
										await this.updateRun(run, {
											status: 'failed',
											endedAt: Date.now(),
											...automationFailure(error),
										});
									if (!this.stopped) await this.publish(run, d);
								},
							)
							.finally(() => {
								deliverySignal?.removeEventListener('abort', cancel);
								if (this.ownedActions.get(run.id) === owned) this.ownedActions.delete(run.id);
							})
							.catch(console.error);
						return run;
					}
				} finally {
					this.pendingActions.delete(run.id);
					if (!retained) deliverySignal?.removeEventListener('abort', cancel);
				}
				await this.updateRun(run, { status: 'succeeded', ...outcome, endedAt: Date.now() });
			}
		} catch (error) {
			const code =
				error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
					? error.code
					: 'operationFailed';
			await this.updateRun(run, {
				...(invocation
					? {
							invocation: {
								request: invocation,
								receipt: {
									invocationId: invocation.invocationId,
									runId: run.id,
									delivery: code === 'timeout' ? ('timeout' as const) : ('rejected' as const),
									errorCode: code,
								},
							},
						}
					: {}),
				status: 'failed',
				endedAt: Date.now(),
				...automationFailure(error),
			});
		} finally {
			this.launching.delete(d.id);
		}
		if (!this.stopped && !isActiveRun(run) && run.status !== 'skipped') await this.publish(run, d);
		return run;
	}
	private verifyAction(definition: AutomationDefinition): void {
		actionDefinition(definition.action.kind)?.verify?.(definition.action);
	}
	async stop(run: AutomationRun): Promise<void> {
		this.pendingMaterials.get(run.id)?.abort();
		this.pendingActions.get(run.id)?.abort('cancelled');
		const action = this.ownedActions.get(run.id);
		action?.abort.abort('cancelled');
		const owned = this.ownedAgents.get(run.id);
		if (!isActiveRun(run) && !owned && !action) return;
		// Persist cancellation first so a simultaneous completion cannot overwrite it.
		await this.updateRun(
			run,
			{
				status: 'cancelled',
				endedAt: Date.now(),
				terminalId: owned?.terminalId ?? run.terminalId,
				...(run.invocation && !run.invocation.receipt
					? {
							invocation: {
								...run.invocation,
								receipt: {
									invocationId: run.invocation.request.invocationId,
									runId: run.id,
									delivery: 'rejected' as const,
									errorCode: 'cancelled',
								},
							},
						}
					: {}),
			},
			true,
		);
		try {
			if (action) await action.handle.cancel();
			if (owned) await owned.agent.stop(owned.terminalId);
			else if (run.terminalId) await this.agent()?.stop(run.terminalId);
			if (this.ownedAgents.get(run.id) === owned) this.ownedAgents.delete(run.id);
			if (this.ownedActions.get(run.id) === action) this.ownedActions.delete(run.id);
		} catch (error) {
			await this.updateRun(run, { status: 'unknown', endedAt: undefined, ...automationFailure(error) }, true);
			throw error;
		}
	}
	async openRun(run: AutomationRun): Promise<void> {
		const action = this.ownedActions.get(run.id);
		if (action) await action.handle.open();
		else if (run.terminalId) await this.agent()?.open(run.terminalId);
	}
	private async publish(run: AutomationRun, definition: AutomationDefinition): Promise<void> {
		if (!this.executionEnabled || run.notificationAttempted || this.state.restored?.[run.id]) return;
		await this.notify(run, definition);
		await this.updateRun(run, { notificationAttempted: true }, true);
	}
	private updateRun(run: AutomationRun, patch: Partial<AutomationRun>, terminal = false): Promise<void> {
		return this.commit((state) => {
			const row = state.runs.find((r) => r.id === run.id);
			if (row && (terminal || isActiveRun(row))) {
				Object.assign(row, patch);
				if (patch.endedAt && row.timeline && !row.timeline.some((event) => event.phase === 'completed'))
					row.timeline.push({ phase: 'completed', at: patch.endedAt });
			}
		});
	}
	/** Serialize state transitions; publish only after successful persistence. */
	private saved?: AutomationState;
	private commit(change: (state: AutomationState) => void): Promise<void> {
		if (this.recoveryHold) return Promise.reject(new Error('automation-recovery-busy'));
		const operation = this.writes.then(async () => {
			let next = structuredClone(this.state);
			change(next);
			const counts = new Map<string, number>();
			next.runs = next.runs
				.slice()
				.reverse()
				.filter((r) => {
					if (isActiveRun(r)) return true;
					const n = (counts.get(r.automationId) ?? 0) + 1;
					counts.set(r.automationId, n);
					return n <= 100;
				})
				.reverse();
			if (next.restored) {
				const ids = new Set(next.runs.map((row) => row.id));
				for (const id of Object.keys(next.restored)) if (!ids.has(id)) delete next.restored[id];
				if (!Object.keys(next.restored).length) delete next.restored;
			}
			// Preserve references held by live completion handlers and callers.
			const live = new Map([...next.runs, ...this.state.runs].map((row) => [row.id, row]));
			next = await this.store.commit({ base: this.saved ?? this.state, value: next });
			this.saved = structuredClone(next);
			next.runs = next.runs.map((row) => {
				const existing = live.get(row.id);
				if (!existing) return row;
				for (const key of Object.keys(existing)) if (!(key in row)) Reflect.deleteProperty(existing, key);
				return Object.assign(existing, row);
			});
			this.state = next;
			this.emit();
		});
		this.writes = operation.catch(() => {});
		return operation;
	}
	dispose(): void {
		void this.shutdown().catch(console.error);
	}
	async shutdown(): Promise<void> {
		this.stopped = true;
		for (const pending of this.pendingMaterials.values()) pending.abort();
		for (const pending of this.pendingActions.values()) pending.abort('interrupted');
		for (const action of this.ownedActions.values()) action.abort.abort('interrupted');
		this.listeners.clear();
		if (!this.loaded) return;
		await Promise.allSettled([...this.launches]);
		await Promise.all([...this.ownedAgents.values()].map((owned) => owned.agent.stop(owned.terminalId)));
		await Promise.all([...this.ownedActions.values()].map((owned) => owned.handle.cancel()));
		this.ownedAgents.clear();
		this.ownedActions.clear();
		await this.commit((state) => {
			for (const run of state.runs)
				if (isActiveRun(run)) {
					run.status = 'interrupted';
					run.endedAt = Date.now();
				}
		});
		await this.store.flush();
	}
}

/**
 * The two files this module really writes, as recovery owners: run history/invocations/results (one device file)
 * and the Markdown definition documents. Active runs are listed as busy, never stopped; adoption reads and sends nothing.
 */
export function automationRecoveryOwners(service: AutomationService, deviceId: string): RecoveryOwner[] {
	const runtimePath = automationRuntimePath(deviceId);
	const gate = {
		quiesce: async () => service.quiesceWrites(),
		drain: () => service.drainWrites(),
		adopt: () => service.adoptFromDisk(),
		release: async () => service.resumeWrites(),
	};
	return [
		{
			id: AUTOMATION_RUNTIME_OWNER,
			owns: (path) => path === runtimePath,
			preflight: async () => ({ busy: service.recoveryBusy() }),
			...gate,
		},
		{ id: AUTOMATION_DEFINITIONS_OWNER, owns: isAutomationDefinitionPath, preflight: async () => ({ busy: [] }), ...gate },
	];
}
