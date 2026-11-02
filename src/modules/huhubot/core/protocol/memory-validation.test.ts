import { expect, it } from 'vitest';
import fixtures from '../../../../../contracts/hap/v0.1/fixtures/methods.json';
import schema from '../../../../../contracts/hap/v0.1/schema.json';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type {
	BotMethod,
	MemoryBody,
	MemoryItem,
	MemoryObject,
	ExecutionContextEntryView,
	ExecutionContextView,
} from '../../api';
import { MethodValidation } from './method-validation';
import { HapConnection, type HapTransport } from './connection';
import { HapDecoder, encodeHapFrame, type HapMessage } from './codec';

const validation = new MethodValidation();
const namespace = { kind: 'agent' as const, id: 'agent:a' };
const scope = { kind: 'profile' as const };
const hash = `sha256:${'0'.repeat(64)}`;
const command = {
	profileId: 'profile:1',
	commandId: 'command:1',
	idempotencyKey: 'key:1',
	commandEpoch: '1',
	expectedRevision: '1',
};
const utf8 = (value: string) => new TextEncoder().encode(value).length;
const body = (text = '正文😀'): MemoryBody => ({
	text,
	hash,
	provenance: 'user',
	creatorKind: 'user',
	sourceRefs: [],
	sourceScopes: [],
	derived: [],
});
const item = (text?: string): MemoryItem => ({
	id: 'item:1',
	revision: '1',
	revisionId: 'revision:1',
	namespace,
	scope,
	state: 'active',
	pinned: false,
	body: body(text),
});
const object = (text?: string): MemoryObject => ({ kind: 'item', item: item(text) });
const add = (text: string) => ({ ...command, namespace, action: 'add', scope, text });
const get = () => ({ profileId: 'profile:1', namespace, kind: 'item', id: 'item:1' });
const page = (items: MemoryObject[]) => ({ namespaceRevision: '1', items });
function contextEntry(text = '中😀'): Extract<ExecutionContextEntryView, { state: 'readable' }> & { text: string } {
	return {
		id: 'entry:1',
		kind: 'recent',
		representation: 'full',
		state: 'readable',
		revision: '1',
		scope,
		text,
		contentHash: hash,
		creatorKind: 'user',
		preparationKind: 'selected',
		displaySlice: { start: 0, end: utf8(text) },
		partIndex: 0,
		partCount: 1,
	};
}
function context(entries: ExecutionContextEntryView[]): ExecutionContextView {
	return {
		runId: 'run:1',
		runRevision: '1',
		manifestRevision: '1',
		namespace,
		scope: { kind: 'session', id: 'session:1' },
		state: 'sealed',
		entries,
	};
}
function intentAliasEntry() {
	return {
		...contextEntry(''),
		kind: 'inbox' as const,
		representation: 'intent_alias' as const,
		contentHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		source: {
			kind: 'message' as const,
			id: 'message:alias',
			revision: '1',
			hash,
			namespace: 'agent:a',
			workThreadId: 'thread:1',
		},
	};
}
function intentAliasResult(entry: unknown = intentAliasEntry()) {
	return { kind: 'context', context: { ...context([]), entries: [entry] } };
}
function sample(method: BotMethod, part: 'params' | 'result'): Record<string, unknown> {
	return structuredClone(
		fixtures.cases.find((value) => value.method === method && value.part === part && value.valid)!.value,
	) as Record<string, unknown>;
}

it('separates UTF8 text bytes from schema codepoints without normalizing Chinese or combining emoji', () => {
	for (const text of [
		'中'.repeat(21845) + 'x',
		'👩\u200d💻'.repeat(5957) + 'x'.repeat(9),
		'e\u0301'.repeat(21845) + 'x',
	]) {
		expect(utf8(text)).toBe(65536);
		const params = add(text),
			result = object(text),
			original = structuredClone(params);
		expect(validation.validate('memory.correct', 'params', params)).toBe(true);
		expect(validation.validate('memory.get', 'result', result)).toBe(true);
		expect(validation.validate('memory.correct', 'params', add(text + 'x'))).toBe(false);
		expect(validation.validate('memory.get', 'result', object(text + 'x'))).toBe(false);
		expect(params).toEqual(original);
	}
});

it('checks query, cursor, opaque and command UTF8 boundaries independently', () => {
	const query = { profileId: 'profile:1', namespace, kind: 'item' };
	for (const [field, text] of [
		['query', '中'.repeat(341) + 'x'],
		['cursor', '😀'.repeat(512)],
		['profileId', '😀'.repeat(128)],
	] as const) {
		expect(validation.validate('memory.list', 'params', { ...query, [field]: text })).toBe(true);
		expect(validation.validate('memory.list', 'params', { ...query, [field]: text + 'x' })).toBe(false);
	}
	for (const field of ['commandId', 'idempotencyKey'] as const) {
		expect(validation.validate('memory.correct', 'params', { ...add('text'), [field]: '😀'.repeat(32) })).toBe(
			true,
		);
		expect(
			validation.validate('memory.correct', 'params', { ...add('text'), [field]: '😀'.repeat(32) + 'x' }),
		).toBe(false);
	}
	expect(
		validation.validate('memory.get', 'params', { ...get(), namespace: { ...namespace, id: '中'.repeat(171) } }),
	).toBe(false);
	expect(validation.validate('memory.list', 'result', { ...page([]), nextCursor: '😀'.repeat(512) + 'x' })).toBe(
		false,
	);
});

it('rejects unpaired UTF16 in every Memory direction before TextEncoder can replace it', () => {
	for (const text of ['\ud800', '\udc00', 'a\ud800z', '\ud800\ud800']) {
		expect(validation.validate('memory.correct', 'params', add(text))).toBe(false);
		expect(validation.validate('memory.get', 'result', object(text))).toBe(false);
		expect(validation.validate('memory.get', 'params', { ...get(), id: text })).toBe(false);
	}
	expect(validation.validate('memory.correct', 'params', add('😀'))).toBe(true);
	expect(validation.validate('memory.correct', 'params', add('\u0085\u3000'))).toBe(false);
	// Go TrimSpace preserves BOM; it is valid content, not implicit normalization.
	expect(validation.validate('memory.correct', 'params', add('\ufeff'))).toBe(true);
});

it('limits combined source provenance and bounds nested reference identities', () => {
	const read = sample('host.read', 'params');
	const source = read.source as MemoryBody['sourceRefs'][number];
	const folder = { ...source, kind: 'folder' as const };
	const { scopeResourceIds: _ids, range: _range, ...sourceScope } = folder;
	const value = item();
	if (value.state !== 'active') throw new Error('fixture');
	value.body.sourceRefs = Array.from({ length: 16 }, () => structuredClone(source));
	value.body.sourceScopes = Array.from({ length: 16 }, () => structuredClone(sourceScope));
	expect(validation.validate('memory.pin', 'result', value)).toBe(true);
	value.body.sourceScopes.push(sourceScope);
	expect(validation.validate('memory.pin', 'result', value)).toBe(false);
	value.body.sourceRefs = [];
	value.body.sourceScopes = [];
	value.body.derived = [
		{ kind: 'message', id: 'm', revision: '1', hash, namespace: '中'.repeat(171), workThreadId: 'w' },
	];
	expect(validation.validate('memory.pin', 'result', value)).toBe(false);
});

it('checks non-schema branch relations without treating hashes as current source authority', () => {
	const value = item();
	if (value.state !== 'active') throw new Error('fixture');
	value.body.creatorKind = 'agent';
	value.body.provenance = 'inference';
	expect(validation.validate('memory.pin', 'result', value)).toBe(false);
	value.body.creatorAgentId = 'agent:a';
	expect(validation.validate('memory.pin', 'result', value)).toBe(true);
	value.body.provenance = 'user';
	expect(validation.validate('memory.pin', 'result', value)).toBe(false);
	expect(
		validation.validate('memory.get', 'params', {
			...get(),
			profileId: 'p',
			namespace: { kind: 'global', id: 'other' },
		}),
	).toBe(false);
	expect(validation.validate('memory.forget', 'result', item())).toBe(false);
	expect(
		validation.validate('memory.correct', 'params', { ...add('text'), expectedRevision: '9223372036854775808' }),
	).toBe(false);
});

it('uses the decoded Go HTML-escaped object budget, including the method wrapper', () => {
	// Under the text limit, but Go json.Marshal expands each HTML byte to six.
	const value = object('<'.repeat(41000));
	expect(utf8(JSON.stringify(value))).toBeLessThan(245760);
	expect(validation.validate('memory.get', 'result', value)).toBe(false);
	for (const character of ['<', '>', '&', '\u2028', '\u2029']) {
		expect(validation.validate('memory.correct', 'params', add(character.repeat(21845) + 'x'))).toBe(true);
	}
	const input = add('<'.repeat(41000));
	expect(validation.validate('memory.correct', 'params', input)).toBe(false);
	expect(input.text.length).toBe(41000);
});

it('accepts the exact object byte boundary and rejects one more encoded byte', () => {
	const value = object();
	if (value.kind !== 'item' || value.item.state !== 'active') throw new Error('fixture');
	const overhead = utf8(
		JSON.stringify({ ...value, item: { ...value.item, body: { ...value.item.body, text: '' } } }),
	);
	const budget = 245760 - overhead;
	const text = '<'.repeat(Math.floor(budget / 6)) + 'x'.repeat(budget % 6);
	value.item.body.text = text;
	expect(validation.validate('memory.get', 'result', value)).toBe(true);
	value.item.body.text += 'x';
	expect(validation.validate('memory.get', 'result', value)).toBe(false);
});

it('budgets the entire list page and every wrapped item separately', () => {
	const values = [object('a'.repeat(65536)), object('b'.repeat(65536)), object('c'.repeat(65536)), object('')];
	const last = values[3]!;
	if (last.kind !== 'item' || last.item.state !== 'active') throw new Error('fixture');
	const remaining = 262144 - utf8(JSON.stringify(page(values)));
	last.item.body.text = 'd'.repeat(remaining);
	expect(validation.validate('memory.list', 'result', page(values))).toBe(true);
	last.item.body.text += 'x';
	expect(validation.validate('memory.list', 'result', page(values))).toBe(false);
	expect(validation.validate('memory.list', 'result', page([object('<'.repeat(41000))]))).toBe(false);
});

it('budgets context display parts in UTF8 and validates relative display offsets and part indices', () => {
	const entry = contextEntry('😀'.repeat(1024));
	expect(validation.validate('memory.get', 'result', { kind: 'context', context: context([entry]) })).toBe(true);
	expect(
		validation.validate('memory.get', 'result', {
			kind: 'context',
			context: context([{ ...entry, text: entry.text + 'x' }]),
		}),
	).toBe(false);
	expect(
		validation.validate('memory.get', 'result', {
			kind: 'context',
			context: context([{ ...entry, displaySlice: { start: 12, end: 4108 } }]),
		}),
	).toBe(true);
	expect(
		validation.validate('memory.get', 'result', {
			kind: 'context',
			context: context([{ ...entry, displaySlice: { start: 0, end: 4095 } }]),
		}),
	).toBe(false);
	expect(
		validation.validate('memory.get', 'result', {
			kind: 'context',
			context: context([{ ...entry, partIndex: 1, partCount: 1 }]),
		}),
	).toBe(false);
	const source = { kind: 'message' as const, id: 'm', revision: '1', hash, namespace: 'agent:a', workThreadId: 'w' };
	const excerpt = {
		...contextEntry('中😀'),
		source,
		sourceSpans: [{ start: 100, end: 107 }],
		contentHash: `sha256:${'1'.repeat(64)}`,
	};
	expect(validation.validate('memory.get', 'result', { kind: 'context', context: context([excerpt]) })).toBe(true);
	expect(validation.validate('memory.list', 'result', page([{ kind: 'context', context: context([entry]) }]))).toBe(
		false,
	);
});

it('uses context omitempty defaults for the page budget while preserving pointer text and required false/zero/arrays', () => {
	const entries = Array.from({ length: 11 }, (_, index) => ({
		...contextEntry(index === 10 ? '' : '<'.repeat(4096)),
		partCount: 11,
		sourceRefs: [],
		sourceSpans: [],
		partial: false,
		displaySlice: { start: 100000, end: 100000 + (index === 10 ? 0 : 4096) },
	}));
	const result = { kind: 'context', context: context(entries) };
	// Build the expected decoded Go value separately; required false/zero/[] remain.
	const decoded = structuredClone(result);
	for (const entry of decoded.context.entries) {
		delete entry.partial;
		if (entry.state === 'readable') {
			delete entry.partIndex;
			delete entry.sourceRefs;
			delete entry.sourceSpans;
		}
	}
	const remaining = 262144 - utf8(JSON.stringify(decoded).replace(/</g, '\\u003c'));
	const text = '<'.repeat(Math.floor(remaining / 6)) + 'x'.repeat(remaining % 6);
	expect(text.length).toBeLessThanOrEqual(4096);
	const last = entries[10]!;
	last.text = text;
	last.displaySlice.end += text.length;
	const before = structuredClone(result);
	expect(validation.validate('memory.get', 'result', result)).toBe(true);
	expect(result).toEqual(before);
	last.text += 'x';
	last.displaySlice.end++;
	expect(validation.validate('memory.get', 'result', result)).toBe(false);
	const redacted = {
		id: 'e',
		kind: 'recent',
		representation: 'excerpt',
		state: 'redacted',
		revision: '1',
		scope,
		reason: 'REVOKED',
	};
	expect(
		validation.validate('memory.get', 'result', {
			kind: 'context',
			context: context([redacted as ExecutionContextEntryView]),
		}),
	).toBe(true);
	expect(
		validation.validate('memory.get', 'result', {
			kind: 'context',
			context: context([{ ...redacted, text: 'stale' } as ExecutionContextEntryView]),
		}),
	).toBe(false);
});

it('keeps JSON control escaping distinct from source bytes and retains strict bounded provenance shapes', () => {
	const text = '\u0000'.repeat(40000) + 'x';
	expect(utf8(text)).toBe(40001);
	expect(validation.validate('memory.get', 'result', object(text))).toBe(true);
	expect(
		validation.validate('memory.list', 'result', page([object('"'.repeat(65536)), object('\\'.repeat(65536))])),
	).toBe(false);
	const value = item();
	if (value.state !== 'active') throw new Error('fixture');
	const reference = {
		kind: 'message' as const,
		id: 'm',
		revision: '1',
		hash,
		namespace: 'agent:a',
		workThreadId: 'w',
	};
	value.body.derived = Array.from({ length: 128 }, () => ({ ...reference }));
	expect(validation.validate('memory.pin', 'result', value)).toBe(true);
	value.body.derived.push(reference);
	expect(validation.validate('memory.pin', 'result', value)).toBe(false);
	for (const extra of [{ grantIds: [] }, { group: { sessionId: 's', members: [] } }, { sourceRefs: null }])
		expect(
			validation.validate('memory.get', 'result', {
				kind: 'item',
				item: { ...item(), body: { ...body(), ...extra } },
			}),
		).toBe(false);
});

it('applies the Memory-only hook to all eight methods without changing the lazy fixed cache or nonmemory strings', () => {
	const local = new MethodValidation();
	for (const method of [
		'memory.list',
		'memory.get',
		'memory.pin',
		'memory.correct',
		'memory.forget',
		'memory.setAutoMaintenance',
		'memory.proposeGlobal',
		'memory.resolveGlobal',
	] as const) {
		const params = sample(method, 'params');
		expect(local.validate(method, 'params', params), method).toBe(true);
		expect(local.validate(method, 'params', { ...params, profileId: '😀'.repeat(129) }), method).toBe(false);
		const result = sample(method, 'result');
		expect(local.validate(method, 'result', result), method).toBe(true);
	}
	expect(local.compiledCount).toBe(16);
	expect(local.validate('agents.get', 'params', { profileId: 'p', id: '\ud800' })).toBe(true);
	expect(local.compiledCount).toBe(17);
});

it('requires fixed bodies for global create/update previews but permits metadata-only delete previews', () => {
	const create = sample('memory.proposeGlobal', 'result');
	expect(validation.validate('memory.proposeGlobal', 'result', create)).toBe(true);
	const createWithoutBody = structuredClone(create);
	delete createWithoutBody.body;
	expect(validation.validate('memory.proposeGlobal', 'result', createWithoutBody)).toBe(false);
	const updateWithoutBody = { ...createWithoutBody, operation: 'update', targetItemId: 'item:1', targetRevision: '1' };
	expect(validation.validate('memory.proposeGlobal', 'result', updateWithoutBody)).toBe(false);
	const deletePreview = { ...createWithoutBody, operation: 'delete', targetItemId: 'item:1', targetRevision: '1' };
	expect(validation.validate('memory.proposeGlobal', 'result', deletePreview)).toBe(true);
	for (const operation of ['create', 'update'] as const) {
		const terminal = { ...createWithoutBody, operation, ...(operation === 'update' ? { targetItemId: 'item:1', targetRevision: '1' } : {}), state: 'accepted' as const };
		expect(validation.validate('memory.get', 'result', { kind: 'proposal', proposal: terminal })).toBe(true);
	}
});

class MemoryPeer implements HapTransport {
	data: (bytes: Uint8Array) => void = () => undefined;
	ended: (reason: Error) => void = () => undefined;
	messages: HapMessage[] = [];
	onData(listener: (bytes: Uint8Array) => void): () => void {
		this.data = listener;
		return () => {
			this.data = () => undefined;
		};
	}
	onClose(listener: (reason: Error) => void): () => void {
		this.ended = listener;
		return () => {
			this.ended = () => undefined;
		};
	}
	send(bytes: Uint8Array): Promise<void> {
		for (const payload of new HapDecoder().push(bytes))
			this.messages.push(...(Array.isArray(payload) ? payload : [payload]));
		return Promise.resolve();
	}
	close(): void {
		this.ended(new Error('EOF'));
	}
	reply(id: string, result: object): void {
		this.data(encodeHapFrame({ jsonrpc: '2.0', id, result: result as never }));
	}
}

it('accepts an empty intent alias at the real public framed context consumer without repeating its source text', async () => {
	const result = intentAliasResult(),
		before = structuredClone(result);
	expect.soft(validation.validate('memory.get', 'result', result)).toBe(true);
	const peer = new MemoryPeer();
	const connection = new HapConnection(peer, {
		after: (ms, callback) => {
			const timer = setTimeout(callback, ms);
			return () => clearTimeout(timer);
		},
	});
	const connecting = connection.connect({ name: 'intent-alias-test', version: '1' });
	peer.reply('c:1', sample('protocol.hello', 'result'));
	const client = await connecting;
	try {
		const reading = client.memory.get({ profileId: 'profile:1', namespace, kind: 'context', id: 'run:1' });
		peer.reply('c:2', result);
		await expect(reading).resolves.toEqual(result);
		expect(client.state).toBe('ready');
		expect(result).toEqual(before);
	} finally {
		client.close();
	}
});

it('rejects nonempty aliases and malformed context displays while retaining nonempty private memory and request text', () => {
	const alias = intentAliasEntry();
	for (const [name, fields] of [
		['duplicate intent body', { text: 'duplicate', displaySlice: { start: 0, end: 9 } }],
		['nonalias empty body', { representation: 'full' }],
		['bad display slice', { displaySlice: { start: 0, end: 1 } }],
		['bad part count', { partCount: 0 }],
		['bad hash', { contentHash: 'not-a-hash' }],
		[
			'too many text bytes',
			{ representation: 'full', text: '😀'.repeat(1025), displaySlice: { start: 0, end: 4100 } },
		],
		['redacted with text', { state: 'redacted', reason: 'REVOKED' }],
	] as const)
		expect
			.soft(validation.validate('memory.get', 'result', intentAliasResult({ ...alias, ...fields })), name)
			.toBe(false);
	const { text: _text, ...missingText } = alias;
	expect(validation.validate('memory.get', 'result', intentAliasResult(missingText))).toBe(false);
	const badNamespace = structuredClone(intentAliasResult());
	badNamespace.context.namespace.kind = 'global';
	expect(validation.validate('memory.get', 'result', badNamespace)).toBe(false);
	expect(validation.validate('memory.get', 'result', object(''))).toBe(false);
	expect(validation.validate('memory.correct', 'params', add(''))).toBe(false);
	expect(
		validation.validate('memory.get', 'result', { kind: 'context', context: context([contextEntry('合法😀')]) }),
	).toBe(true);
});

for (const [length, entryBytes, envelopeBytes, accepted] of [
	[420, 243683, 243882, true],
	[430, 249443, 249642, true],
	[460, 266723, 266922, false],
] as const) {
	it(`consumes the reviewed ${envelopeBytes}-byte context envelope at the public framed client boundary`, async () => {
		const sources = Array.from({ length: 3 }, (_, index) => ({
			kind: 'note' as const,
			resourceId: `source:${index}`,
			workspaceId: 'workspace',
			originClientId: 'client',
			originViewId: 'view',
			hostConnectionId: 'connection',
			hostLeaseId: 'lease',
			hostLeaseEpoch: '1',
			revision: '1',
			hash,
			scopeResourceIds: Array.from({ length: 32 }, (_, number) => '<'.repeat(length) + index + ':' + number),
		}));
		const entry = {
			id: 'entry',
			kind: 'attachment' as const,
			representation: 'metadata' as const,
			state: 'readable' as const,
			revision: '1',
			creatorKind: 'user' as const,
			preparationKind: 'explicit' as const,
			scope: { kind: 'session' as const, id: 'session' },
			sourceRefs: sources,
		};
		const value = {
			kind: 'context' as const,
			context: {
				runId: 'run',
				runRevision: '1',
				manifestRevision: '1' as const,
				namespace: { kind: 'agent' as const, id: 'agent' },
				scope: { kind: 'session' as const, id: 'session' },
				state: 'sealed' as const,
				entries: [entry],
			},
		};
		// These vectors have no omitted defaults; their escaped decoded sizes are fixed by review133.
		const encodedBytes = (input: unknown) =>
			utf8(
				JSON.stringify(input).replace(
					/[<>&\u2028\u2029]/g,
					(character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
				),
			);
		expect(encodedBytes(entry)).toBe(entryBytes);
		expect(encodedBytes(value)).toBe(envelopeBytes);
		expect(Math.max(...sources.flatMap((source) => source.scopeResourceIds.map(utf8)))).toBeLessThanOrEqual(512);
		const structural = new Ajv2020({
			strict: true,
			strictTypes: false,
			strictRequired: false,
			validateFormats: true,
		});
		addFormats(structural, { mode: 'full', formats: ['date-time'] });
		structural.addSchema(schema);
		expect(structural.getSchema(`${schema.$id}#/$defs/memory.get.result`)!(value)).toBe(true);
		expect.soft(validation.validate('memory.get', 'result', value)).toBe(accepted);
		const before = structuredClone(value);
		const peer = new MemoryPeer();
		const connection = new HapConnection(peer, {
			after: (ms, callback) => {
				const timer = setTimeout(callback, ms);
				return () => clearTimeout(timer);
			},
		});
		const connecting = connection.connect({ name: 'context-envelope-test', version: '1' });
		peer.reply('c:1', sample('protocol.hello', 'result'));
		const client = await connecting;
		try {
			const pending = client.memory.get({
				profileId: 'profile:1',
				namespace: value.context.namespace,
				kind: 'context',
				id: 'run',
			});
			peer.reply('c:2', value);
			if (accepted) {
				await expect(pending).resolves.toEqual(value);
				expect(client.state).toBe('ready');
			} else {
				await expect(pending).rejects.toThrow('INVALID_METHOD_RESULT');
				expect(client.state).toBe('closed');
			}
			expect(value).toEqual(before);
		} finally {
			client.close();
		}
	});
}

it('requires positive int64 source lease epochs in Memory snapshots, scopes and context labels', () => {
	const snapshot = sample('host.read', 'params').source as MemoryBody['sourceRefs'][number];
	const { scopeResourceIds: _ids, range: _range, ...scopeMetadata } = snapshot;
	for (const [hostLeaseEpoch, expected] of [
		['1', true],
		['9223372036854775807', true],
		['0', false],
		['01', false],
		['9223372036854775808', false],
		['11111111111111111111', false],
	] as const) {
		const source = { ...snapshot, hostLeaseEpoch };
		const sourceScope = { ...scopeMetadata, kind: 'folder' as const, hostLeaseEpoch };
		for (const references of [
			{ sourceRefs: [source], sourceScopes: [] },
			{ sourceRefs: [], sourceScopes: [sourceScope] },
		]) {
			const result = { ...item(), body: { ...body(), ...references } };
			expect
				.soft(
					validation.validate('memory.pin', 'result', result),
					JSON.stringify({ hostLeaseEpoch, kind: references.sourceRefs.length ? 'snapshot' : 'scope' }),
				)
				.toBe(expected);
		}
		const entry = {
			id: 'e',
			kind: 'attachment' as const,
			representation: 'metadata' as const,
			state: 'readable' as const,
			revision: '1',
			scope,
			creatorKind: 'user' as const,
			preparationKind: 'explicit' as const,
			sourceRefs: [source],
		};
		expect
			.soft(
				validation.validate('memory.get', 'result', { kind: 'context', context: context([entry]) }),
				`context epoch ${hostLeaseEpoch}`,
			)
			.toBe(expected);
	}
	const legacyRead = sample('host.read', 'params');
	(legacyRead.source as Record<string, unknown>).hostLeaseEpoch = '0';
	expect(validation.validate('host.read', 'params', legacyRead)).toBe(true);
	const job = {
		kind: 'job',
		job: {
			id: 'j',
			revision: '1',
			namespace,
			sourceRunId: 'r',
			admission: 'bound',
			commit: 'pending',
			run: { id: 'r', status: 'running', usage: { estimated: false, inputTokens: '0', outputTokens: '0' } },
		},
	};
	expect(validation.validate('memory.get', 'result', job)).toBe(true);
});

it('accepts only canonical positive int64 catalog revisions without changing nonmemory Decimal semantics', () => {
	for (const [namespaceRevision, expected] of [
		['1', true],
		['9223372036854775807', true],
		['0', false],
		['9223372036854775808', false],
		['11111111111111111111', false],
		['', false],
		['-1', false],
		['1.0', false],
		['01', false],
		['+1', false],
		[' 1', false],
	] as const) {
		const result = { namespaceRevision, items: [] };
		expect.soft(validation.validate('memory.list', 'result', result), namespaceRevision).toBe(expected);
		expect(result).toEqual({ namespaceRevision, items: [] });
	}
	const status = sample('service.status', 'result');
	(status.profile as Record<string, unknown>).revision = '0';
	expect(validation.validate('service.status', 'result', status)).toBe(true);
});

it('rejects a framed zero catalog revision through the real public BotClient', async () => {
	const peer = new MemoryPeer();
	const connection = new HapConnection(peer, {
		after: (ms, callback) => {
			const timer = setTimeout(callback, ms);
			return () => clearTimeout(timer);
		},
	});
	const connecting = connection.connect({ name: 'catalog-revision-test', version: '1' });
	peer.reply('c:1', sample('protocol.hello', 'result'));
	const client = await connecting;
	try {
		const query = { profileId: 'profile:1', namespace, kind: 'item' as const };
		const accepted = client.memory.list(query);
		peer.reply('c:2', { namespaceRevision: '9223372036854775807', items: [] });
		await expect(accepted).resolves.toEqual({ namespaceRevision: '9223372036854775807', items: [] });
		const rejected = client.memory.list(query);
		peer.reply('c:3', { namespaceRevision: '0', items: [] });
		await expect(rejected).rejects.toThrow('INVALID_METHOD_RESULT');
		expect(client.state).toBe('closed');
	} finally {
		client.close();
	}
});

it('enforces semantic params and framed results through the public BotClient, without trusting valid JSON shape', async () => {
	const peer = new MemoryPeer();
	const connection = new HapConnection(peer, {
		after: (ms, callback) => {
			const timer = setTimeout(callback, ms);
			return () => clearTimeout(timer);
		},
	});
	const connecting = connection.connect({ name: 'memory-test', version: '1' });
	peer.reply('c:1', sample('protocol.hello', 'result'));
	const client = await connecting;
	try {
		await expect(client.memory.correct(add('中'.repeat(21846)) as never)).rejects.toThrow('INVALID_METHOD_PARAMS');
		expect(peer.messages).toHaveLength(1);
		const reading = client.memory.get(get() as never);
		peer.reply('c:2', object('中'.repeat(21846)));
		await expect(reading).rejects.toThrow('INVALID_METHOD_RESULT');
		expect(client.state).toBe('closed');
	} finally {
		client.close();
	}
});
