import type { HostLease } from '../../api';

/** A renewal extends an existing live identity and never changes its authority. */
export function isHostLeaseRenewal(previous: HostLease | undefined, next: HostLease | undefined): boolean {
	return !!previous && !!next && Date.parse(previous.expiresAt) > Date.now() && Date.parse(next.expiresAt) >= Date.parse(previous.expiresAt) &&
		previous.leaseId === next.leaseId && previous.leaseEpoch === next.leaseEpoch && previous.hostConnectionId === next.hostConnectionId &&
		previous.workspaceId === next.workspaceId && previous.capabilities.length === next.capabilities.length &&
		previous.capabilities.every((capability, index) => capability === next.capabilities[index]);
}
