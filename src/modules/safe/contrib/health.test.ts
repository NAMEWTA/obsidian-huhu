import { expect, test, vi } from 'vitest';
import { createSafeHealth } from './health';

test('locked safe never reads ciphertext or metadata, even when scan is called directly', async () => {
	const stat = vi.fn(async () => ({ size: 10 })), read = vi.fn(async () => 'SECRET');
	const check = createSafeHealth({ state: () => 'locked', stat, read });
	const signal = new AbortController().signal;
	expect(await check.permission(signal)).toBe('locked');
	const chunks = [];
	for await (const chunk of check.scan({ signal, batchSize: 1, remainingItems: 1 })) chunks.push(chunk);
	expect(chunks).toEqual([{ checked: 0, status: 'locked' }]);
	expect(stat).not.toHaveBeenCalled(); expect(read).not.toHaveBeenCalled();
});

test('safe metadata cannot continue into a ciphertext read after locking or cancellation', async () => {
	const controller = new AbortController(), read = vi.fn(async () => 'SECRET');
	let locked = false;
	const check = createSafeHealth({ state: () => locked ? 'locked' : 'unlocked', stat: async () => { locked = true; return { size: 10 }; }, read });
	const chunks = [];
	for await (const chunk of check.scan({ signal: controller.signal, batchSize: 1, remainingItems: 1 })) chunks.push(chunk);
	expect(chunks).toEqual([{ checked: 0, status: 'locked' }]);
	expect(read).not.toHaveBeenCalled();
	controller.abort();
	await expect(check.permission(controller.signal)).rejects.toThrow();
});

test('safe format version metadata can pass without authenticating or decrypting contents', async () => {
	const raw = '{"format":"huhu-safe","version":1,"payload":"opaque ciphertext"}';
	const check = createSafeHealth({ state: () => 'unlocked', stat: async () => ({ size: raw.length }), read: async () => raw });
	const chunks = [];
	for await (const chunk of check.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 1 })) chunks.push(chunk);
	expect(chunks).toEqual([{ checked: 1, total: 1, issues: [] }]);
});

test('safe rechecks permission synchronously at the read boundary', async () => {
	let locked = false, metadataDone = false, queued = false;
	const lockedAtRead: boolean[] = [];
	const check = createSafeHealth({
		state: () => { if (metadataDone && !queued) { queued = true; queueMicrotask(() => { locked = true; }); } return locked ? 'locked' : 'unlocked'; },
		stat: async () => { metadataDone = true; return { size: 10 }; }, read: async () => { lockedAtRead.push(locked); return '{}'; },
	});
	for await (const _chunk of check.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 1 })) { /* drain */ }
	expect(lockedAtRead).toEqual([false]);
});

test.each([
	[null, null, 'missing'],
	[{ size: 20 }, '{"format":"huhu-safe","version":2}', 'unsupported-version'],
	[{ size: 20 }, '{broken SECRET', 'unparseable'],
	[{ size: 11 * 1024 * 1024 }, 'NEVER READ', 'budget-exceeded'],
] as const)('safe metadata reports a bounded, redacted diagnostic for %s', async (metadata, raw, code) => {
	const read = vi.fn(async () => raw);
	const check = createSafeHealth({ state: () => 'unlocked', stat: async () => metadata, read });
	const chunks = [];
	for await (const chunk of check.scan({ signal: new AbortController().signal, batchSize: 1, remainingItems: 1 })) chunks.push(chunk);
	expect(chunks.flatMap(chunk => chunk.issues ?? []).map(issue => issue.code)).toEqual([code]);
	expect(JSON.stringify(chunks)).not.toMatch(/SECRET|NEVER/);
	if (!metadata || metadata.size > 10 * 1024 * 1024) expect(read).not.toHaveBeenCalled();
});
