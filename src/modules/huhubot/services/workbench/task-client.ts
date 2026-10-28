import { createStore } from 'zustand/vanilla';
import type { BotClient, Delegation, EffectView, RecoveryStatus, Run } from '../../api';
import { BotRpcError } from '../../core/protocol/connection';
import { sequence } from '../../core/events/reducer';
import { commandMeta, type WorkbenchClient } from './workbench-client';

interface TaskView {
	run?: Run;
	children: Delegation[];
	cursor?: string;
	recovery?: RecoveryStatus;
	effects: EffectView[];
	loading: boolean;
	action?: string;
	error?: string;
}
/** Task reads are generation-bound. Mutating actions keep exact server revisions and never run on page mount. */
export class TaskClient {
	readonly store = createStore<TaskView>(() => ({ children: [], effects: [], loading: false }));
	private request?: AbortController;
	private disposed = false;
	private serial = 0;
	private authorization = 0;
	private unsubscribeWorkspace?: () => void;
	private permissionRevision?: number;
	private lastEvent?: string;
	private factCursor = { runId: '', seq: '0' };
	private pendingRefresh?: string;
	constructor(
		private readonly client: () => BotClient | undefined,
		private readonly workspace?: WorkbenchClient,
	) {
		this.permissionRevision = workspace?.getSnapshot().permissionRevision;
		this.unsubscribeWorkspace = workspace?.subscribe(() => {
			const snapshot = workspace.getSnapshot(),
				run = this.store.getState().run;
			if (snapshot.permissionRevision !== this.permissionRevision) {
				this.permissionRevision = snapshot.permissionRevision;
				this.authorization++;
				this.pendingRefresh = undefined;
				this.request?.abort();
				this.store.setState({
					children: [],
					effects: [],
					recovery: undefined,
					action: undefined,
					error: 'PERMISSION_CHANGED',
					loading: false,
				});
				return;
			}
			if (!run) return;
			const projection = snapshot.threads[run.sessionId]?.projections[run.id];
			if (!projection) return;
			if (
				(projection.status && projection.status !== run.status) ||
				(projection.usage && JSON.stringify(projection.usage) !== JSON.stringify(run.usage)) ||
				(projection.reason !== undefined && projection.reason !== run.reason)
			)
				this.store.setState({
					run: {
						...run,
						status: (projection.status as Run['status'] | undefined) ?? run.status,
						usage: projection.usage ?? run.usage,
						reason: projection.reason ?? run.reason,
					},
				});
			const event = `${run.id}:${projection.metadataSeq}`;
			const prior = this.factCursor.runId === run.id ? this.factCursor.seq : '0';
			const relevantFact = projection.facts.some(
				(fact) =>
					sequence(fact.seq) > sequence(prior) &&
					(fact.type.startsWith('delegation.') ||
						fact.type.startsWith('effect.') ||
						fact.type === 'usage.settled'),
			);
			this.factCursor = { runId: run.id, seq: projection.metadataSeq };
			if (
				this.lastEvent !== event &&
				(relevantFact ||
					[
						'delegation.accepted',
						'delegation.completed',
						'usage.settled',
						'succeeded',
						'failed',
						'canceled',
					].includes(projection.lastEventType ?? '') ||
					projection.lastEventType?.startsWith('effect.'))
			) {
				this.lastEvent = event;
				if (this.store.getState().loading || this.store.getState().action) this.pendingRefresh = run.id;
				else void this.load(run.id);
			}
		});
	}
	async load(id: string, more = false): Promise<void> {
		const bot = this.client();
		if (!bot) {
			this.store.setState({ error: 'HOST_UNAVAILABLE' });
			return;
		}
		this.request?.abort();
		const request = new AbortController();
		this.request = request;
		const serial = ++this.serial;
		this.store.setState({
			loading: true,
			error: undefined,
			...(this.store.getState().run?.id !== id ? { run: undefined, children: [], effects: [] } : {}),
		});
		try {
			const run = await bot.runs.get({ profileId: bot.hello.profile.profileId, id }, { signal: request.signal });
			if (this.workspace) void this.workspace.observeRun(run.sessionId, run.id);
			const [children, recovery] = await Promise.all([
				bot.collaboration.list(
					{
						profileId: bot.hello.profile.profileId,
						runId: id,
						limit: 100,
						...(more && this.store.getState().cursor ? { cursor: this.store.getState().cursor } : {}),
					},
					{ signal: request.signal },
				),
				bot.runs.recovery({ profileId: bot.hello.profile.profileId, id }, { signal: request.signal }),
			]);
			let effectIds: string[] = [];
			const thread = this.workspace?.getSnapshot().threads[run.sessionId];
			effectIds =
				thread?.projections[id]?.facts.flatMap((event) => (event.effectId ? [event.effectId] : [])) ?? [];
			if (typeof bot.runs.subscribe === 'function') {
				try {
					let afterSeq = '0';
					let head: bigint | undefined;
					// Read every page up to the initially observed head. A live producer cannot
					// extend this scan indefinitely, and middle-page receipts are never skipped.
					while (!request.signal.aborted) {
						const page = await bot.runs.subscribe(
							{
								profileId: bot.hello.profile.profileId,
								runId: id,
								afterSeq,
								limit: 128,
								maxBytes: 524288,
								waitMillis: 0,
							},
							{ signal: request.signal },
						);
						effectIds.push(...page.events.flatMap((event) => (event.effectId ? [event.effectId] : [])));
						head ??= sequence(page.headSeq);
						if (!page.hasMore || sequence(page.nextSeq) >= head) break;
						if (sequence(page.nextSeq) <= sequence(afterSeq)) throw new Error('EVENT_LOG_GAP');
						afterSeq = page.nextSeq;
					}
				} catch (error) {
					if (error instanceof BotRpcError && error.data.kind === 'CURSOR_EXPIRED' && error.data.details)
						effectIds.push(
							...error.data.details.snapshot.events.flatMap((event) =>
								event.effectId ? [event.effectId] : [],
							),
						);
					else throw error;
				}
			}
			const effects: EffectView[] = [];
			if (typeof bot.effects?.get === 'function') {
				const ids = [...new Set(effectIds)];
				for (let offset = 0; offset < ids.length && !request.signal.aborted; offset += 16) {
					effects.push(
						...(await Promise.all(
							ids
								.slice(offset, offset + 16)
								.map((effectId) =>
									bot.effects.get(
										{ profileId: bot.hello.profile.profileId, id: effectId },
										{ signal: request.signal },
									),
								),
						)),
					);
				}
			}
			if (this.disposed || request.signal.aborted || serial !== this.serial || this.client() !== bot) return;
			this.workspace?.acceptDelegations(children.items);
			this.store.setState((state) => ({
				run,
				children: more
					? [...new Map([...state.children, ...children.items].map((child) => [child.id, child])).values()]
					: children.items,
				cursor: children.nextCursor,
				recovery,
				effects,
				loading: false,
			}));
		} catch (error) {
			if (!this.disposed && !request.signal.aborted && serial === this.serial)
				this.store.setState({
					loading: false,
					error: 'TASK_READ_FAILED',
					...(error instanceof BotRpcError && error.data.kind === 'CAPABILITY_DENIED'
						? { children: [], effects: [] }
						: {}),
				});
		} finally {
			if (!this.disposed && !request.signal.aborted && serial === this.serial && this.pendingRefresh === id) {
				this.pendingRefresh = undefined;
				void this.load(id);
			}
		}
	}
	private async action(name: string, run: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
		if (this.disposed || this.store.getState().action) return;
		const authorization = this.authorization,
			runId = this.store.getState().run?.id;
		const isCurrent = () =>
			!this.disposed && authorization === this.authorization && this.store.getState().run?.id === runId;
		this.store.setState({ action: name, error: undefined });
		try {
			await run(isCurrent);
		} catch {
			if (isCurrent()) this.store.setState({ error: 'TASK_ACTION_FAILED' });
		} finally {
			if (isCurrent()) this.store.setState({ action: undefined });
		}
	}
	cancel(): Promise<void> {
		return this.action('cancel', async (isCurrent) => {
			const bot = this.client(),
				run = this.store.getState().run;
			if (!bot || !run) return;
			const current = await bot.runs.get({ profileId: bot.hello.profile.profileId, id: run.id });
			if (!isCurrent()) return;
			const receipt = await bot.runs.cancel({
				...commandMeta(bot),
				id: current.id,
				expectedRevision: current.revision,
			});
			if (isCurrent())
				this.store.setState({ run: { ...run, revision: receipt.revision, status: receipt.status } });
		});
	}
	cancelChild(child: Delegation): Promise<void> {
		return this.action(child.id, async (isCurrent) => {
			const bot = this.client();
			if (!bot) return;
			const next = await bot.collaboration.cancel({
				...commandMeta(bot),
				id: child.id,
				expectedRevision: child.revision,
				scope: 'task',
			});
			if (isCurrent())
				this.store.setState((state) => ({
					children: state.children.map((value) => (value.id === next.id ? next : value)),
				}));
		});
	}
	resume(): Promise<void> {
		return this.action('resume', async (isCurrent) => {
			const bot = this.client(),
				run = this.store.getState().run;
			if (!bot || !run) return;
			const recovery = await bot.runs.recovery({ profileId: bot.hello.profile.profileId, id: run.id });
			if (isCurrent()) this.store.setState({ recovery });
			if (recovery.state !== 'ready' || !isCurrent()) return;
			const receipt = await bot.runs.resume({
				...commandMeta(bot),
				id: run.id,
				expectedRevision: recovery.revision,
				recoveryGeneration: recovery.generation,
			});
			if (isCurrent()) {
				this.store.setState({
					run: { ...run, status: receipt.status, revision: receipt.revision },
					recovery: undefined,
				});
				await this.workspace?.refreshRun(run.sessionId, run.id);
				await this.workspace?.refreshHistory(run.sessionId);
			}
		});
	}
	reconcile(effect: EffectView): Promise<void> {
		return this.action(effect.id, async (isCurrent) => {
			const bot = this.client();
			if (!bot) return;
			const next = await bot.effects.reconcile({
				...commandMeta(bot),
				id: effect.id,
				expectedRevision: effect.revision,
			});
			if (isCurrent())
				this.store.setState((state) => ({
					effects: state.effects.map((value) => (value.id === effect.id ? next : value)),
				}));
		});
	}
	dispose(): void {
		this.disposed = true;
		this.request?.abort();
		this.unsubscribeWorkspace?.();
	}
}
