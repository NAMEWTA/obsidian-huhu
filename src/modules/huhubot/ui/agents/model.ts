import type { Agent, AgentDraft, GroupHistoryScope, ModelBindingDraft } from '../../api';

export const PROTOCOLS: readonly ModelBindingDraft['protocol'][] = [
	'openai-chat-completions',
	'openai-responses',
	'anthropic-messages',
];

export function emptyAgentDraft(): AgentDraft {
	return {
		name: '',
		description: '',
		persona: '',
		model: {
			modelId: '',
			providerId: '',
			endpoint: '',
			credentialRef: '',
			capabilities: [],
			protocol: 'openai-responses',
		},
	};
}

function editableModel(model: ModelBindingDraft): ModelBindingDraft {
	return {
		modelId: model.modelId,
		providerId: model.providerId,
		endpoint: model.endpoint,
		credentialRef: model.credentialRef,
		capabilities: [...model.capabilities],
		protocol: model.protocol,
	};
}

export function draftFromAgent(agent?: Agent): AgentDraft {
	if (!agent) return emptyAgentDraft();
	return {
		name: agent.name,
		description: agent.description,
		persona: agent.persona,
		model: agent.model ? editableModel(agent.model) : undefined,
		allowedTools: agent.allowedTools ? [...agent.allowedTools] : undefined,
		allowedCollaborationTargets: agent.allowedCollaborationTargets
			? [...agent.allowedCollaborationTargets]
			: undefined,
	};
}

export function normalizeAgentDraft(draft: AgentDraft): AgentDraft {
	return {
		name: draft.name.trim(),
		description: draft.description.trim(),
		persona: draft.persona,
		model: draft.model && {
			...editableModel(draft.model),
			modelId: draft.model.modelId.trim(),
			providerId: draft.model.providerId.trim(),
			endpoint: draft.model.endpoint.trim(),
			credentialRef: draft.model.credentialRef?.trim() || undefined,
			capabilities: [...new Set(draft.model.capabilities.map((value) => value.trim()).filter(Boolean))],
		},
		allowedTools: draft.allowedTools?.filter(Boolean),
		allowedCollaborationTargets: draft.allowedCollaborationTargets?.filter(Boolean),
	};
}

export function historyScope(kind: GroupHistoryScope['kind'], after: string, through: string): GroupHistoryScope {
	if (kind === 'none') return { kind: 'none' };
	const afterSeq = after.trim(),
		throughSeq = through.trim();
	return { kind: 'range', ...(afterSeq ? { afterSeq } : {}), ...(throughSeq ? { throughSeq } : {}) };
}

export function coordinatorIsMember(memberIds: readonly string[], coordinatorId: string): boolean {
	return coordinatorId.length > 0 && memberIds.includes(coordinatorId);
}
