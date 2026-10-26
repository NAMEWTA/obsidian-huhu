import type { BrowserWorkspaceService } from './workspace';
import { AgentBrowserError, type OperationRecord, type RunGrant } from '../core/contracts';
import { parseMethod, protocolTools, type BrowserMethod } from '../core/protocol';

export interface ConnectionGrant {
	spaceId: string;
	runId: string;
	capability: string;
	allowTaskCreation: boolean;
	created: boolean;
	creation?: { requestId: string; payload: string; result: Promise<unknown> };
	runs: Map<string, RunGrant>;
}
/** A connection carries a fixed Run grant; it never discovers or resumes a replacement Run. */
export class BrowserProtocolService {
	constructor(private readonly workspace: BrowserWorkspaceService) {}
	/** Must run synchronously at the last transport boundary, after all asynchronous ownership checks. */
	finalize(method: BrowserMethod, params: unknown, grant: ConnectionGrant, result: unknown): unknown {
		if (method === 'run.stop') return { stopped: true };
		if (
			method === 'operation.get' ||
			method === 'operation.prepare' ||
			method === 'operation.execute' ||
			method === 'page.open' ||
			method === 'page.close'
		) {
			const p = parseMethod(method, params),
				owned = p.runId === grant.runId ? grant.capability : grant.runs.get(p.runId)?.capability;
			if (owned !== p.capability) throw new AgentBrowserError('capability_scope_mismatch');
			return result ? this.metadata(grant, p.runId, p.capability, result as OperationRecord) : result;
		}
		if (method === 'batch') {
			const p = parseMethod(method, params);
			try {
				this.own(grant, p.runId, p.capability);
			} catch {
				const batch = result as {
					results: OperationRecord[];
					completedCount: number;
					failedIndex?: number;
					truncated?: boolean;
				};
				return {
					...batch,
					results: batch.results.map((record) => {
						const safe = { ...record };
						delete safe.result;
						return safe;
					}),
					error: 'run_revoked',
				};
			}
			return result;
		}
		this.current(grant);
		if (method === 'space.create' || method === 'run.start') {
			const created = result as RunGrant;
			this.own(grant, created.run.id, created.capability);
			return result;
		}
		if (method !== 'status') {
			const p = parseMethod(method, params);
			if ('runId' in p && 'capability' in p) this.own(grant, p.runId, p.capability);
		}
		return result;
	}
	async call(method: BrowserMethod, params: unknown, grant: ConnectionGrant): Promise<unknown> {
		return this.finalize(method, params, grant, await this.dispatch(method, params, grant));
	}
	private current(grant: ConnectionGrant) {
		this.workspace.health(grant.runId, grant.capability);
	}
	private own(grant: ConnectionGrant, runId: string, capability: string) {
		this.current(grant);
		const own = runId === grant.runId ? grant.capability : grant.runs.get(runId)?.capability;
		if (!own || own !== capability) throw new AgentBrowserError('capability_scope_mismatch');
		this.workspace.health(runId, capability);
	}
	private async content<T>(
		grant: ConnectionGrant,
		runId: string,
		capability: string,
		work: () => Promise<T>,
	): Promise<T> {
		this.own(grant, runId, capability);
		const result = await work();
		this.own(grant, runId, capability);
		return result;
	}
	private metadata(grant: ConnectionGrant, runId: string, capability: string, record: OperationRecord) {
		const result = { ...record };
		try {
			this.own(grant, runId, capability);
		} catch {
			delete result.result;
		}
		return result;
	}
	private async operation(
		grant: ConnectionGrant,
		runId: string,
		capability: string,
		work: () => Promise<OperationRecord>,
	) {
		this.own(grant, runId, capability);
		return this.metadata(grant, runId, capability, await work());
	}
	private async dispatch(method: BrowserMethod, params: unknown, grant: ConnectionGrant): Promise<unknown> {
		if (method === 'operation.get') {
			const p = parseMethod(method, params);
			const own = p.runId === grant.runId ? grant.capability : grant.runs.get(p.runId)?.capability;
			if (own !== p.capability) throw new AgentBrowserError('capability_scope_mismatch');
			const result = await this.workspace.operation(p.runId, p.capability, p.operationId);
			return result ? this.metadata(grant, p.runId, p.capability, result) : result;
		}
		this.current(grant);
		switch (method) {
			case 'status':
				parseMethod(method, params);
				return {
					protocolVersion: 2,
					availability: this.workspace.getState().availability,
					spaceId: grant.spaceId,
					tools: protocolTools(),
				};
			case 'space.create': {
				const p = parseMethod(method, params),
					payload = JSON.stringify(p);
				if (grant.creation) {
					if (grant.creation.requestId !== p.requestId)
						throw new AgentBrowserError('workspace_create_grant_required');
					if (grant.creation.payload !== payload) throw new AgentBrowserError('request_conflict');
					const result = await grant.creation.result;
					this.current(grant);
					return result;
				}
				if (!grant.allowTaskCreation || grant.created)
					throw new AgentBrowserError('workspace_create_grant_required');
				grant.created = true;
				const creation = (async () => {
					const space = await this.workspace.createSpace(
						{ kind: 'task', label: p.label, ephemeral: p.ephemeral, url: p.url },
						`connection:${grant.runId}:${p.requestId}`,
					);
					try {
						this.current(grant);
						const run = await this.workspace.resumeAgent(space.id);
						this.current(grant);
						this.workspace.health(run.run.id, run.capability);
						grant.runs.set(run.run.id, run);
						return { spaceId: space.id, ...run };
					} catch (error) {
						await this.workspace.stopSpace(space.id);
						throw error;
					}
				})();
				grant.creation = { requestId: p.requestId, payload, result: creation };
				return creation;
			}
			case 'run.start': {
				const p = parseMethod(method, params),
					known =
						p.spaceId === grant.spaceId
							? { runId: grant.runId, capability: grant.capability }
							: (() => {
									const g = [...grant.runs.values()].find((g) => g.run.spaceId === p.spaceId);
									return g ? { runId: g.run.id, capability: g.capability } : undefined;
								})();
				if (!known) throw new AgentBrowserError('space_forbidden');
				this.own(grant, known.runId, known.capability);
				const result = await this.workspace.startRun(p.spaceId, p.spaceId);
				this.own(grant, known.runId, known.capability);
				if (result.run.id !== known.runId || result.capability !== known.capability)
					throw new AgentBrowserError('run_revoked');
				return result;
			}
			case 'run.stop': {
				const p = parseMethod(method, params);
				this.own(grant, p.runId, p.capability);
				await this.workspace.stopRun(p.runId, p.capability);
				return { stopped: true };
			}
			case 'run.heartbeat': {
				const p = parseMethod(method, params);
				return {
					expiresAt: await this.content(grant, p.runId, p.capability, () =>
						this.workspace.heartbeat(p.runId, p.capability),
					),
				};
			}
			case 'page.list': {
				const p = parseMethod(method, params);
				this.own(grant, p.runId, p.capability);
				return this.workspace.pageList(p.runId, p.capability);
			}
			case 'page.open': {
				const p = parseMethod(method, params);
				return this.operation(grant, p.runId, p.capability, () =>
					this.workspace.pageOpen(p.runId, p.capability, p.requestId, p.url),
				);
			}
			case 'page.close': {
				const p = parseMethod(method, params);
				return this.operation(grant, p.runId, p.capability, () =>
					this.workspace.pageClose(p.runId, p.capability, p.requestId, p.pageId),
				);
			}
			case 'observe': {
				const p = parseMethod(method, params);
				return this.content(grant, p.runId, p.capability, () =>
					this.workspace.observe(p.runId, p.capability, p.pageId),
				);
			}
			case 'operation.prepare': {
				const p = parseMethod(method, params);
				return this.operation(grant, p.runId, p.capability, () =>
					this.workspace.prepare(p.runId, p.capability, p.pageId, p.requestId, p.command),
				);
			}
			case 'operation.execute': {
				const p = parseMethod(method, params);
				return this.operation(grant, p.runId, p.capability, () =>
					this.workspace.execute(p.runId, p.capability, p.operationId, p.command),
				);
			}
			case 'file.list': {
				const p = parseMethod(method, params);
				this.own(grant, p.runId, p.capability);
				return this.workspace.fileList(p.runId, p.capability);
			}
			case 'download.list': {
				const p = parseMethod(method, params);
				this.own(grant, p.runId, p.capability);
				return this.workspace.downloadList(p.runId, p.capability);
			}
			case 'health': {
				const p = parseMethod(method, params);
				this.own(grant, p.runId, p.capability);
				return this.workspace.health(p.runId, p.capability);
			}
			case 'events.poll': {
				const p = parseMethod(method, params);
				this.own(grant, p.runId, p.capability);
				return this.workspace.events(p.runId, p.capability, p.afterSequence);
			}
			case 'batch': {
				const p = parseMethod(method, params);
				this.own(grant, p.runId, p.capability);
				const results: OperationRecord[] = [];
				let bytes = 0;
				for (const [index, command] of p.commands.entries()) {
					let ticket: OperationRecord | undefined;
					try {
						this.own(grant, p.runId, p.capability);
						ticket = await this.workspace.prepare(
							p.runId,
							p.capability,
							p.pageId,
							`${p.requestId}:${index}`,
							command,
						);
						this.own(grant, p.runId, p.capability);
						const result = await this.workspace.execute(p.runId, p.capability, ticket.id, command);
						const safe = this.metadata(grant, p.runId, p.capability, result);
						bytes += new TextEncoder().encode(JSON.stringify(safe)).byteLength;
						if (bytes > 8 * 1024 * 1024) {
							delete safe.result;
							results.push(safe);
							return {
								results,
								truncated: true,
								completedCount: results.filter((r) => r.state === 'completed').length,
							};
						}
						results.push(safe);
						this.own(grant, p.runId, p.capability);
						if (result.state !== 'completed')
							return {
								results,
								failedIndex: index,
								completedCount: results.filter((r) => r.state === 'completed').length,
							};
					} catch (error) {
						if (ticket) {
							const id = ticket.id;
							if (!results.some((r) => r.id === id)) results.push(ticket);
						}
						return {
							results: results.map((r) => this.metadata(grant, p.runId, p.capability, r)),
							failedIndex: index,
							completedCount: results.filter((r) => r.state === 'completed').length,
							error: error instanceof AgentBrowserError ? error.code : 'operation_failed',
						};
					}
				}
				return { results, completedCount: results.length };
			}
		}
	}
}
