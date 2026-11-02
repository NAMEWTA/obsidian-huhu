import { expect, test } from 'vitest';
import { emptyRecords, isWorkbenchRecords } from './records';
const physical = { canonicalPath: '/v', dev: '1', ino: '2' };
function records() {
	const value = emptyRecords({ vaultId: 'v', deviceId: 'd', rootPath: '/v', root: physical });
	value.spaces.s = {
		id: 's',
		name: 'Space',
		archived: false,
		createdAt: 1,
		updatedAt: 1,
		directory: { kind: 'vault', relativePath: '', target: physical },
	};
	value.sessions.session = {
		id: 'session',
		spaceId: 's',
		kind: 'agent',
		title: 'Agent',
		agentId: 'codex',
		accountId: '',
		createdAt: 1,
	};
	return value;
}
test('persisted Session consumes only known Provider, shell and string references', () => {
	expect(isWorkbenchRecords(records())).toBe(true);
	for (const change of [
		{ agentId: 'unknown' },
		{ agentId: undefined },
		{ accountId: {} },
		{ shell: 'unknown' },
		{ nativeSessionId: [] },
		{ transcriptPath: { path: '/secret' } },
		{ env: { TOKEN: 'never-persist' } },
		{ spaceId: 'missing' },
	]) {
		const value = records();
		Object.assign(value.sessions.session!, change);
		expect(isWorkbenchRecords(value), JSON.stringify(change)).toBe(false);
	}
});

test('durable attempt state and native cleanup evidence must agree exactly', () => {
	const notStarted = {
		root: { state: 'not-started', code: null, signal: null },
		cleanup: { state: 'confirmed', scope: 'not-started', remainingKnown: 0 },
		output: 'drained',
	};
	const exited = {
		root: { state: 'exited', code: 7, signal: null },
		cleanup: { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 },
		output: 'drained',
	};
	for (const [state, termination] of [
		['not-started', exited],
		['settled', notStarted],
		['unconfirmed', exited],
		[['unconfirmed'], undefined],
	]) {
		const value = records();
		Object.assign(value.sessions.session!, { lastAttempt: { runtimeId: 'r', acceptedAt: 1, state, termination } });
		expect(isWorkbenchRecords(value), JSON.stringify({ state, termination })).toBe(false);
	}
	for (const [state, termination] of [
		['not-started', notStarted],
		['settled', exited],
		['unconfirmed', undefined],
	]) {
		const value = records();
		Object.assign(value.sessions.session!, { lastAttempt: { runtimeId: 'r', acceptedAt: 1, state, termination } });
		expect(isWorkbenchRecords(value)).toBe(true);
	}
});

test('T06 persisted completion hint is finite and cannot smuggle source facts or seen beyond completion', () => {
	for (const completionHint of [
		{ runtimeId: 'r', activitySequence: 1, observedAt: 1, seenThrough: 2 },
		{ runtimeId: 'r', activitySequence: Infinity, observedAt: 1, seenThrough: 0 },
		{ runtimeId: 'r', activitySequence: 1, observedAt: 1, seenThrough: 0, blocking: { state: 'clear' } },
		{ runtimeId: '😀'.repeat(100), activitySequence: 1, observedAt: 1, seenThrough: 0 },
	]) {
		const value = records();
		Object.assign(value.sessions.session!, { completionHint });
		expect(isWorkbenchRecords(value)).toBe(false);
	}
	const value = records();
	Object.assign(value.sessions.session!, {
		completionHint: { runtimeId: 'r', activitySequence: 2, observedAt: 1, seenThrough: 1 },
	});
	expect(isWorkbenchRecords(value)).toBe(true);
});

test('optional inbox is validated as its own bounded subdocument and old records remain valid', () => {
	const value = records();
	expect(isWorkbenchRecords(value)).toBe(true);
	value.inbox = { version: 1, messages: [{ messageId: 'm', recipient: { spaceId: 's', sessionId: 'session' }, source: 'test', body: 'hello', references: [], sendSequence: 1, createdAt: 1 }], nextSequence: 2 };
	expect(isWorkbenchRecords(value)).toBe(true);
	value.inbox = { ...value.inbox, messages: [{ ...value.inbox.messages[0]!, references: [{ kind: 'vault-file', vaultId: 'v', path: '../escape' }] }] };
	expect(isWorkbenchRecords(value)).toBe(false);
});

test('fresh-import proof is an explicit optional literal and never inferred from provenance alone', () => {
	for (const neverStarted of [undefined, true, false, 'true']) {
		const value = records();
		Object.assign(value.sessions.session!, { nativeImport: { sourceRef: 'source', accountKey: '{}', deviceId: 'd', importedAt: 1, ...(neverStarted === undefined ? {} : { neverStarted }) } });
		expect(isWorkbenchRecords(value)).toBe(neverStarted === undefined || neverStarted === true);
	}
});


test('a stored launch attempt cannot coexist with a never-started import claim', () => {
	const value = records();
	Object.assign(value.sessions.session!, { nativeImport: { sourceRef: 'source', accountKey: '{}', deviceId: 'd', importedAt: 1, neverStarted: true }, lastAttempt: { runtimeId: 'r', acceptedAt: 2, state: 'unconfirmed' } });
	expect(isWorkbenchRecords(value)).toBe(false);
});
