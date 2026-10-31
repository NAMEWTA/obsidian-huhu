import { expect, test } from 'vitest';
import fixtures from '../../../test/fixtures/native/terminal-input-admission-v1.json';
import { NATIVE_INPUT_LIMITS, parseNativeInputLimits, parseNativeInputControl } from './input';
import { NATIVE_EDITOR_LIMITS, editorBodyBytes, encodeEditorAppPart, parseEditorAppPart } from './input';
import controlFixture from '../../../test/fixtures/native/control-v1.json';
import * as nativeInput from './input';

test('shared input admission fixture rejects coercion, bad limits and inconsistent results', () => {
	for (const row of fixtures.cases) {
		const result =
			row.codec === 'limits'
				? parseNativeInputLimits(row.wire)
				: parseNativeInputControl(row.wire, NATIVE_INPUT_LIMITS);
		expect(result !== undefined, row.name).toBe(row.valid);
		if (row.valid) expect(result, row.name).toEqual(row.wire);
	}
});

test('limits have meaningful per-operation, session and helper bounds', () => {
	expect(parseNativeInputLimits(NATIVE_INPUT_LIMITS)).toEqual(NATIVE_INPUT_LIMITS);
	for (const key of Object.keys(NATIVE_INPUT_LIMITS)) {
		expect(parseNativeInputLimits({ ...NATIVE_INPUT_LIMITS, [key]: 0 }), key).toBeUndefined();
		expect(parseNativeInputLimits({ ...NATIVE_INPUT_LIMITS, [key]: ['16'] }), key).toBeUndefined();
	}
});

test('raw JSON numeric spelling agrees with native dispatch normalization', () => {
	for (const row of fixtures.rawCases)
		expect(!!parseNativeInputControl(JSON.parse(row.json), NATIVE_INPUT_LIMITS), row.name).toBe(row.valid);
});

test('editor body preflight counts UTF8 before copies and binary fragments never contain JSON metadata', () => {
	for (const row of controlFixture.editorParts) {
		const wire = Uint8Array.from(row.bytes),
			parsed = parseEditorAppPart(wire);
		expect(parsed !== undefined, row.name).toBe(row.valid);
		if (parsed) expect(encodeEditorAppPart(parsed.op, parsed.data), row.name).toEqual(wire);
	}
	expect(NATIVE_EDITOR_LIMITS.bodyBytes).toBe(NATIVE_INPUT_LIMITS.operationBytes);
	expect(NATIVE_EDITOR_LIMITS.fragmentBytes).toBe(NATIVE_INPUT_LIMITS.fragmentBytes);
	expect(editorBodyBytes('中文🙂')).toBe(10);
	expect(editorBodyBytes(new TextEncoder().encode('中文🙂'))).toBe(10);
	expect(editorBodyBytes('x'.repeat(NATIVE_EDITOR_LIMITS.bodyBytes))).toBe(NATIVE_EDITOR_LIMITS.bodyBytes);
	for (const invalid of [
		'',
		'\ud800',
		'\udc00',
		new Uint8Array([0xc0, 0x80]),
		new Uint8Array([0xed, 0xa0, 0x80]),
		new Uint8Array([0xf4, 0x90, 0x80, 0x80]),
	]) {
		let failure: unknown;
		try {
			editorBodyBytes(invalid);
		} catch (error) {
			failure = error;
		}
		expect(failure).toMatchObject({ failure: { state: 'none', effect: 'none', reason: 'invalid' } });
	}
	expect(() => editorBodyBytes('x'.repeat(NATIVE_EDITOR_LIMITS.bodyBytes + 1))).toThrow('capacity');
	const raw = new TextEncoder().encode('正文');
	const frame = encodeEditorAppPart(0xffff_ffff, raw);
	expect(parseEditorAppPart(frame)).toEqual({ op: 0xffff_ffff, data: raw });
	expect(parseEditorAppPart(frame)!.data.buffer).toBe(frame.buffer);
	frame[4] = 1;
	expect(parseEditorAppPart(frame)).toBeUndefined();
	for (const value of [new Uint8Array(0), new Uint8Array(NATIVE_EDITOR_LIMITS.fragmentBytes + 1)])
		expect(() => encodeEditorAppPart(1, value)).toThrow();
	expect(() => encodeEditorAppPart(0, raw)).toThrow();
});

test('spawn environment snapshot has a bounded pure seam before generation-specific profile admission', () => {
	expect(typeof Reflect.get(nativeInput, 'snapshotSpawnEnvironment')).toBe('function');
	const original = { PATH: '/captured', NODE_OPTIONS: '--original', SHELL: '/bin/sh' };
	const snapshot = nativeInput.snapshotSpawnEnvironment(original, { NODE_OPTIONS: '', EXTRA: '中文' }, 'unix');
	expect(snapshot.values).toEqual({ ...original, NODE_OPTIONS: '', EXTRA: '中文' });
	expect(snapshot.completeness).toBe('complete');
	expect(nativeInput.snapshotSpawnEnvironment(original, original, 'unix').values).toEqual(original);
	original.PATH = '/future';
	expect(snapshot.values.PATH).toBe('/captured');
	expect(Object.isFrozen(snapshot.values)).toBe(true);
	expect(nativeInput.snapshotSpawnEnvironment({}, {}, 'unix').completeness).toBe('unix-shell-default');
	expect(nativeInput.snapshotSpawnEnvironment({ SHELL: '/known' }, {}, 'windows').completeness).toBe(
		'unverified-platform',
	);
	expect(
		nativeInput.snapshotSpawnEnvironment({ K: 'x'.repeat(NATIVE_EDITOR_LIMITS.environmentBytes - 1) }, {}, 'unix')
			.values.K?.length,
	).toBe(NATIVE_EDITOR_LIMITS.environmentBytes - 1);
	expect(() =>
		nativeInput.snapshotSpawnEnvironment({ K: 'x'.repeat(NATIVE_EDITOR_LIMITS.environmentBytes) }, {}, 'unix'),
	).toThrow('capacity');
	expect(() =>
		nativeInput.snapshotSpawnEnvironment(
			Object.fromEntries(
				Array.from({ length: NATIVE_EDITOR_LIMITS.environmentEntries + 1 }, (_, i) => ['k' + i, '']),
			),
			{},
			'unix',
		),
	).toThrow('capacity');
	let invoked = 0;
	expect(() =>
		nativeInput.snapshotSpawnEnvironment(
			{},
			{
				get SECRET() {
					invoked++;
					return 'not read';
				},
			},
			'unix',
		),
	).toThrow('invalid');
	expect(() =>
		nativeInput.snapshotSpawnEnvironment(
			{
				toJSON() {
					invoked++;
					return 'not called';
				},
			} as unknown as Record<string, string>,
			{},
			'unix',
		),
	).toThrow('invalid');
	expect(invoked).toBe(0);
});
