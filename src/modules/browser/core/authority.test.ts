import { describe, expect, it } from 'vitest';
import { assertRunAuthority, confirmControlAck, isCurrentLease, validateExecutionRef } from './authority';
import type { BrowserRun, BrowserSpace, ControlLease } from './contracts';

function scope() {
	const lease: ControlLease = { spaceId: 'space', runtimeId: 'runtime', leaseId: 'lease', controllerId: 'run', mode: 'agent', epoch: 7, expiresAt: 200 };
	const space: BrowserSpace = { id: 'space', runtimeId: 'runtime', label: 'Task', kind: 'task', retention: 'persistent', status: 'ready', pages: [], createdAt: 1, updatedAt: 1, control: { mode: 'agent', epoch: 7, lease } };
	const run: BrowserRun = { id: 'run', spaceId: 'space', runtimeId: 'runtime', issuerId: 'issuer', state: 'active', epoch: 7, leaseId: 'lease', expiresAt: 200 };
	return { space, lease, run };
}
describe('native authority mirrors', () => {
	it('requires a confirmed runtime, epoch, open transport and safe monotonic sequence', () => {
		const ack = { runtimeId: 'runtime', epoch: 7, transportState: 'open' as const, lastDispatchedSequence: 0 };
		expect(() => confirmControlAck(ack, 'runtime', 7)).not.toThrow();
		for (const patch of [{ runtimeId: 'old' }, { epoch: 8 }, { transportState: 'closed' as const }, { lastDispatchedSequence: -1 }, { lastDispatchedSequence: 0.5 }, { lastDispatchedSequence: Number.MAX_SAFE_INTEGER + 1 }])
			expect(() => confirmControlAck({ ...ack, ...patch }, 'runtime', 7)).toThrow('control_unconfirmed');
		expect(() => confirmControlAck({ ...ack, epoch: 6 }, 'runtime', 7, 'revocation_unconfirmed')).toThrow('revocation_unconfirmed');
	});
	it('binds every run and lease to the current task writer, not just a matching epoch', () => {
		const { space, lease, run } = scope();
		expect(assertRunAuthority(space, run, 100)).toBe(lease);
		for (const patch of [{ id: 'other' }, { runtimeId: 'old' }, { spaceId: 'other' }, { leaseId: 'other' }, { epoch: 6 }, { expiresAt: 100 }, { state: 'revoked' as const }])
			expect(() => assertRunAuthority(space, { ...run, ...patch }, 100)).toThrow('run_revoked');
		expect(() => assertRunAuthority({ ...space, kind: 'personal' }, run, 100)).toThrow('run_revoked');
		expect(() => assertRunAuthority({ ...space, status: 'quarantined' }, run, 100)).toThrow('run_revoked');
	});
	it('rejects expired, replaced and cross-window human leases without creating authority', () => {
		const { space, lease } = scope();
		for (const patch of [{ controllerId: 'other' }, { viewerId: 'other' }, { windowId: 'other' }, { mode: 'human' as const }, { expiresAt: 100 }])
			expect(isCurrentLease(space, { ...lease, ...patch }, 100)).toBe(false);
		expect(isCurrentLease({ ...space, control: { mode: 'paused', epoch: 7 } }, lease, 100)).toBe(false);
	});
	it('validates descriptive external identity without accepting permissions or sharing mutable input', () => {
		const value = { consumerId: 'cli', agentId: 'agent-b', externalRunId: 'task/run-2', attemptId: '2' };
		const parsed = validateExecutionRef(value); value.agentId = 'changed'; expect(parsed.agentId).toBe('agent-b');
		for (const patch of [{ agentId: '' }, { consumerId: 'x'.repeat(129) }, { externalRunId: 'private\ntext' }, { permissions: ['takeover'] }, { role: 'admin' }])
			expect(() => validateExecutionRef({ ...value, ...patch })).toThrow('execution_identity_invalid');
	});
});
