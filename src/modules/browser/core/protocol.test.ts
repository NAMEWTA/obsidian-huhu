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

it('derives every exposed input, output and execution policy from the same bounded registry', async () => {
	const { methodNames, methodRegistry, PROTOCOL_LIMITS } = await import('./protocol');
	const tools = protocolTools();
	expect(tools.map(tool => tool.method)).toEqual(methodNames);
	for (const tool of tools) {
		expect(tool.outputSchema).toBeDefined(); expect(methodRegistry[tool.method].output).toBeDefined();
		expect(tool.deadlineMs).toBe(PROTOCOL_LIMITS.deadlineMs); expect(tool.maxResponseBytes).toBe(PROTOCOL_LIMITS.responseBytes);
		expect(['read', 'control', 'mutation']).toContain(tool.risk);
	}
	for (const trusted of ['handoffAgent', 'resumeAgent', 'takeover', 'readIdentity', 'rawCDP']) expect(JSON.stringify(tools)).not.toContain(trusted);
	expect(methodRegistry['operation.execute'].idempotency).toBe('operation-id');
});

it('rejects malformed and secret-bearing result envelopes before the transport publishes them', async () => {
	const { parseResult } = await import('./protocol');
	const health = { runId: 'run', runtimeId: 'runtime', epoch: 1, eventCursor: 0, pages: 1, viewers: 0, framesReceived: 0, framesReplaced: 0, queuedFrameBytes: 0, pendingRequests: 0 };
	expect(parseResult('health', health)).toEqual(health);
	for (const invalid of [{ ...health, capability: 'secret' }, { ...health, pages: -1 }, { ...health, epoch: 0.5 }, { ...health, runtimeId: '' }]) expect(() => parseResult('health', invalid)).toThrow('invalid_response');
	expect(parseResult('operation.get', undefined)).toBeNull();
	expect(parseResult('run.stop', { stopped: true })).toEqual({ stopped: true });
	expect(() => parseResult('run.stop', { stopped: false })).toThrow('invalid_response');
	expect(() => parseResult('file.list', [{ id: 'file', path: '/private/host' }])).toThrow('invalid_response');
});

it('enforces observation identity, declared node and byte budgets on outgoing results', async () => {
	const { parseResult } = await import('./protocol');
	const observation = { id: 'snapshot', spaceId: 'space', pageId: 'page', runtimeId: 'runtime', documentId: 'document', epoch: 1, viewportVersion: 0, url: 'https://example.com/', title: 'Fixture', scope: snapshotScope('space', 'page', { maxNodes: 1, maxBytes: 1024 }), coverage: [], frameErrors: [], nodes: [], truncated: false };
	expect(parseResult('observe', observation)).toEqual(observation);
	const node = { ref: 'opaque', frameId: 'frame', role: 'button', name: 'name', visible: true };
	for (const changed of [{ scope: { ...observation.scope, pageId: 'other' } }, { nodes: [node, { ...node, ref: 'other' }] }, { text: 'a'.repeat(1024) }, { secret: 'do not publish' }])
		expect(() => parseResult('observe', { ...observation, ...changed })).toThrow('invalid_response');
});
