import { test, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { controlDescriptor, CONTROL_LIMITS, parseControlRequest } from '../../src/shared/native/control-wire';
import * as generated from '../../src/shared/native/control-wire.generated';
import * as editorCodec from '../../src/shared/native/control-wire-editor-codec.generated';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('../..', import.meta.url));
test('the Pane grammar advertises the installed original owner handlers and its positive CLI DTO fixtures use canonical pagination and bounds', () => {
	const d = controlDescriptor();
	for (const [name, operation] of Object.entries(d.operations))
		if (name.startsWith('pane.')) expect(operation.available, name).toBe(true);
	expect(d.operations['pane.list'].target).toEqual(['spaceId']);
	expect(d.operations['pane.resize'].params.properties?.ratio).toEqual({
		type: 'number',
		minimum: 0.15,
		maximum: 0.85,
	});
	const fixture = JSON.parse(readFileSync(path.join(root, 'test/fixtures/native/control-v1.json'), 'utf8')) as {
		paneCliCases: { name: string; valid: boolean; request?: unknown }[];
	};
	for (const row of fixture.paneCliCases)
		if (row.valid)
			expect(parseControlRequest(new TextEncoder().encode(JSON.stringify(row.request))), row.name).toEqual(
				row.request,
			);
});

test('the passive inbox wire contract keeps message identity separate from request correlation', () => {
	const d = controlDescriptor();
	expect(d.operations['message.send']).toMatchObject({
		target: ['sessionId'],
		available: true,
		readOnly: false,
	});
	expect(d.operations['inbox.list']).toMatchObject({ target: ['sessionId'], available: true, readOnly: true });
	expect(d.operations['inbox.read']).toMatchObject({ target: [], available: true, readOnly: true });
	expect(d.operations['inbox.ack']).toMatchObject({ target: [], available: true, readOnly: false });
	expect(generated.CONTROL_LIMITS.messageIdBytes).toBe(128);
	expect(generated.CONTROL_LIMITS.messageBodyBytes).toBe(16 * 1024);
	expect(generated.CONTROL_LIMITS.messageReferenceCount).toBe(8);
	const fixture = JSON.parse(readFileSync(path.join(root, 'test/fixtures/native/control-v1.json'), 'utf8')) as {
		inboxCases: { request: unknown; valid: boolean }[];
	};
	for (const row of fixture.inboxCases) {
		const parse = () => parseControlRequest(new TextEncoder().encode(JSON.stringify(row.request)));
		if (row.valid) expect(parse()).toEqual(row.request);
		else expect(parse).toThrow();
	}
});
test('one canonical descriptor generates matching source bytes and rejects unknown schema constructs', () => {
	const script = path.join(root, 'scripts/generate-control-protocol.mjs');
	expect(execFileSync(process.execPath, [script, '--check'], { cwd: root, encoding: 'utf8' })).toContain(
		'bytes match',
	);
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-control-generator-'));
	try {
		const d = JSON.parse(readFileSync(path.join(root, 'src/shared/native/control-schema.json'), 'utf8'));
		d.schemas.request.unknownConstructor = true;
		const bad = path.join(dir, 'bad.json');
		writeFileSync(bad, JSON.stringify(d));
		expect(() =>
			execFileSync(process.execPath, [script, '--schema', bad, '--out-dir', dir], { stdio: 'pipe' }),
		).toThrow();
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('actual wrapper variants fit the separate byte, depth and node reserves', () => {
	const d = controlDescriptor();
	for (const message of Object.values(d.messages)) {
		const fields = message.schema.properties!;
		const payload = Object.keys(fields).filter((key) => !['type', 'controlId', 'bridgeId'].includes(key));
		expect(payload.length).toBeLessThanOrEqual(2);
		let overhead = 2,
			nodes = 1;
		for (const [key, schema] of Object.entries(fields)) {
			overhead += JSON.stringify(key).length + 2;
			if (key === 'type') overhead += JSON.stringify(schema.const).length;
			else if (key === 'controlId' || key === 'bridgeId') overhead += CONTROL_LIMITS.controlIdBytes + 2;
			else continue;
			nodes += 2;
		}
		expect(overhead).toBeLessThan(CONTROL_LIMITS.wrapperBytes);
		expect(nodes + 4).toBeLessThan(CONTROL_LIMITS.wrapperNodes);
		expect(CONTROL_LIMITS.wrapperDepth).toBeGreaterThanOrEqual(1);
	}
	expect(CONTROL_LIMITS.forwardPoolBytes).toBe(
		CONTROL_LIMITS.pending * (CONTROL_LIMITS.requestBytes + CONTROL_LIMITS.wrapperBytes + 5),
	);
	expect(CONTROL_LIMITS.finalPoolBytes).toBe(
		CONTROL_LIMITS.pending * (CONTROL_LIMITS.responseBytes + CONTROL_LIMITS.wrapperBytes + 5),
	);
});

test('generator rejects missing or nonboolean readOnly instead of deriving it from transport', () => {
	const script = path.join(root, 'scripts/generate-control-protocol.mjs');
	const dir = mkdtempSync(path.join(tmpdir(), 'huhu-control-readonly-'));
	try {
		for (const invalid of [undefined, 'true', 1, []]) {
			const d = JSON.parse(readFileSync(path.join(root, 'src/shared/native/control-schema.json'), 'utf8'));
			if (invalid === undefined) delete d.operations['agent.wait'].readOnly;
			else d.operations['agent.wait'].readOnly = invalid;
			const file = path.join(dir, 'invalid.json');
			writeFileSync(file, JSON.stringify(d));
			expect(() =>
				execFileSync(process.execPath, [script, '--schema', file, '--out-dir', dir], { stdio: 'pipe' }),
			).toThrow();
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('string extensions execute the embedded production editor codec against the same raw fixture', () => {
	const factory: unknown = Reflect.get(editorCodec, 'editorEmbeddedCodecSource');
	expect(typeof factory).toBe('function');
	if (typeof factory !== 'function') throw new Error('No embedded editor codec');
	const source: unknown = factory();
	expect(typeof source).toBe('string');
	if (typeof source !== 'string') throw new Error('Invalid embedded editor codec source');
	expect(source).not.toContain(root);
	const codec = runInNewContext(source + '\nHuhuEditorCodec;', { TextEncoder, TextDecoder }) as {
		parseEditorMessage(body: Uint8Array, direction: string, expected?: unknown): unknown;
		parseEditorCapability(body: Uint8Array): unknown;
		parseEditorLaunch(body: Uint8Array): unknown;
		EDITOR_LIMITS: { bodyBytes: number };
	};
	const fixture = JSON.parse(readFileSync(path.join(root, 'test/fixtures/native/control-v1.json'), 'utf8')) as {
		cases: {
			kind: string;
			name: string;
			json?: string;
			bytes?: number[];
			direction?: string;
			expected?: unknown;
			valid: boolean;
		}[];
	};
	for (const row of fixture.cases.filter((row) => row.kind.startsWith('editor'))) {
		const raw = row.bytes ? Uint8Array.from(row.bytes) : new TextEncoder().encode(row.json!);
		const parse = () =>
			row.kind === 'editor'
				? codec.parseEditorMessage(raw, row.direction!, row.expected)
				: row.kind === 'editor-capability'
					? codec.parseEditorCapability(raw)
					: codec.parseEditorLaunch(raw);
		if (row.valid) expect(parse(), row.name).toBeTruthy();
		else expect(parse, row.name).toThrow();
	}
	expect(codec.EDITOR_LIMITS.bodyBytes).toBe(256 * 1024);
});
