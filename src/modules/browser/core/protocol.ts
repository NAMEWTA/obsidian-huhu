import * as z from 'zod/mini';
import { AgentBrowserError, type SnapshotOptions, type SnapshotScope, type BrowserRunEvent, type BrowserEventSnapshot } from './contracts';
export const PROTOCOL_VERSION = 2 as const;
const string = (maximum: number, minimum = 0) => z.string().check(z.minLength(minimum), z.maxLength(maximum));
const integer = (minimum: number, maximum: number) => z.int().check(z.gte(minimum), z.lte(maximum));
const id = z.string().check(z.regex(/^[a-zA-Z0-9_.:-]{1,160}$/));
const requestId = z.string().check(z.regex(/^[a-zA-Z0-9_.:-]{1,96}$/));
const text = string(65_536),
	ref = string(256),
	finite = z.number();
export const snapshotScopeSchema = z.strictObject({
	frameId: z.optional(id),
	rootRef: z.optional(id),
	mode: z.optional(z.enum(['interactive', 'semantic', 'visible'])),
	maxNodes: z.optional(integer(1, 512)),
	maxBytes: z.optional(integer(1024, 65_536)),
});
export function snapshotScope(spaceId: string, pageId: string, input?: SnapshotOptions): SnapshotScope {
	const parsed = snapshotScopeSchema.safeParse(input ?? {});
	if (!parsed.success) throw new AgentBrowserError('invalid_request');
	return { ...parsed.data, spaceId, pageId, mode: parsed.data.mode ?? 'semantic', maxNodes: parsed.data.maxNodes ?? 512, maxBytes: parsed.data.maxBytes ?? 65_536 };
}
/** Mini keeps unused validators/locales outside the lazy browser bundle. These exact schemas also generate tools. */
export const commandSchema = z.union([
	z.strictObject({ kind: z.literal('navigate'), url: string(8192) }),
	z.strictObject({ kind: z.enum(['back', 'forward', 'reload', 'stop', 'text', 'screenshot']) }),
	z.strictObject({ kind: z.literal('snapshot'), scope: z.optional(snapshotScopeSchema) }),
	z.strictObject({ kind: z.literal('click'), observationId: id, ref }),
	z.strictObject({ kind: z.enum(['fill', 'type']), observationId: id, ref, text }),
	z.strictObject({
		kind: z.literal('select'),
		observationId: id,
		ref,
		values: z.array(string(4096)).check(z.minLength(1), z.maxLength(64)),
	}),
	z.strictObject({
		kind: z.literal('wait'),
		condition: z.union([
			z.strictObject({ kind: z.literal('url'), url: string(8192) }),
			z.strictObject({ kind: z.literal('text'), text: string(4096, 1) }),
			z.strictObject({ kind: z.literal('load') }),
		]),
		timeoutMs: integer(1, 15000),
	}),
	z.strictObject({ kind: z.literal('press'), key: string(80, 1), modifiers: z.optional(integer(0, 15)) }),
	z.strictObject({ kind: z.literal('scroll'), x: finite, y: finite, deltaX: finite, deltaY: finite }),
	z.strictObject({
		kind: z.literal('upload'),
		observationId: id,
		ref,
		fileIds: z.array(id).check(z.minLength(1), z.maxLength(8)),
	}),
]);
const runScope = { runId: id, capability: string(256, 32) };
/** Trusted viewer input has a closed schema but is never exposed as an Agent tool. */
export const humanInputSchema = z.union([
	z.strictObject({ kind: z.literal('text'), text: string(49152) }),
	z.strictObject({ kind: z.literal('key'), key: string(32, 1), modifiers: z.optional(integer(0, 15)) }),
	z.strictObject({ kind: z.literal('click'), x: finite, y: finite, button: z.optional(z.enum(['left', 'right', 'middle'])), clickCount: z.optional(z.union([z.literal(1), z.literal(2)])) }),
	z.strictObject({ kind: z.literal('scroll'), x: finite, y: finite, deltaX: finite, deltaY: finite }),
	z.strictObject({ kind: z.literal('composition'), phase: z.enum(['start', 'update', 'end', 'cancel']), text: string(49152), selectionStart: integer(0, 49152), selectionEnd: integer(0, 49152) }),
]).check(z.refine(value => {
	if ((value.kind === 'text' || value.kind === 'composition') && new TextEncoder().encode(value.text).byteLength > 49152) return false;
	return value.kind !== 'composition' || value.selectionStart <= value.selectionEnd && value.selectionEnd <= value.text.length && (!['start', 'cancel'].includes(value.phase) || !value.text);
}));
const pageScope = { ...runScope, pageId: id };
const eventTypeSchema = z.enum(['spaceChanged', 'pageChanged', 'controlChanged', 'operationChanged', 'humanRequest', 'downloadChanged', 'runtimeFault', 'cleanupChanged']);
const operationStateSchema = z.enum(['prepared', 'dispatching', 'completed', 'rejected', 'failed', 'cancelled_before_dispatch', 'outcome_unknown']);
const spaceStatusSchema = z.enum(['provisioning', 'starting', 'hydrating', 'ready', 'closing', 'stopped', 'faulted', 'quarantined', 'cleanup_pending', 'removed']);
const controlModeSchema = z.enum(['paused', 'agent', 'human', 'quiescing', 'blocked']);
const cursorSchema = integer(0, Number.MAX_SAFE_INTEGER);
export const runEventSchema = z.strictObject({
	eventId: string(200, 1), streamId: id, streamSequence: integer(1, Number.MAX_SAFE_INTEGER), entityVersion: integer(1, Number.MAX_SAFE_INTEGER), sequence: integer(1, Number.MAX_SAFE_INTEGER),
	at: z.number(), type: eventTypeSchema, kind: z.enum(['page', 'page-closed', 'spaceChanged', 'pageChanged', 'controlChanged', 'operationChanged', 'humanRequest', 'downloadChanged', 'runtimeFault', 'cleanupChanged']),
	spaceId: id, runtimeId: id, epoch: cursorSchema, entityId: z.optional(id), pageId: z.optional(id), code: z.optional(z.literal('runtime_fault')),
	state: z.optional(z.enum(['provisioning', 'starting', 'hydrating', 'ready', 'closing', 'stopped', 'faulted', 'quarantined', 'cleanup_pending', 'paused', 'agent', 'human', 'quiescing', 'blocked', 'prepared', 'dispatching', 'completed', 'rejected', 'failed', 'cancelled_before_dispatch', 'outcome_unknown', 'pending', 'open', 'closed', 'denied', 'resolved', 'progressing', 'cancelled', 'removed', 'revoked'])),
});
export const eventSnapshotSchema = z.strictObject({
	runId: id, spaceId: id, runtimeId: id, runEpoch: cursorSchema, generation: cursorSchema, active: z.boolean(), streamId: id, cursor: cursorSchema,
	space: z.strictObject({ status: spaceStatusSchema, kind: z.enum(['personal', 'task']) }),
	control: z.strictObject({ mode: controlModeSchema, epoch: cursorSchema }), cleanup: z.strictObject({ state: z.enum(['pending', 'failed', 'completed']) }),
	pages: z.array(z.strictObject({ id, documentId: string(160), status: z.enum(['pending', 'open', 'failed', 'closed']), viewportVersion: cursorSchema })).check(z.maxLength(12)),
	requests: z.array(z.strictObject({ id, pageId: id, kind: z.enum(['dialog', 'file-chooser', 'permission', 'http-auth']), status: z.enum(['pending', 'denied', 'resolved']), revision: cursorSchema, expiresAt: z.number() })).check(z.maxLength(64)),
	downloads: z.array(z.strictObject({ id, pageId: id, state: z.enum(['in-progress', 'completed', 'canceled', 'failed']), receivedBytes: z.number(), totalBytes: z.number() })).check(z.maxLength(256)),
	operations: z.array(z.strictObject({ id, state: operationStateSchema, updatedAt: z.number(), sequence: z.optional(integer(1, Number.MAX_SAFE_INTEGER)) })).check(z.maxLength(10000)),
});
/** The server and standalone CLI validate the same metadata-only event responses. */
export function parseEventResult(method: 'events.poll', value: unknown): BrowserRunEvent[];
export function parseEventResult(method: 'events.snapshot', value: unknown): BrowserEventSnapshot;
export function parseEventResult(method: 'events.poll' | 'events.snapshot', value: unknown): BrowserRunEvent[] | BrowserEventSnapshot {
	const result = (method === 'events.poll' ? z.array(runEventSchema).check(z.maxLength(256)) : eventSnapshotSchema).safeParse(value);
	if (!result.success) throw new AgentBrowserError('invalid_event_response');
	if (method === 'events.poll' && (result.data as BrowserRunEvent[]).some(row => row.sequence !== row.streamSequence || row.entityVersion !== row.sequence || row.eventId !== `${row.streamId}:${row.sequence}`)) throw new AgentBrowserError('invalid_event_response');
	if (method === 'events.snapshot') {
		const snapshot = result.data as BrowserEventSnapshot;
		if (!snapshot.active && (snapshot.pages.length || snapshot.requests.length || snapshot.downloads.length)) throw new AgentBrowserError('invalid_event_response');
	}
	return result.data;
}
const schemas = {
	status: z.strictObject({}),
	'space.create': z.strictObject({
		requestId,
		label: z.optional(string(120)),
		ephemeral: z.optional(z.boolean()),
		url: z.optional(string(8192)),
	}),
	'run.start': z.strictObject({ spaceId: id }),
	'run.stop': z.strictObject(runScope),
	'run.heartbeat': z.strictObject(runScope),
	'page.list': z.strictObject(runScope),
	'page.open': z.strictObject({ ...runScope, requestId, url: z.optional(string(8192)) }),
	'page.close': z.strictObject({ ...pageScope, requestId }),
	observe: z.strictObject({ ...pageScope, scope: z.optional(snapshotScopeSchema) }),
	'operation.prepare': z.strictObject({ ...pageScope, requestId, command: commandSchema }),
	'operation.execute': z.strictObject({ ...runScope, operationId: id, command: commandSchema }),
	'operation.get': z.strictObject({ ...runScope, operationId: id }),
	batch: z.strictObject({
		...pageScope,
		requestId,
		commands: z.array(commandSchema).check(z.minLength(1), z.maxLength(32)),
	}),
	'file.list': z.strictObject(runScope),
	'download.list': z.strictObject(runScope),
	'events.poll': z.strictObject({ ...runScope, afterSequence: z.optional(cursorSchema), streamId: z.optional(id) }),
	'events.snapshot': z.strictObject(runScope),
	health: z.strictObject(runScope),
} as const;
export type BrowserMethod = keyof typeof schemas;
export type MethodParams<M extends BrowserMethod> = z.infer<(typeof schemas)[M]>;
export const methodNames = Object.keys(schemas) as BrowserMethod[];
export const envelopeSchema = z.strictObject({
	protocolVersion: z.literal(PROTOCOL_VERSION),
	requestId: id,
	bootId: id,
	method: z.enum(methodNames as [BrowserMethod, ...BrowserMethod[]]),
	params: z.unknown(),
	deadlineAtMs: z.number(),
});
export function parseMethod<M extends BrowserMethod>(method: M, params: unknown): MethodParams<M> {
	const result = schemas[method].safeParse(params);
	if (!result.success) throw new AgentBrowserError('invalid_request');
	return result.data as MethodParams<M>;
}
export function protocolTools() {
	return methodNames.map((name) => ({
		name: `browser_${name.replaceAll('.', '_')}`,
		method: name,
		inputSchema: z.toJSONSchema(schemas[name]),
		exposure: 'agent' as const,
	}));
}
export function validatePageUrl(input: string): string {
	if (input === 'about:blank') return input;
	try {
		const u = new URL(input);
		if ((u.protocol === 'http:' || u.protocol === 'https:') && !u.username && !u.password && input.length <= 8192)
			return u.href;
	} catch {
		/* Invalid and non-web URLs share a stable public error. */
	}
	throw new AgentBrowserError('unsupported_url');
}
