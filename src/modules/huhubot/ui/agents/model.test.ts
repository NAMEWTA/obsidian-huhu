import { describe, expect, test } from 'vitest';
import { coordinatorIsMember, draftFromAgent, emptyAgentDraft, historyScope, normalizeAgentDraft } from './model';
import type { Agent } from '../../api';

const agent: Agent = {
	id: 'agent:a', name: 'A', description: 'desc', persona: 'persona', enabled: true, isDefault: false,
	revision: '7', personaRevision: '3', modelBindingRevision: '4', allowedTools: ['note.read'],
	model: { modelId: 'm', providerId: 'p', endpoint: 'https://example.test', credentialRef: 'cred:a', capabilities: ['chat'], protocol: 'openai-responses', revision: '4', credentialStatus: { mode: 'protected', state: 'available' } },
};

describe('agent and group form models', () => {
	test('copies durable agent data into an editable draft without sharing arrays', () => {
		const draft = draftFromAgent(agent);
		expect(draft).toMatchObject({ name: 'A', model: { modelId: 'm' } });
		draft.model!.capabilities.push('tools');
		expect(agent.model!.capabilities).toEqual(['chat']);
	});
	test('normalizes only transport fields and preserves persona whitespace', () => {
		const draft = normalizeAgentDraft({ ...emptyAgentDraft(), name: '  Bot ', persona: '  keep\n', model: { ...emptyAgentDraft().model!, providerId: ' p ', capabilities: ['chat', 'chat', ''] } });
		expect(draft.name).toBe('Bot');
		expect(draft.persona).toBe('  keep\n');
		expect(draft.model?.providerId).toBe('p');
		expect(draft.model?.capabilities).toEqual(['chat']);
	});
	test('history range is deterministic and never emits empty none fields', () => {
		expect(historyScope('none', '2', '9')).toEqual({ kind: 'none' });
		expect(historyScope('range', ' 2 ', '')).toEqual({ kind: 'range', afterSeq: '2' });
	});
	test('coordinator must be one of selected members', () => {
		expect(coordinatorIsMember(['a', 'b'], 'a')).toBe(true);
		expect(coordinatorIsMember(['a', 'b'], 'c')).toBe(false);
	});
});
