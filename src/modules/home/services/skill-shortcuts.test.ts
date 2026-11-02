import { expect, test } from 'vitest';
import type { AgentDispatchRequest } from '../../agent/api';
import type { SkillShortcut } from '../core/board/types/model';
import { dispatchSkillShortcut, type SkillContext } from './skill-shortcuts';

const skill: SkillShortcut = { id: 'review', label: 'Review', agentId: 'codex', skillName: 'review', promptTemplate: '{{input}}\n{{path}}\n{{paths}}', directSend: false, destination: { kind: 'fresh', cwd: '' } };
const context: SkillContext = { source: { kind: 'widget', path: 'Board.md', id: 'review' }, variables: { path: 'Current.md', paths: 'A.md\nB.md', input: '{{path}} $&' }, files: ['A.md', 'B.md'] };
test('preview captures one immutable declaration and sends edited text, scope and destination verbatim', async () => {
	const next = structuredClone(skill), ctx = structuredClone(context), calls: AgentDispatchRequest[] = [];
	await dispatchSkillShortcut(next, ctx, {
		dispatch: async () => ({ dispatch: async request => { calls.push(request); return { invocationId: request.invocationId, delivery: 'pasted' }; } }), notify: () => {},
		preview: async (captured, capturedContext, draft) => {
			expect(draft.finalPrompt).toBe('$review\n{{path}} $&\nCurrent.md\nA.md\nB.md');
			next.agentId = 'changed'; ctx.files = []; expect(captured.agentId).toBe('codex'); expect(capturedContext.files).toHaveLength(2);
			return { finalPrompt: '  edited {{input}}\n', files: ['B.md'], destination: { kind: 'existing', sessionId: 'selected' } };
		},
	});
	expect(calls).toHaveLength(1); expect(calls[0]).toMatchObject({ agentId: 'codex', finalPrompt: '  edited {{input}}\n', files: ['B.md'], destination: { kind: 'existing', sessionId: 'selected' }, source: context.source });
});
test('direct send is per-button and uses exactly the current scope including an empty scope', async () => {
	for (const files of [[], ['A.md', 'B.md']]) {
		const calls: AgentDispatchRequest[] = [];
		await dispatchSkillShortcut({ ...skill, directSend: true, destination: { kind: 'existing', sessionId: 'gone' } }, { ...context, files, variables: { paths: files.join('\n') } }, {
			dispatch: async () => ({ dispatch: async request => { calls.push(request); return { invocationId: request.invocationId, delivery: 'rejected', errorCode: 'missing' }; } }),
			preview: async () => { throw new Error('direct-send preview'); }, notify: () => {},
		});
		expect(calls).toHaveLength(1); expect(calls[0]?.files).toEqual(files); expect(calls[0]?.destination).toEqual({ kind: 'existing', sessionId: 'gone' });
	}
});
test('cancelled preview, missing module, and page closure never launch', async () => {
	for (const mode of ['cancel', 'off', 'abort']) {
		const abort = new AbortController();
		await dispatchSkillShortcut(skill, context, {
			dispatch: async () => mode === 'off' ? undefined : { dispatch: async () => { throw new Error('must not launch'); } },
			preview: async (_, __, draft) => { if (mode === 'abort') abort.abort(); return mode === 'cancel' ? null : draft; },
			notify: message => { if (mode !== 'off') throw new Error(message); }, signal: abort.signal,
		});
	}
});
test('a fresh skill delivery asks the agent module to settle the Space; it never invents one from the page or cwd', async () => {
	const calls: Array<{ request: AgentDispatchRequest; options?: { interactive?: boolean } }> = [];
	const notes: string[] = [];
	await dispatchSkillShortcut({ ...skill, directSend: true }, context, {
		dispatch: async () => ({ dispatch: async (request, options) => { calls.push({ request, options }); return { invocationId: request.invocationId, delivery: 'rejected', errorCode: 'cancelled' }; } }),
		preview: async () => { throw new Error('direct send'); }, notify: message => notes.push(message),
	});
	expect(calls).toHaveLength(1);
	expect(calls[0]?.options?.interactive).toBe(true);
	expect(calls[0]?.request.destination).toEqual({ kind: 'fresh', cwd: '' });
	expect(notes).toHaveLength(1);
});
test('a skill saved against a Space sends that exact Space with the delivery', async () => {
	const calls: AgentDispatchRequest[] = [];
	await dispatchSkillShortcut({ ...skill, directSend: true, destination: { kind: 'fresh', cwd: '', spaceId: 'space-1' } }, context, {
		dispatch: async () => ({ dispatch: async request => { calls.push(request); return { invocationId: request.invocationId, delivery: 'started' }; } }),
		preview: async () => { throw new Error('direct send'); }, notify: () => {},
	});
	expect(calls[0]?.destination).toEqual({ kind: 'fresh', cwd: '', spaceId: 'space-1' });
});
