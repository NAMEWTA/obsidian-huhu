import { describe, expect, test } from 'vitest';
import { coordinatorIsMember, draftFromAgent, emptyAgentDraft, historyScope, normalizeAgentDraft } from './model';
import type { Agent } from '../../api';
import { MethodValidation } from '../../core/protocol/method-validation';

const agent: Agent = {
	id: 'agent:a',
	name: 'A',
	description: 'desc',
	persona: 'persona',
	enabled: true,
	isDefault: false,
	revision: '7',
	personaRevision: '3',
	modelBindingRevision: '4',
	allowedTools: ['note.read'],
	model: {
		modelId: 'm',
		providerId: 'p',
		endpoint: 'https://example.test',
		credentialRef: 'cred:a',
		capabilities: ['chat'],
		protocol: 'openai-responses',
		revision: '4',
		credentialStatus: { mode: 'protected', state: 'available' },
	},
};

describe('agent and group form models', () => {
	test('copies durable agent data into an editable draft without sharing arrays', () => {
		const draft = draftFromAgent(agent);
		expect(draft).toMatchObject({ name: 'A', model: { modelId: 'm' } });
		draft.model!.capabilities.push('tools');
		expect(agent.model!.capabilities).toEqual(['chat']);
	});
	test('an existing model binding produces a valid public update and probe command without read-only response fields', () => {
		const validation = new MethodValidation();
		const draft = normalizeAgentDraft(draftFromAgent(agent));
		expect(
			validation.validate('agents.update', 'params', {
				profileId: 'p',
				commandId: 'c',
				idempotencyKey: 'k',
				commandEpoch: '1',
				id: agent.id,
				expectedRevision: agent.revision,
				draft,
			}),
		).toBe(true);
		expect(validation.validate('models.test', 'params', { profileId: 'p', model: draft.model })).toBe(true);
		expect(draft.model).not.toHaveProperty('revision');
		expect(draft.model).not.toHaveProperty('credentialStatus');
	});
	test('normalizes only transport fields and preserves persona whitespace', () => {
		const draft = normalizeAgentDraft({
			...emptyAgentDraft(),
			name: '  Bot ',
			persona: '  keep\n',
			model: { ...emptyAgentDraft().model!, providerId: ' p ', capabilities: ['chat', 'chat', ''] },
		});
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
