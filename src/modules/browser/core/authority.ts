import { AgentBrowserError, type BrowserExecutionRef, type BrowserRun, type BrowserSpace, type ControlLease, type RevocationAck } from './contracts';

/** Revoke, grant and renewal all acknowledge the same native runtime/epoch boundary. */
export function confirmControlAck(ack: RevocationAck, runtimeId: string, epoch: number, code = 'control_unconfirmed'): void {
	if (!ack || ack.runtimeId !== runtimeId || ack.epoch !== epoch || ack.transportState !== 'open' || !Number.isSafeInteger(ack.lastDispatchedSequence) || ack.lastDispatchedSequence < 0)
		throw new AgentBrowserError(code);
}

/** Pure mirror check. Only the native gate can create authority; this never grants it. */
export function isCurrentLease(space: BrowserSpace, lease: ControlLease, now: number): boolean {
	const current = space.control.lease;
	return space.status === 'ready' && space.id === lease.spaceId && space.runtimeId === lease.runtimeId &&
		space.control.epoch === lease.epoch && space.control.mode === (lease.mode === 'workspace' ? 'quiescing' : lease.mode) &&
		!!current && current.leaseId === lease.leaseId && current.runtimeId === lease.runtimeId && current.spaceId === space.id &&
		current.epoch === lease.epoch && current.controllerId === lease.controllerId && current.mode === lease.mode &&
		current.viewerId === lease.viewerId && current.windowId === lease.windowId && current.expiresAt > now && lease.expiresAt > now;
}

export function assertRunAuthority(space: BrowserSpace, run: BrowserRun, now: number): ControlLease {
	const lease = space.control.lease;
	if (space.kind !== 'task' || run.state !== 'active' || run.expiresAt <= now || run.spaceId !== space.id ||
		!lease || lease.mode !== 'agent' || lease.controllerId !== run.id || lease.leaseId !== run.leaseId ||
		run.epoch !== lease.epoch || run.runtimeId !== lease.runtimeId || !isCurrentLease(space, lease, now))
		throw new AgentBrowserError('run_revoked');
	return lease;
}

export function validateExecutionRef(value: BrowserExecutionRef): BrowserExecutionRef {
	const id = /^[a-zA-Z0-9_.:@/-]{1,128}$/;
	if (!value || Object.keys(value).some(key => !['consumerId', 'agentId', 'externalRunId', 'attemptId'].includes(key)) ||
		![value.consumerId, value.agentId, value.externalRunId, value.attemptId].every(part => typeof part === 'string' && id.test(part)))
		throw new AgentBrowserError('execution_identity_invalid');
	return { consumerId: value.consumerId, agentId: value.agentId, externalRunId: value.externalRunId, attemptId: value.attemptId };
}
