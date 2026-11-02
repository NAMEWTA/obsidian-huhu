import { expect, it } from 'vitest';
import { mentionChoices, resolveMentionTargets, selectMention, type MentionDraft } from './mentions';

const agents = [{ id: 'agent:a', name: 'Alice', enabled: true }, { id: 'agent:b', name: '同名', enabled: true },
	{ id: 'agent:c', name: '同名', enabled: true }, { id: 'agent:d', name: 'Disabled', enabled: false }];
const session = { kind: 'group' as const, memberIds: agents.map(agent => agent.id) };
const text = (value: string): MentionDraft => ({ text: value, mentions: [] });

it('never infers a dispatch target from plain names, @ text, or ambiguous display labels', () => {
	for (const draft of ['Alice asks 同名', '@同名 please help', '@Alice and @Disabled'])
		expect(resolveMentionTargets(text(draft), session, agents)).toEqual({ valid: true, targetAgentIds: [] });
	const choices = mentionChoices(agents, session.memberIds, '同名');
	expect(choices.map(choice => choice.agentId)).toEqual(['agent:b', 'agent:c']);
	expect(new Set(choices.map(choice => choice.identityLabel)).size).toBe(2);
	expect(choices.every(choice => choice.ambiguous)).toBe(true);
	expect(mentionChoices(agents, session.memberIds).some(choice => choice.agentId === 'agent:d')).toBe(false);
});

it('binds explicit selection to stable IDs, keeps UTF-16 offsets and submits the complete deduplicated target set', () => {
	let draft = selectMention(text('😀 @one @two'), 3, 7, agents[1]!);
	draft = selectMention(draft, 7, 11, agents[2]!);
	expect(draft.text).toBe('😀 @同名 @同名');
	expect(draft.mentions).toEqual([{ agentId: 'agent:b', label: '同名', start: 3, end: 6 }, { agentId: 'agent:c', label: '同名', start: 7, end: 10 }]);
	expect(resolveMentionTargets(draft, session, agents)).toEqual({ valid: true, targetAgentIds: ['agent:b', 'agent:c'] });
	const renamed = agents.map(agent => agent.id === 'agent:b' ? { ...agent, name: 'Renamed' } : agent);
	expect(resolveMentionTargets(draft, session, renamed)).toEqual({ valid: true, targetAgentIds: ['agent:b', 'agent:c'] });
	draft = selectMention({ text: draft.text + ' @again', mentions: draft.mentions }, 11, 17, renamed[1]!);
	expect(resolveMentionTargets(draft, session, renamed)).toEqual({ valid: true, targetAgentIds: ['agent:b', 'agent:c'] });
});

it.each(['unknown', 'disabled', 'removed'] as const)('rejects the whole explicit target batch for an %s member while retaining the exact input', mode => {
	let draft = selectMention(text('@first @second'), 0, 6, agents[1]!);
	draft = selectMention(draft, 4, 11, agents[2]!);
	const original = structuredClone(draft);
	const available = mode === 'unknown' ? agents.filter(agent => agent.id !== 'agent:c') : agents.map(agent => mode === 'disabled' && agent.id === 'agent:c' ? { ...agent, enabled: false } : agent);
	const current = mode === 'removed' ? { ...session, memberIds: ['agent:a', 'agent:b'] } : session;
	expect(resolveMentionTargets(draft, current, available)).toMatchObject({ valid: false, reason: mode === 'unknown' ? 'MENTION_UNKNOWN_AGENT' : mode === 'disabled' ? 'MENTION_AGENT_DISABLED' : 'MENTION_NOT_MEMBER', invalidAgentIds: ['agent:c'] });
	expect(draft).toEqual(original);
});

it('rejects edited, overlapping or split-surrogate tokens without falling back to a coordinator', () => {
	const draft = selectMention(text('😀 @one'), 3, 7, agents[1]!);
	for (const invalid of [
		{ ...draft, text: '😀 @changed' },
		{ ...draft, mentions: [...draft.mentions, { ...draft.mentions[0]! }] },
		{ ...draft, mentions: [{ ...draft.mentions[0]!, start: 1 }] },
		{ ...draft, mentions: [{ ...draft.mentions[0]!, end: 99 }] },
		{ ...draft, mentions: [{ ...draft.mentions[0]!, agentId: '' }] }, // An unresolved composer candidate is not ordinary text.
	]) expect(resolveMentionTargets(invalid, session, agents)).toMatchObject({ valid: false, reason: 'MENTION_TOKEN_INVALID' });
	expect(() => selectMention(draft, 1, 2, agents[2]!)).toThrow('MENTION_TOKEN_INVALID');
});

it('replaces only explicitly selected token ranges and shifts other stable bindings without mutating the original draft', () => {
	const first = selectMention(text('@a @b'), 0, 2, agents[1]!);
	const second = selectMention(first, 4, 6, agents[2]!);
	const replaced = selectMention(second, 0, 3, agents[0]!);
	expect(replaced.text).toBe('@Alice @同名');
	expect(replaced.mentions).toEqual([{ agentId: 'agent:a', label: 'Alice', start: 0, end: 6 }, { agentId: 'agent:c', label: '同名', start: 7, end: 10 }]);
	expect(second.text).toBe('@同名 @同名');
});
