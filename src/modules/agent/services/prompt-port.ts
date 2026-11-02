import type { AgentDispatch, AgentDispatchRequest, AgentDispatchReceipt, AgentDirectoryEntry } from '../api';
import type { AutomationInvocations } from '../../automations/api';

/** Bounds delivery waiting without claiming to cancel a runtime task already accepted by automations. */
export function createAgentDispatch(host: {
	agents(): readonly AgentDirectoryEntry[];
	invocations(): AutomationInvocations | undefined;
	/** Space access. `has` is true for an active Space only; `choose` opens the existing Space chooser. */
	spaces: { has(spaceId: string): boolean; choose(signal?: AbortSignal): Promise<string | undefined> };
	clock: Pick<Window, 'setTimeout' | 'clearTimeout'>;
}): AgentDispatch & { dispose(): void } {
	let closed = false;
	const waits = new Set<() => void>();
	return {
		dispatch(input, options = {}) {
			const request: AgentDispatchRequest = structuredClone(input);
			const fail = (errorCode: string, delivery: 'rejected' | 'timeout' = 'rejected'): AgentDispatchReceipt => ({
				invocationId: request.invocationId,
				delivery,
				errorCode,
			});
			if (closed || options.signal?.aborted) return Promise.resolve(fail('cancelled'));
			const agent = host.agents().find((item) => item.id === request.agentId);
			if (!agent) return Promise.resolve(fail('unsupported'));
			if (!agent.enabled) return Promise.resolve(fail('agentDisabled'));
			if (request.destination.kind === 'fresh' && !agent.installed) return Promise.resolve(fail('cliMissing'));
			const invocations = host.invocations();
			if (!invocations) return Promise.resolve(fail('moduleOff'));
			// A fresh runtime belongs to one explicit Space, settled before the invocation exists. An empty cwd means the
			// Space directory; it is never the vault root by default and never chosen from the visible page.
			if (request.destination.kind === 'fresh') {
				const fresh = request.destination;
				if (!fresh.spaceId) {
					// An invocation the journal already knows is answered by the journal (its original receipt, or a
					// conflict when the content differs); only a new unbound request is refused here.
					if (invocations.receipt(request.invocationId)) return send(request, invocations, options);
					if (!options.interactive) return Promise.resolve(fail('spaceRequired'));
					const pick = new AbortController();
					const stop = () => pick.abort();
					waits.add(stop);
					options.signal?.addEventListener('abort', stop, { once: true });
					return host.spaces
						.choose(pick.signal)
						.then(
							(id) => {
								if (!id || closed || pick.signal.aborted || options.signal?.aborted)
									return fail('cancelled');
								fresh.spaceId = id;
								return send(request, invocations, options);
							},
							() => fail('cancelled'),
						)
						.finally(() => {
							waits.delete(stop);
							options.signal?.removeEventListener('abort', stop);
						});
				}
				if (!host.spaces.has(fresh.spaceId)) return Promise.resolve(fail('spaceUnavailable'));
			}
			return send(request, invocations, options);
		},
		dispose() {
			closed = true;
			for (const cancel of [...waits]) cancel();
		},
	};
	function send(
		request: AgentDispatchRequest,
		invocations: AutomationInvocations,
		options: { signal?: AbortSignal },
	): Promise<AgentDispatchReceipt> {
		const fail = (errorCode: string, delivery: 'rejected' | 'timeout' = 'rejected'): AgentDispatchReceipt => ({
			invocationId: request.invocationId,
			delivery,
			errorCode,
		});
		if (closed || options.signal?.aborted) return Promise.resolve(fail('cancelled'));
		return new Promise((resolve) => {
			let settled = false;
			const abort = new AbortController();
			const cancel = () => {
				abort.abort();
				finish(fail('cancelled'));
			};
			const timer = host.clock.setTimeout(() => {
				abort.abort('timeout');
				finish(invocations.receipt(request.invocationId) ?? fail('timeout', 'timeout'));
			}, 10_000);
			const finish = (receipt: AgentDispatchReceipt) => {
				if (settled) return;
				settled = true;
				host.clock.clearTimeout(timer);
				waits.delete(cancel);
				options.signal?.removeEventListener('abort', cancel);
				resolve(receipt);
			};
			waits.add(cancel);
			options.signal?.addEventListener('abort', cancel, { once: true });
			void Promise.resolve()
				.then(() => {
					if (settled || closed || options.signal?.aborted) {
						if (!settled) cancel();
						return;
					}
					return invocations.invoke(request, { signal: abort.signal });
				})
				.then(
					(receipt) => {
						if (receipt) finish(receipt);
					},
					(error: unknown) => {
						const code =
							error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
								? error.code
								: 'operationFailed';
						finish(fail(code));
					},
				);
		});
	}
}
