import { expect, test } from 'vitest';
import { TerminalSession } from '../terminal/session';
import { ControlPaging, type ResponseEnvelope } from './paging';
import { controlJsonBytes } from '../../../../shared/native/control-wire';
const envelope: ResponseEnvelope = {
	protocolVersion: 1,
	requestId: 'r',
	operation: 'terminal.read',
	ok: true,
	phase: 'read',
	effect: 'none',
	target: { spaceId: 's', sessionId: 'p', runtimeId: 'r' },
};
const ref = { spaceId: 's', sessionId: 'p', runtimeId: 'r' };
const object = (value: unknown) =>
	value as { text: string; nextCursor?: string; cursor?: string; maxRows: number; maxBytes: number; rows: unknown[] };
test('whole response budget clamps model rows and UTF8 bytes; cursor retries preserve the exact snapshot position without skipped characters', async () => {
	const session = new TerminalSession({
		id: 'r',
		sid: 1,
		title: 'test',
		kind: 'shell',
		cwd: '/',
		cols: 200,
		rows: 2,
		scrollback: 100,
		platform: 'linux',
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	session.attach({ input() {}, resize() {}, acknowledge() {}, end() {} }, 1);
	try {
		const text = 'a😀b\\\u0001'.repeat(30);
		session.receive(new TextEncoder().encode(text));
		await session.whenParsed();
		const paging = new ControlPaging();
		const first = object(await paging.read(session, ref, { key: 'fixed', limit: 1000, maxBytes: 4 }, envelope));
		expect(first.maxRows).toBe(200);
		expect(first.text).toBe('a');
		expect(first.nextCursor).toBeTruthy();
		const retry = await paging.read(
			session,
			ref,
			{ key: 'fixed', limit: 1000, maxBytes: 4, cursor: first.cursor },
			envelope,
		);
		expect(retry).toEqual(first);
		const second = object(
			await paging.read(
				session,
				ref,
				{ key: 'fixed', limit: 1000, maxBytes: 4, cursor: first.nextCursor },
				envelope,
			),
		);
		expect(second.text).toBe('😀');
		const wide = object(await paging.read(session, ref, { key: 'wide', limit: 1000, maxBytes: 65536 }, envelope));
		expect(wide.maxBytes).toBeLessThan(8192);
		expect(controlJsonBytes({ ...envelope, data: wide })).toBeLessThanOrEqual(49152);
		await expect(
			paging.read(session, ref, { key: 'another-scope', cursor: first.nextCursor }, envelope),
		).rejects.toMatchObject({ code: 'STALE_RUNTIME' });
	} finally {
		session.dispose();
	}
});
test('list cursor is stable for position and query revision; an oversized full row is refused rather than truncated', () => {
	const paging = new ControlPaging(),
		rows = [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
		options = { key: 'q', revision: 1, limit: 1 };
	const first = object(paging.list(rows, options, envelope));
	const next = { ...options, cursor: first.nextCursor };
	expect(paging.list(rows, next, envelope)).toEqual(paging.list(rows, next, envelope));
	expect(() => paging.list(rows, { ...next, revision: 2 }, envelope)).toThrowError(
		expect.objectContaining({ code: 'STALE_RUNTIME' }),
	);
	expect(() => paging.list([{ name: '\u0001'.repeat(12000) }], options, envelope)).toThrowError(
		expect.objectContaining({ code: 'CAPACITY_EXCEEDED' }),
	);
});
