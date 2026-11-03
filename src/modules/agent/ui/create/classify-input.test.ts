import { expect, test } from 'vitest';
import { classifyInput, matchingAgents } from './classify-input';
import { AGENT_CATALOG } from '../../core/launch/catalog';
test.each([
	['claude', { kind: 'agent', agentId: 'claude-code' }],
	['Claude Code', { kind: 'agent', agentId: 'claude-code' }],
	['codex', { kind: 'agent', agentId: 'codex' }],
	['', { kind: 'terminal' }],
	['   ', { kind: 'terminal' }],
	['c', undefined],
	['example.com', undefined],
	['?x', undefined],
	['terminal', { kind: 'terminal' }],
	['浏览器', undefined],
])('classifies %s', (input, expected) => {
	expect(classifyInput(input)).toEqual(expected);
});
test('matches only enabled catalog supplied by the caller, exact aliases before word prefixes', () => {
	expect(classifyInput('claude', [])).toBeUndefined();
	expect(matchingAgents('cl', AGENT_CATALOG)[0]?.id).toBe('claude-code');
	expect(matchingAgents('c', AGENT_CATALOG)).toEqual([]);
	expect(classifyInput('mycli', [{ id: 'codex', title: 'Codex', command: 'mycli' }])).toEqual({
		kind: 'agent',
		agentId: 'codex',
	});
});
