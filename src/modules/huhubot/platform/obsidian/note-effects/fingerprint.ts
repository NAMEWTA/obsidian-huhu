import type { HostInvoke } from '../../../api';
import { hex, noteFault, utf8 } from './primitives';

/** HAP note-effect v1: fixed field order, each UTF-8 field prefixed by its u32BE byte length. */
export async function noteFingerprint(request: HostInvoke): Promise<string> {
	const { preview: p } = request, b = p.binding, t = p.tool;
	if (!b) throw noteFault('NOTE_BINDING_MISMATCH');
	const fields = ['huhu-note-effect-v1', request.profileId, request.commandEpoch, request.effectId, request.runId,
		request.approvalId, request.approvalRevision, request.expiresAt, p.target.workspaceId, p.target.resourceId, p.target.operation, p.target.baseRevision,
		t.name, t.capability, t.capabilityVersion, t.implementationVersion, t.policyVersion, b.deviceId, b.originClientId, b.originViewId,
		b.leaseId, b.hostConnectionId, b.leaseEpoch, b.preparationId, b.baseHash, b.contentHash, b.targetVersion, p.parametersHash, p.previewHash, request.content];
	const encoded = fields.map(value => utf8.encode(value));
	const bytes = new Uint8Array(encoded.reduce((total, value) => total + value.length + 4, 0));
	const view = new DataView(bytes.buffer); let offset = 0;
	for (const value of encoded) { view.setUint32(offset, value.length, false); offset += 4; bytes.set(value, offset); offset += value.length; }
	return `sha256:${hex(await crypto.subtle.digest('SHA-256', bytes))}`;
}
