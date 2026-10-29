import { expect, test } from 'vitest';
import {
	NativeReferenceError,
	accountNameOf,
	nativeOccupancyDigest,
	nativeOccupancyKey,
	occupancyIdentity,
	nativeReferenceKey,
	nativeReferenceOf,
} from './reference';

const row = (extra: Record<string, string> = {}) => ({
	agentId: 'codex',
	accountKey: '{"HUHU_ACCOUNT_NAME":"work"}',
	sessionId: 'same-id',
	sourceRef: 'codex:acct:/log/a.jsonl',
	...extra,
});

test('the same native id under two accounts, providers, devices or locators is never one reference', () => {
	const base = nativeReferenceOf(row(), 'dev-1');
	const keys = new Set([
		nativeReferenceKey(base),
		nativeReferenceKey(nativeReferenceOf(row({ accountKey: '{"HUHU_ACCOUNT_NAME":"home"}' }), 'dev-1')),
		nativeReferenceKey(nativeReferenceOf(row({ agentId: 'claude-code' }), 'dev-1')),
		nativeReferenceKey(nativeReferenceOf(row(), 'dev-2')),
		nativeReferenceKey(nativeReferenceOf(row({ sourceRef: 'codex:acct:/log/b.jsonl' }), 'dev-1')),
	]);
	expect(keys.size).toBe(5);
	expect(nativeReferenceKey(nativeReferenceOf(row(), 'dev-1'))).toBe(nativeReferenceKey(base));
});

test('occupancy is keyed by the physical provider store and native id, never by Vault-local identity', () => {
	const store = '/home/u/.claude/projects/p/a.jsonl';
	const a = occupancyIdentity({ provider: 'claude-code', nativeSessionId: 'same-id' }, store);
	// Two Vaults reach the same transcript with different device ids / account roots: one identity.
	const viaVaultA = nativeReferenceOf(
		row({ agentId: 'claude-code', accountKey: '{"HUHU_ACCOUNT_ROOT":"/vaultA/.huhu/agents/devA/system"}' }),
		'devA',
	);
	const viaVaultB = nativeReferenceOf(
		row({ agentId: 'claude-code', accountKey: '{"HUHU_ACCOUNT_ROOT":"/vaultB/.huhu/agents/devB/system"}' }),
		'devB',
	);
	expect(nativeReferenceKey(viaVaultA)).not.toBe(nativeReferenceKey(viaVaultB));
	expect(
		nativeOccupancyDigest(
			occupancyIdentity(viaVaultA && { provider: 'claude-code', nativeSessionId: 'same-id' }, store),
		),
	).toBe(nativeOccupancyDigest(a));
	for (const other of [
		occupancyIdentity(
			{ provider: 'claude-code', nativeSessionId: 'same-id' },
			'/home/u/.claude-work/projects/p/a.jsonl',
		),
		occupancyIdentity({ provider: 'pi', nativeSessionId: 'same-id' }, store),
		occupancyIdentity({ provider: 'claude-code', nativeSessionId: 'other' }, store),
	])
		expect(nativeOccupancyKey(other)).not.toBe(nativeOccupancyKey(a));
	expect(nativeOccupancyKey(a)).not.toContain('dev');
	expect(() => occupancyIdentity({ provider: 'codex', nativeSessionId: 'x' }, '')).toThrowError(NativeReferenceError);
});

test('an incomplete identity is reported instead of guessed', () => {
	expect(() => nativeReferenceOf(row({ sourceRef: '' }), 'dev')).toThrowError(NativeReferenceError);
	expect(() => nativeReferenceOf(row({ accountKey: '' }), 'dev')).toThrowError(NativeReferenceError);
	expect(() => nativeReferenceOf(row(), '')).toThrowError(NativeReferenceError);
	expect(accountNameOf('{"HUHU_ACCOUNT_NAME":"work"}')).toBe('work');
	expect(accountNameOf('{}')).toBe('');
	expect(accountNameOf('not json')).toBe('');
});
