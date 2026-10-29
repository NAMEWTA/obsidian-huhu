/** A single authorized delivery. The final prompt is a snapshot, never a template to expand again. */
export interface AgentDispatchRequest {
	invocationId: string;
	title: string;
	source: { kind: 'dashboard' | 'widget' | 'contacts'; path: string; id: string };
	agentId: string;
	/**
	 * `fresh` starts a new runtime inside one explicit Space. `spaceId` is part of the request identity; it is
	 * never inferred from `cwd`, the visible page or the number of Spaces. `existing` resolves its Space from the
	 * stable session id, so the input cannot change who owns the session.
	 */
	destination: { kind: 'fresh'; cwd: string; spaceId?: string } | { kind: 'existing'; sessionId: string };
	finalPrompt: string;
	files: string[];
}

/** Delivery is independent of model completion. A timeout does not assert that a task stopped. */
export interface AgentDispatchReceipt {
	invocationId: string;
	delivery: 'started' | 'pasted' | 'timeout' | 'rejected';
	runId?: string;
	terminalId?: string;
	errorCode?: string;
}

export function dispatchIdentity(request: AgentDispatchRequest): string {
	return JSON.stringify([request.invocationId, request.title, request.source.kind, request.source.path, request.source.id,
		request.agentId, request.destination.kind, request.destination.kind === 'fresh' ? request.destination.cwd : request.destination.sessionId,
		request.finalPrompt, request.files,
		// Appended so an old recorded request (no Space) keeps its original element positions and only differs by this tail.
		request.destination.kind === 'fresh' ? (request.destination.spaceId ?? null) : null]);
}

/** File references form part of the one delivered block; the prompt snapshot stays unchanged. */
export function dispatchMaterial(request: Pick<AgentDispatchRequest, 'finalPrompt' | 'files'>): string {
	return [request.finalPrompt, ...request.files].join('\n');
}
