import type { TaskConfigDraft } from '../../api';

/** Matches Application API CanonicalTaskConfigHash v1, including order and literal endpoint bytes. */
export async function canonicalTaskConfigHash(config: TaskConfigDraft): Promise<string> {
	const draft = config.draft;
	const fields = ['huhu-task-config-v1', config.sponsorAgentId, draft.name, draft.description ?? '', draft.persona];
	const list = (values: readonly string[] = []) => { fields.push(String(values.length), ...values); };
	list(draft.allowedTools); list(draft.allowedCollaborationTargets);
	if (!draft.model) fields.push('0');
	else {
		const model = draft.model;
		fields.push('1', model.modelId, model.providerId, model.protocol, model.endpoint, model.credentialRef ?? ''); list(model.capabilities);
	}
	const encoder = new TextEncoder(), encoded = fields.map(value => encoder.encode(value));
	const bytes = new Uint8Array(encoded.reduce((total, field) => total + field.length + 4, 0)), view = new DataView(bytes.buffer);
	let offset = 0;
	for (const field of encoded) { view.setUint32(offset, field.length, false); offset += 4; bytes.set(field, offset); offset += field.length; }
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return `sha256:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
