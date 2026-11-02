import { expect, test } from 'vitest';
import { parseControlRequest } from './control-wire';

test('the canonical control request accepts an explicit target without changing its identifiers', () => {
	const request = {
		protocolVersion: 1,
		requestId: 'request-1',
		operation: 'terminal.get',
		target: { instanceId: 'instance-1', sessionId: 'old/non-UUID-session', runtimeId: 'runtime-1' },
		params: {},
	};
	expect(parseControlRequest(new TextEncoder().encode(JSON.stringify(request)))).toEqual(request);
});

test('pane list has finite pagination and an explicit Space contract with the original layout handler', () => {
	const operation = controlDescriptor().operations['pane.list'];
	expect(operation).toMatchObject({ target: ['spaceId'], available: true, readOnly: true });
	const request = {
		protocolVersion: 1,
		requestId: 'panes',
		operation: 'pane.list',
		target: { spaceId: 'space-B' },
		params: { limit: 25, cursor: 'literal/中文-cursor' },
	};
	expect(parseControlRequest(bytes(request))).toEqual(request);
	for (const params of [
		{ limit: 0 },
		{ limit: 1001 },
		{ limit: 1.5 },
		{ cursor: '' },
		{ cursor: 'x'.repeat(4097) },
		{ allSpaces: true },
	])
		expect(() => parseControlRequest(bytes({ ...request, params }))).toThrow();
});

test('pane resize accepts inclusive leaf-subtree shares and rejects values outside the renderable range', () => {
	const request = {
		protocolVersion: 1,
		requestId: 'resize',
		operation: 'pane.resize',
		target: { paneId: 'lp1.旧-pane/字面' },
		params: { ratio: 0.5 },
	};
	for (const ratio of [0.15, 0.5, 0.85])
		expect(parseControlRequest(bytes({ ...request, params: { ratio } })).params).toEqual({ ratio });
	for (const ratio of [0, 0.149999, 0.850001, 1, null, '0.5', Number.NaN, Number.POSITIVE_INFINITY])
		expect(() => parseControlRequest(bytes({ ...request, params: { ratio } }))).toThrow();
});

test('pane targets preserve opaque Unicode and legacy IDs up to 4096 UTF-8 bytes', () => {
	for (const paneId of ['lp1.' + 'x'.repeat(4092), '中'.repeat(1365) + 'x', ' Pane/中文 e\u0301🙂-ONE ']) {
		const request = {
			protocolVersion: 1,
			requestId: 'pane-id',
			operation: 'pane.focus',
			target: { paneId },
			params: {},
		};
		expect(parseControlRequest(bytes(request))).toEqual(request);
	}
	for (const paneId of ['', 'x'.repeat(4097), '中'.repeat(1365) + 'xx', '\ud800'])
		expect(() =>
			parseControlRequest(
				bytes({
					protocolVersion: 1,
					requestId: 'bad-pane',
					operation: 'pane.focus',
					target: { paneId },
					params: {},
				}),
			),
		).toThrow();
	for (const name of ['pane.list', 'pane.attach', 'pane.focus', 'pane.split', 'pane.resize', 'pane.close'] as const)
		expect(controlDescriptor().operations[name].available).toBe(true);
});

test('readOnly is explicit and independent from transport while wait states stay finite', () => {
	const d = controlDescriptor();
	for (const operation of Object.values(d.operations)) expect(operation).toHaveProperty('readOnly');
	expect(d.operations['agent.wait']).toMatchObject({ readOnly: true, transport: 'ordinary', available: true });
	for (const name of ['agent.prompt', 'agent.wait', 'terminal.send-text', 'terminal.send-keys'] as const)
		expect(d.operations[name].available).toBe(true);
	expect(d.operations['terminal.stop']).toMatchObject({ readOnly: false, transport: 'stop' });
	for (const state of [
		'idle',
		'working',
		'waiting',
		'permission',
		'done',
		'failed',
		'interrupted',
		'unknown',
		'blocked',
	]) {
		expect(
			parseControlRequest(
				bytes({ protocolVersion: 1, requestId: 'w', operation: 'agent.wait', params: { state } }),
			).operation,
		).toBe('agent.wait');
	}
	for (const [operation, params] of [
		['agent.wait', { state: 'success' }],
		['agent.prompt', { text: 'hello', wait: 'finished' }],
	] as const)
		expect(() => parseControlRequest(bytes({ protocolVersion: 1, requestId: 'w', operation, params }))).toThrow();
});

import fixture from '../../../test/fixtures/native/control-v1.json';
import {
	CONTROL_LIMITS,
	controlDescriptor,
	encodeControlRequest,
	encodeControlResponse,
	encodeHelperControlBody,
	parseControlResponse,
	parseControlAuth,
	parseControlLocator,
	parseHelperControlBody,
	controlJsonBytes,
	type ControlResponse,
	type ControlJson,
	type ControlRequest,
	parseEditorMessage,
	encodeEditorMessage,
	parseEditorCapability,
	parseEditorLaunch,
	encodeEditorCapability,
	encodeEditorLaunch,
	parseObservationCancel,
	EDITOR_LIMITS,
	type EditorDirection,
	type EditorExpectation,
} from './control-wire';
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const response = (data: ControlJson): ControlResponse => ({
	protocolVersion: 1,
	requestId: 'r1',
	ok: true,
	operation: 'terminal.get',
	phase: 'completed',
	effect: 'none',
	data,
});
const parse = {
	request: parseControlRequest,
	response: parseControlResponse,
	helper: parseHelperControlBody,
	auth: parseControlAuth,
	locator: parseControlLocator,
};

test.each(fixture.cases)('shared raw fixture: $name', (row) => {
	const raw = row.bytes ? Uint8Array.from(row.bytes) : new TextEncoder().encode(row.json!);
	const editor = row as unknown as { direction: EditorDirection; expected?: EditorExpectation };
	const read = () =>
		row.kind === 'editor'
			? parseEditorMessage(raw, editor.direction, editor.expected)
			: row.kind === 'editor-capability'
				? parseEditorCapability(raw)
				: row.kind === 'editor-launch'
					? parseEditorLaunch(raw)
					: row.kind === 'observation-cancel'
						? parseObservationCancel(raw)
						: parse[row.kind as keyof typeof parse](raw);
	if (row.valid) expect(read()).toBeTruthy();
	else {
		expect(read).toThrow();
		if (row.code) {
			let failure: unknown;
			try {
				read();
			} catch (error) {
				failure = error;
			}
			expect(failure).toMatchObject({ code: row.code });
		}
	}
});

test('the illustrative split response names the source Pane and puts the inserted Session in data', () => {
	const example = fixture.paneSplitExample;
	const requestRow = fixture.cases.find((row) => row.name === example.requestName)!;
	const responseRow = fixture.cases.find((row) => row.name === example.responseName)!;
	const request = parseControlRequest(new TextEncoder().encode(requestRow.json!));
	const result = parseControlResponse(new TextEncoder().encode(responseRow.json!));
	expect(request.target).toMatchObject({
		paneId: example.source.paneId,
		sessionId: example.inserted.sessionId,
		runtimeId: example.inserted.runtimeId,
	});
	expect(result.target).toEqual(example.source);
	expect(result.data).toEqual({ insertedPane: example.inserted });
	expect(result.target?.sessionId).not.toBe(request.target?.sessionId);
});

test('editor encoders preflight plain DTOs and snapshot validated correlation without sharing mutable input', () => {
	const ready = {
		type: 'editor-ready',
		version: 1,
		sid: 1,
		editorId: 'e',
		identity: { runtimeId: 'r' },
		sourceInstance: 'source',
		provider: 'pi',
		profileId: 'pi-1_4_0',
	} as const;
	const encoded = encodeEditorMessage(ready, 'native-to-node');
	expect(parseEditorMessage(encoded.body, 'native-to-node', ready)).toEqual(ready);
	if (encoded.value.type !== 'editor-ready') throw new Error('Unexpected encoder variant');
	expect(Object.isFrozen(encoded.value.identity)).toBe(true);
	let invoked = 0;
	expect(() =>
		encodeEditorMessage(
			{
				...ready,
				get sourceInstance() {
					invoked++;
					return 'other';
				},
			},
			'native-to-node',
		),
	).toThrow('accessors');
	expect(() =>
		encodeEditorMessage(
			{
				...ready,
				identity: {
					...ready.identity,
					toJSON() {
						invoked++;
						return {};
					},
				},
			} as unknown as typeof ready,
			'native-to-node',
		),
	).toThrow('toJSON');
	expect(invoked).toBe(0);
	expect(() =>
		encodeEditorMessage(
			{ ...ready, identity: { ...ready.identity, runtimeId: 'x'.repeat(EDITOR_LIMITS.lifecycleBytes) } },
			'native-to-node',
		),
	).toThrow();
	const cap = {
		purpose: 'huhu-editor',
		version: 1,
		endpoint: '/tmp/s',
		token: 'a'.repeat(64),
		sid: 1,
		editorId: 'e',
		identity: ready.identity,
	} as const;
	expect(parseEditorCapability(encodeEditorCapability(cap).body)).toEqual(cap);
	const file = { path: '/verified/pi', dev: '1', ino: '2' };
	const launch = {
		identity: ready.identity,
		provider: 'pi',
		recipe: { version: 1, profileId: 'pi-1_4_0', artifactDigest: 'b'.repeat(64), executable: file, entry: file },
	} as const;
	expect(parseEditorLaunch(encodeEditorLaunch(launch).body)).toEqual(launch);
	expect(EDITOR_LIMITS.lifecyclePoolBytes).toBe(EDITOR_LIMITS.lifecycleFrames * (EDITOR_LIMITS.lifecycleBytes + 5));
	expect(EDITOR_LIMITS.operationReceiptPoolBytes).toBe(
		128 * EDITOR_LIMITS.operationReceiptStates * (EDITOR_LIMITS.receiptBytes + 5),
	);
});

test('whole external byte, node and depth limits survive the fixed internal wrapper', () => {
	const prefix = controlJsonBytes(response(''));
	const exact = response('x'.repeat(CONTROL_LIMITS.responseBytes - prefix));
	expect(encodeControlResponse(exact).byteLength).toBe(CONTROL_LIMITS.responseBytes);
	expect(
		parseHelperControlBody(
			encodeHelperControlBody({ type: 'control-result', controlId: 'c', bridgeId: 'b', response: exact }).body,
		).type,
	).toBe('control-result');
	const over = response('x'.repeat(CONTROL_LIMITS.responseBytes - prefix + 1));
	expect(() =>
		parseHelperControlBody(bytes({ type: 'control-result', controlId: 'c', bridgeId: 'b', response: over })),
	).toThrow();
	let nested: ControlJson = 'leaf';
	for (let i = 0; i < 31; i++) nested = [nested];
	const depth32 = response(nested);
	expect(encodeControlResponse(depth32).value.data).toEqual(nested);
	expect(
		parseHelperControlBody(
			encodeHelperControlBody({ type: 'control-result', controlId: 'c', bridgeId: 'b', response: depth32 }).body,
		),
	).toBeTruthy();
	expect(() =>
		parseHelperControlBody(
			bytes({ type: 'control-result', controlId: 'c', bridgeId: 'b', response: response([nested]) }),
		),
	).toThrow();
	const nodes8192 = response(Array<null>(CONTROL_LIMITS.nodes - 15).fill(null));
	expect(encodeControlResponse(nodes8192).byteLength).toBeLessThan(CONTROL_LIMITS.responseBytes);
	expect(
		parseHelperControlBody(
			encodeHelperControlBody({ type: 'control-result', controlId: 'c', bridgeId: 'b', response: nodes8192 })
				.body,
		),
	).toBeTruthy();
	expect(() =>
		parseHelperControlBody(
			bytes({
				type: 'control-result',
				controlId: 'c',
				bridgeId: 'b',
				response: response(Array<null>(CONTROL_LIMITS.nodes - 14).fill(null)),
			}),
		),
	).toThrow();
});

test('input receipt progress reserves the whole stage envelope before any business effect', () => {
	const progress = {
		phase: 'input-submitted',
		effect: 'completed',
		target: { sessionId: 's', runtimeId: 'r' },
		data: { receipt: { kind: 'adapter-applied', op: 1 }, padding: '' },
	} as const;
	const overhead = controlJsonBytes(progress, CONTROL_LIMITS.stageBytes);
	const exact = {
		...progress,
		data: { ...progress.data, padding: 'x'.repeat(CONTROL_LIMITS.stageBytes - overhead) },
	};
	const encoded = encodeHelperControlBody({
		type: 'control-progress',
		controlId: 'c',
		bridgeId: 'b',
		progress: exact,
	});
	expect(parseHelperControlBody(encoded.body).progress).toEqual(exact);
	expect(() =>
		encodeHelperControlBody({
			type: 'control-progress',
			controlId: 'c',
			bridgeId: 'b',
			progress: { ...exact, data: { ...exact.data, padding: exact.data.padding + 'x' } },
		}),
	).toThrow();
});

test('legacy large result and deep data keep their old JSON semantics', () => {
	const legacy = { type: 'history-result', id: 'old', value: 'x'.repeat(2 * 1024 * 1024) };
	expect(parseHelperControlBody(bytes(legacy))).toEqual(legacy);
	let data: unknown = 0;
	for (let i = 0; i < 60; i++) data = [data];
	expect(parseHelperControlBody(bytes({ type: 'cookies-result', data })).data).toEqual(data);
});

test('editor namespace is strict before legacy JSON fallback and forbids JSON body injection', () => {
	for (const value of [
		{ type: 'editor-unrecognized', sid: 1 },
		{
			type: 'editor-begin',
			version: 1,
			sid: 1,
			editorId: 'e',
			sourceInstance: 'source',
			op: 1,
			totalBytes: 1,
			remainingMs: 100,
			text: 'must remain binary',
		},
		{ type: 'editor-close', version: 1, sid: [1], editorId: 'e' },
		{ type: 'editor-close', version: 0, sid: 1, editorId: 'e' },
	])
		expect(() => parseHelperControlBody(bytes(value))).toThrow();
});

test('encoding checks before invoking getters, toJSON, prototype methods or large-copy APIs', () => {
	let invoked = 0;
	const data = {
		get text() {
			invoked++;
			return 'bad';
		},
	};
	expect(() => encodeControlResponse(response(data))).toThrow('accessors');
	expect(() =>
		encodeControlResponse(
			response({
				toJSON() {
					invoked++;
					return 'bad';
				},
			} as unknown as ControlJson),
		),
	).toThrow('toJSON');
	expect(invoked).toBe(0);
	expect(() => encodeControlResponse(response(new Map() as unknown as ControlJson))).toThrow('plain DTOs');
	expect(() => encodeControlResponse(response('x'.repeat(CONTROL_LIMITS.responseBytes)))).toThrow();
	const request: ControlRequest = { protocolVersion: 1, requestId: 'r', operation: 'terminal.get', params: {} };
	const encoded = encodeControlRequest(request);
	expect(Object.isFrozen(encoded.value)).toBe(true);
	expect(Object.isFrozen(encoded.value.params)).toBe(true);
	expect(encoded.byteLength).toBe(encoded.body.byteLength);
	expect(controlJsonBytes(encoded.value)).toBe(encoded.byteLength);
	expect(Object.isFrozen(controlDescriptor().operations)).toBe(true);
});

test('message protocol keeps recipient identity and bounded payloads explicit', () => {
	const descriptor = controlDescriptor();
	const send = descriptor.operations['message.send'];
	expect(send).toMatchObject({ target: ['sessionId'], available: true, readOnly: false });
	const request = {
		protocolVersion: 1,
		requestId: 'wire-request',
		operation: 'message.send',
		target: { instanceId: 'i', vaultId: 'v', sessionId: 'session-B' },
		params: { message: 'business-message-id', text: 'hello', source: 'cli', references: [] },
	};
	expect(parseControlRequest(bytes(request))).toEqual(request);
	for (const params of [
		{ message: 'x'.repeat(129), text: 'hello' },
		{ message: 'id', text: 'x'.repeat(16_385) },
		{ message: 'id', text: 'hello', source: 'x'.repeat(513) },
	])
		expect(() => parseControlRequest(bytes({ ...request, params }))).toThrow();
	const list = {
		...request,
		operation: 'inbox.list',
		params: { limit: 1000, cursor: 'opaque-cursor' },
	};
	expect(parseControlRequest(bytes(list))).toEqual(list);
	for (const operation of ['inbox.read', 'inbox.ack'] as const) {
		const value = { ...request, operation, target: undefined, params: { message: 'business-message-id' } };
		delete (value as { target?: unknown }).target;
		expect(parseControlRequest(bytes(value))).toEqual(value);
	}
});
