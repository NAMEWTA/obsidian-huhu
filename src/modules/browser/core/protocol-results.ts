import * as z from 'zod/mini';

const text = (max: number, min = 0) => z.string().check(z.minLength(min), z.maxLength(max));
const id = text(256, 1), count = z.int().check(z.gte(0)), time = z.number().check(z.gte(0));
const optional = z.optional, object = z.strictObject;
const execution = object({ consumerId: text(128, 1), agentId: text(128, 1), externalRunId: text(128, 1), attemptId: text(128, 1) });
const run = object({
	id, spaceId: id, runtimeId: id, issuerId: id, epoch: count, leaseId: id,
	state: z.enum(['active', 'revoked', 'stopped']), expiresAt: time, externalTaskId: optional(id), execution: optional(execution),
	handoff: optional(object({ transitionId: id, fromRunId: id, pageId: id })),
});
export const grantResultSchema = object({ run, capability: text(256, 32) });
export const createdResultSchema = object({ spaceId: id, run, capability: text(256, 32) });
export const pageResultSchema = object({
	id, spaceId: id, url: text(8192), title: text(65536), documentId: text(256),
	status: z.enum(['pending', 'open', 'failed', 'closed']), error: optional(text(160)), zoom: z.number().check(z.gt(0)), viewportVersion: count,
});
const frameCoverage = object({ frameId: id, documentId: text(256), status: z.enum(['complete', 'partial', 'failed', 'omitted']), nodes: count });
const frameError = object({ frameId: id, code: z.enum(['frame_unavailable', 'frame_tree_unavailable', 'accessibility_unavailable', 'dom_unavailable', 'closed_shadow_root', 'budget_exceeded']) });
const mode = z.enum(['interactive', 'semantic', 'visible']);
export const observationResultSchema = object({
	id, spaceId: id, pageId: id, runtimeId: id, documentId: text(256), epoch: count, viewportVersion: count,
	scope: object({ spaceId: id, pageId: id, frameId: optional(id), rootRef: optional(id), mode,
		maxNodes: z.int().check(z.gte(1), z.lte(512)), maxBytes: z.int().check(z.gte(1024), z.lte(65536)) }),
	coverage: z.array(frameCoverage).check(z.maxLength(2048)), frameErrors: z.array(frameError).check(z.maxLength(2048)),
	url: text(8192), title: text(65536), text: optional(text(65536)), truncated: z.boolean(),
	nodes: z.array(object({ ref: id, frameId: id, role: text(1024), name: text(65536), value: optional(text(65536)), visible: z.boolean(),
		bounds: optional(object({ x: z.number(), y: z.number(), width: z.number().check(z.gte(0)), height: z.number().check(z.gte(0)) })) })).check(z.maxLength(512)),
});
export const operationResultSchema = object({
	id, requestId: text(512, 1), digest: text(1024, 1),
	scope: object({ principal: z.enum(['agent', 'human', 'workspace']), issuerId: id, authorityId: optional(id), spaceId: optional(id), pageId: optional(id), runtimeId: optional(id), epoch: optional(count) }),
	state: z.enum(['prepared', 'dispatching', 'completed', 'rejected', 'failed', 'cancelled_before_dispatch', 'outcome_unknown']),
	createdAt: time, updatedAt: time, sequence: optional(z.int().check(z.gte(1))), expiresAt: optional(time), error: optional(text(160)), result: optional(z.json()),
});
const fileScope = object({ spaceId: id, execution: z.union([object({ kind: z.literal('agent'), runId: id }), object({ kind: z.literal('human'), viewerId: id, epoch: count })]) });
export const fileResultSchema = object({ id, name: text(180), size: count, kind: z.enum(['upload', 'download']), state: z.enum(['ready', 'pending', 'failed']), sha256: z.string().check(z.regex(/^[a-f0-9]{64}$/)), scope: fileScope, createdAt: time });
export const downloadResultSchema = object({ id, pageId: id, scope: fileScope, name: text(180), state: z.enum(['in-progress', 'completed', 'canceled', 'failed']), receivedBytes: count, totalBytes: count, fileId: optional(id), error: optional(text(160)), cleanup: optional(z.enum(['pending', 'complete'])) });
export const healthResultSchema = object({ runId: id, runtimeId: id, epoch: count, eventCursor: count, pages: count, viewers: count, framesReceived: count, framesReplaced: count, queuedFrameBytes: count, pendingRequests: count });
export const batchResultSchema = object({ results: z.array(operationResultSchema).check(z.maxLength(32)), completedCount: z.int().check(z.gte(0), z.lte(32)), failedIndex: optional(z.int().check(z.gte(0), z.lte(31))), truncated: optional(z.boolean()), error: optional(text(160)) });
const jsonSchema = z.record(z.string(), z.unknown());
export const statusResultSchema = object({
	protocolVersion: z.literal(2), spaceId: id,
	availability: object({ state: z.enum(['ready', 'missing', 'unsupported', 'invalid']), code: optional(text(160)), version: optional(text(128)), platform: optional(text(128)) }),
	tools: z.array(object({ name: text(128), method: text(64), inputSchema: jsonSchema, outputSchema: jsonSchema, exposure: z.literal('agent'),
		scope: z.enum(['connection', 'run', 'page', 'operation']), risk: z.enum(['read', 'control', 'mutation']),
		idempotency: z.enum(['read', 'request-id', 'operation-id', 'no-retry']), deadlineMs: count, maxResponseBytes: count,
	})).check(z.maxLength(64)),
});
