import { expect, it } from 'vitest';
import type { AgentDraft } from '../api';
import { HapConnection, type HapTransport } from '../core/protocol/connection';
import { HapDecoder, encodeHapFrame, type HapRequest } from '../core/protocol/codec';
import { AssistantClient } from './assistant-client';

const draft: AgentDraft = { name: 'Draft', description: '', persona: '', model: {
	modelId: 'unassembled', providerId: 'fixture', endpoint: 'https://example.invalid',
	protocol: 'openai-responses', capabilities: [],
} };
const meta = { commandId: 'cmd:one', idempotencyKey: 'intent:one', commandEpoch: '1' };
async function setup() {
	const requests: HapRequest[] = [];
	let incoming: (bytes: Uint8Array) => void = () => undefined;
	const transport: HapTransport = {
		onData: (listener) => { incoming = listener; return () => undefined; },
		onClose: () => () => undefined, close: () => undefined,
		send: (bytes) => {
			const request = new HapDecoder().push(bytes)[0] as HapRequest; requests.push(request);
			const error = request.method === 'models.test'
				? { kind: 'MODEL_UNAVAILABLE', reason: 'ADAPTER_NOT_ASSEMBLED', retryable: false, correlationId: 'test' }
				: request.method === 'agents.update' && requests.filter((item) => item.method === 'agents.update').length > 1
					? { kind: 'CONFLICT', reason: 'REVISION_CONFLICT', retryable: false, correlationId: 'test' } : undefined;
			const result = request.method === 'protocol.hello' ? {
				protocolVersion: '0.1', buildVersion: '0.1.0-dev', schemaVersion: 1,
				profile: { profileId: 'p1', commandEpoch: '1', revision: '1', createdAt: '2026-10-25T00:00:00Z' },
				capabilities: [], limits: { maxFrameBytes: 1048576, maxBatchItems: 8 },
			} : { ...draft, id: 'agent:one', revision: '2', personaRevision: '2', modelBindingRevision: '1',
				enabled: true, isDefault: false, model: { ...draft.model, revision: '1', credentialStatus: { mode: 'none', state: 'missing' } } };
			if (!request.id) throw new Error('Expected an identified request');
			incoming(encodeHapFrame(error ? { jsonrpc: '2.0', id: request.id, error: { code: -32000, message: 'unavailable', data: error as never } }
				: { jsonrpc: '2.0', id: request.id, result: result as never }));
			return Promise.resolve();
		},
	};
	const bot = await new HapConnection(transport, { after: (ms, run) => { const timer = setTimeout(run, ms); return () => clearTimeout(timer); } }).connect({ name: 'test', version: '1' });
	return { assistant: new AssistantClient(bot), requests, bot };
}

it('saves credential-free drafts through the common BotClient and preserves intent/CAS metadata', async () => {
	const { assistant, requests, bot } = await setup();
	try {
		const created = await assistant.createAgent({ ...meta, draft });
		expect(created.model?.credentialStatus).toEqual({ mode: 'none', state: 'missing' });
		const update = { ...meta, id: created.id, expectedRevision: '1', draft };
		await assistant.updateAgent(update);
		await expect(assistant.updateAgent(update)).rejects.toThrow('REVISION_CONFLICT');
		const updates = requests.filter((request) => request.method === 'agents.update');
		expect(updates.map((request) => request.params)).toEqual([{ ...update, profileId: 'p1' }, { ...update, profileId: 'p1' }]);
		expect(update).toEqual({ ...meta, id: created.id, expectedRevision: '1', draft });
	} finally { bot.close(); }
});

it('keeps the real unavailable model error instead of inventing a successful capability result', async () => {
	const { assistant, bot } = await setup();
	try { await expect(assistant.testModel(draft.model!)).rejects.toThrow('MODEL_UNAVAILABLE: ADAPTER_NOT_ASSEMBLED'); }
	finally { bot.close(); }
});
