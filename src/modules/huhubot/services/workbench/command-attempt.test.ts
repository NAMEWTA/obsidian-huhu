import { expect, test, vi } from 'vitest';
import { BotRpcError } from '../../core/protocol/connection';
import { CommandAttempt } from './command-attempt';

test.each(['INTERNAL_ERROR', 'REQUEST_CANCELED', 'PROFILE_CLEANUP_FAILED'])(
	'retries the exact committed intent after %s',
	async (reason) => {
		const attempt = new CommandAttempt<{ key: string; body: string }, string>();
		const execute = vi.fn(async (_command: { key: string; body: string }) => 'receipt');
		execute.mockRejectedValueOnce(
			new BotRpcError(-32603, {
				kind: reason === 'REQUEST_CANCELED' ? 'HOST_UNAVAILABLE' : 'CONFLICT',
				reason,
				retryable: false,
				correlationId: 'test',
			}),
		);
		await expect(attempt.send(() => ({ key: 'original', body: 'accepted body' }), execute)).rejects.toThrow();
		expect(attempt.uncertain).toBe(true);
		await attempt.send(() => ({ key: 'new', body: 'different body' }), execute);
		expect(execute.mock.calls[1]?.[0]).toEqual({ key: 'original', body: 'accepted body' });
	},
);
test('a declared validation refusal lets the user correct the input', async () => {
	const attempt = new CommandAttempt<{ body: string }, string>();
	const execute = vi.fn(async (_command: { body: string }) => 'receipt');
	execute.mockRejectedValueOnce(
		new BotRpcError(-32602, {
			kind: 'INVALID_ARGUMENT',
			reason: 'AGENT_NAME_REQUIRED',
			retryable: false,
			correlationId: 'test',
		}),
	);
	await expect(attempt.send(() => ({ body: '' }), execute)).rejects.toThrow();
	expect(attempt.uncertain).toBe(false);
	await attempt.send(() => ({ body: 'fixed' }), execute);
	expect(execute.mock.calls[1]?.[0]).toEqual({ body: 'fixed' });
});
