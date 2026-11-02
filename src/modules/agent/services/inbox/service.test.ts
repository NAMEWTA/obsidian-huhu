import { expect, test, vi } from 'vitest';
import { InboxService } from './service';
import { SpaceError } from '../../core/space/errors';

function fakeSpaces() {
	const row = { messageId: 'm', recipient: { spaceId: 's', sessionId: 'x' }, source: 'test', body: 'body', references: [], sendSequence: 1, createdAt: 1 } as const;
	return {
		row,
		spaces: {
			sendInbox: vi.fn(async () => row),
			listInbox: vi.fn(async () => ({ rows: [row], highWaterSequence: 1, freshness: 'fresh' as const })),
			readInbox: vi.fn(async () => row),
			ackInbox: vi.fn(async () => ({ message: { ...row, ack: { ackedAt: 2 } }, status: 'ack-saved' as const, effect: 'completed' as const })),
			freshInboxPrimary: vi.fn(async () => ({ freshness: 'fresh' as const })),
		},
	};
}

test('facade binds explicit recipient, keeps availability closed, and delegates one owner', async () => {
	const f = fakeSpaces();
	const service = new InboxService({ spaces: f.spaces as never });
	expect(service.available()).toBe(true);
	expect(service.available('cli')).toBe(true);
	expect(service.isAvailable).toBe(true);
	await expect(service.send({ messageId: 'm', recipient: { spaceId: 's', sessionId: 'x' }, source: 'test', body: 'body' })).resolves.toMatchObject({ status: 'saved', effect: 'completed' });
	expect(f.spaces.sendInbox).toHaveBeenCalledOnce();
	await expect(service.list({ spaceId: 's', sessionId: 'x' })).resolves.toMatchObject({ rows: [{ messageId: 'm' }] });
	await expect(service.ack('m')).resolves.toMatchObject({ status: 'saved' });
	service.dispose();
	expect(service.available()).toBe(false);
	expect(service.available('cli')).toBe(false);
	expect(service.isAvailable).toBe(false);
	await expect(service.read('m')).rejects.toMatchObject({ reason: 'module-closing' });
});

test('facade refuses missing Space/Session before any owner call', async () => {
	const f = fakeSpaces();
	const service = new InboxService({ spaces: f.spaces as never });
	await expect(service.send({ messageId: 'm', recipient: { spaceId: '', sessionId: '' }, source: 'test', body: 'body' })).rejects.toMatchObject({ code: 'TARGET_REQUIRED' });
	expect(f.spaces.sendInbox).not.toHaveBeenCalled();
});

test('send forwards the caller AbortSignal to the sole SpaceService owner', async () => {
	const f = fakeSpaces();
	const service = new InboxService({ spaces: f.spaces as never });
	const controller = new AbortController();
	await service.send({ messageId: 'signal', recipient: { spaceId: 's', sessionId: 'x' }, source: 'test', body: 'body' }, { signal: controller.signal });
	expect(f.spaces.sendInbox).toHaveBeenCalledWith(expect.anything(), { signal: controller.signal });
});

test('failure diagnostics are truncated directly at the UTF-8 byte boundary', async () => {
	const f = fakeSpaces();
	f.spaces.sendInbox.mockRejectedValueOnce(new SpaceError('PERSISTENCE_FAILED', '😀'.repeat(4096)));
	const service = new InboxService({ spaces: f.spaces as never });
	const result = await service.send({ messageId: 'diagnostic', recipient: { spaceId: 's', sessionId: 'x' }, source: 'test', body: 'body' });
	const diagnostic = result.error?.diagnostic ?? '';
	expect(new TextEncoder().encode(diagnostic).byteLength).toBeLessThanOrEqual(4096);
	expect(diagnostic).toContain('PERSISTENCE_FAILED:');
	expect(diagnostic.length).toBeGreaterThan(2048);
});
