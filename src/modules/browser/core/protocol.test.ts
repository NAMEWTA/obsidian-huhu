import { expect, it } from 'vitest';
import { parseMethod, parseEventResult, protocolTools, snapshotScope, validatePageUrl, humanInputSchema } from './protocol';
it('validates trusted composition UTF-16 bounds and keeps it out of the Agent command schema', () => {
	const input = { kind: 'composition', phase: 'update', text: '中😀', selectionStart: 1, selectionEnd: 3 };
	expect(humanInputSchema.safeParse(input).success).toBe(true);
	for (const changed of [{ selectionEnd: 4 }, { selectionStart: 3, selectionEnd: 1 }, { phase: 'arbitrary' }, { phase: 'cancel' }, { text: '密'.repeat(17000) }, { script: '1' }]) expect(humanInputSchema.safeParse({ ...input, ...changed }).success).toBe(false);
	expect(() => parseMethod('operation.prepare', { runId: 'r', capability: 'a'.repeat(40), pageId: 'p', requestId: 'q', command: { kind: 'input', input, inputSequence: 1 } })).toThrow('invalid_request');
});
it('exposes only fixed Agent commands from the shared schemas', () => {
	const common = { runId: 'r', capability: 'a'.repeat(40), pageId: 'p', requestId: 'q' };
	for (const command of [
		{ kind: 'evaluate', code: 'x' },
		{ kind: 'dialog', requestId: 'd', revision: 1, accept: true },
		{ kind: 'input', text: 'x' },
		{ kind: 'upload', observationId: 'o', ref: 'r', fileIds: ['/etc/private'] },
	])
		expect(() => parseMethod('operation.prepare', { ...common, command })).toThrow('invalid_request');
	expect(
		parseMethod('operation.prepare', { ...common, command: { kind: 'click', observationId: 'o', ref: 'e1' } })
			.command.kind,
	).toBe('click');
	const tools = protocolTools();
	expect(tools.every((t) => t.exposure === 'agent')).toBe(true);
	expect(JSON.stringify(tools)).not.toContain('readIdentity');
});
it('rejects host file, internal, credential-bearing and script navigations', () => {
	for (const url of [
		'file:///etc/passwd',
		'chrome://settings',
		'javascript:alert(1)',
		'https://user:pass@example.com',
	])
		expect(() => validatePageUrl(url)).toThrow('unsupported_url');
	expect(validatePageUrl('http://localhost:8080')).toBe('http://localhost:8080/');
});
it('shares bounded frame observation scopes with RPC and generated CLI tools', () => {
	const common = { runId: 'r', capability: 'a'.repeat(40), pageId: 'p' };
	const scope = { frameId: 'frame-A', rootRef: 'opaque-A', mode: 'visible', maxNodes: 30, maxBytes: 4096 };
	expect(parseMethod('observe', { ...common, scope })).toEqual({ ...common, scope });
	expect(parseMethod('operation.prepare', { ...common, requestId: 'q', command: { kind: 'snapshot', scope } }).command).toEqual({ kind: 'snapshot', scope });
	for (const invalid of [{ maxNodes: 0 }, { maxNodes: 513 }, { maxBytes: 65537 }, { mode: 'script' }, { sessionId: 'private-cdp' }])
		expect(() => parseMethod('observe', { ...common, scope: invalid })).toThrow('invalid_request');
	expect(protocolTools().find(tool => tool.method === 'observe')!.inputSchema.properties).toHaveProperty('scope');
	expect(snapshotScope('s', 'p', { mode: undefined, maxNodes: undefined, maxBytes: undefined })).toMatchObject({ mode: 'semantic', maxNodes: 512, maxBytes: 65536 });
});
it('shares stream cursor schemas and rejects secret-bearing or inconsistent event responses', () => {
	const scope = { runId: 'run', capability: 'a'.repeat(40) };
	expect(parseMethod('events.snapshot', scope)).toEqual(scope);
	expect(parseMethod('events.poll', { ...scope, afterSequence: 3, streamId: 'stream' })).toMatchObject({ afterSequence: 3, streamId: 'stream' });
	for (const afterSequence of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) expect(() => parseMethod('events.poll', { ...scope, afterSequence })).toThrow('invalid_request');
	const event = { eventId: 'stream:1', streamId: 'stream', sequence: 1, streamSequence: 1, entityVersion: 1, at: 1, type: 'controlChanged', kind: 'controlChanged', spaceId: 'space', runtimeId: 'runtime', epoch: 1, state: 'agent' };
	expect(parseEventResult('events.poll', [event])).toEqual([event]);
	for (const invalid of [{ ...event, message: 'secret' }, { ...event, code: 'raw_error_secret' }, { ...event, streamSequence: 2 }]) expect(() => parseEventResult('events.poll', [invalid])).toThrow('invalid_event_response');
	expect(protocolTools().find(tool => tool.method === 'events.poll')!.inputSchema.properties).toHaveProperty('streamId');
	expect(protocolTools().some(tool => tool.method === 'events.snapshot')).toBe(true);
});

it('does not expose trusted human element-material capture as an Agent command', () => {
	expect(() => parseMethod('operation.prepare', { runId: 'r', capability: 'a'.repeat(40), pageId: 'p', requestId: 'q', command: { kind: 'material', observationId: 'observation', ref: 'opaque-ref' } })).toThrow('invalid_request');
});
