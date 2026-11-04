import { expect, test } from 'vitest';
import { DomainEvents, domainEventKey } from './domain-events';

const changed = domainEventKey<{ readonly id: string }>('archives:changed');

test('delivers typed events only to the matching key on the same instance', () => {
	const first = new DomainEvents();
	const second = new DomainEvents();
	const received: string[] = [];
	first.on(changed, payload => { received.push(payload.id); });
	second.on(changed, () => { received.push('other-instance'); });
	first.on(domainEventKey<{ id: string }>('archives:changed'), () => { received.push('other-key'); });
	first.emit(changed, { id: 'one' });
	expect(received).toEqual(['one']);
	first.dispose();
	second.emit(changed, { id: 'two' });
	expect(received).toEqual(['one', 'other-instance']);
	second.dispose();
});

test('cancellation and lifetime disposal remove subscriptions without affecting a replacement', () => {
	const events = new DomainEvents();
	const cancelled = new AbortController();
	const cleanups: Array<() => void> = [];
	const received: string[] = [];
	const oldOff = events.on(changed, () => { received.push('old'); });
	oldOff();
	events.on(changed, () => { received.push('replacement'); });
	oldOff();
	events.on(changed, () => { received.push('cancelled'); }, { signal: cancelled.signal });
	events.on(changed, () => { received.push('lifetime'); }, { lifetime: { register: cleanup => { cleanups.push(cleanup); } } });
	cancelled.abort();
	for (const cleanup of cleanups) { cleanup(); cleanup(); }
	events.emit(changed, { id: 'one' });
	expect(received).toEqual(['replacement']);
	events.dispose();
	events.dispose();
	events.on(changed, () => { received.push('after-dispose'); });
	events.emit(changed, { id: 'two' });
	expect(received).toEqual(['replacement']);
});

test('sync throws and async rejections cannot stop other subscribers or escape emit', async () => {
	const events = new DomainEvents();
	const received: string[] = [];
	events.on(changed, () => { throw new Error('SECRET'); });
	events.on(changed, async () => { throw new Error('SECRET-ASYNC'); });
	events.on(changed, payload => { received.push(payload.id); });
	expect(() => events.emit(changed, { id: 'one' })).not.toThrow();
	await Promise.resolve();
	await Promise.resolve();
	expect(received).toEqual(['one']);
});

test('a pre-aborted signal does not retain a subscription or register lifetime cleanup', () => {
	const events = new DomainEvents();
	const controller = new AbortController();
	controller.abort();
	const received: string[] = [];
	const cleanups: Array<() => void> = [];
	const off = events.on(changed, () => { received.push('unexpected'); }, {
		signal: controller.signal,
		lifetime: { register: cleanup => { cleanups.push(cleanup); } },
	});
	off();
	events.emit(changed, { id: 'one' });
	expect(received).toEqual([]);
	expect(cleanups).toEqual([]);
});

test('separate registrations of one handler have independent ownership', () => {
	const events = new DomainEvents();
	const received: string[] = [];
	const handler = ({ id }: { id: string }) => { received.push(id); };
	const firstOff = events.on(changed, handler);
	const secondOff = events.on(changed, handler);
	events.emit(changed, { id: 'both' });
	firstOff();
	firstOff();
	events.emit(changed, { id: 'second' });
	secondOff();
	events.emit(changed, { id: 'neither' });
	expect(received).toEqual(['both', 'both', 'second']);
});

test('new subscriptions wait for the next emission and removals take effect immediately', () => {
	const events = new DomainEvents();
	const controller = new AbortController();
	const received: string[] = [];
	let added = false;
	events.on(changed, () => {
		received.push('first');
		controller.abort();
		if (!added) {
			added = true;
			events.on(changed, () => { received.push('new'); });
		}
	});
	events.on(changed, () => { received.push('aborted'); }, { signal: controller.signal });
	events.emit(changed, { id: 'one' });
	expect(received).toEqual(['first']);
	events.emit(changed, { id: 'two' });
	expect(received).toEqual(['first', 'first', 'new']);
});

test('disposing during dispatch stops the remaining snapshot and all keys', () => {
	const events = new DomainEvents();
	const other = domainEventKey<{ id: string }>('navigator:changed');
	const received: string[] = [];
	events.on(changed, () => { received.push('first'); events.dispose(); });
	events.on(changed, () => { received.push('second'); });
	events.on(other, () => { received.push('other'); });
	events.emit(changed, { id: 'one' });
	events.emit(other, { id: 'two' });
	expect(received).toEqual(['first']);
});

test('late async failures are observed after disposal without exposing errors or payloads', async () => {
	const failures: string[] = [];
	const events = new DomainEvents(keyName => { failures.push(keyName); });
	let reject!: (reason: Error) => void;
	const pending = new Promise<void>((_resolve, rejectPromise) => { reject = rejectPromise; });
	events.on(changed, () => pending);
	events.emit(changed, { id: 'SECRET-ID' });
	events.dispose();
	reject(new Error('SECRET-ERROR'));
	await Promise.resolve();
	expect(failures).toEqual(['archives:changed']);
});

test('diagnostic failures cannot interrupt delivery or create unhandled rejections', async () => {
	for (const diagnostics of [() => { throw new Error('sink'); }, async () => { throw new Error('async-sink'); }]) {
		const events = new DomainEvents(diagnostics);
		const received: string[] = [];
		events.on(changed, () => { throw new Error('subscriber'); });
		events.on(changed, async () => { throw new Error('async-subscriber'); });
		events.on(changed, payload => { received.push(payload.id); });
		expect(() => events.emit(changed, { id: 'one' })).not.toThrow();
		await Promise.resolve();
		await Promise.resolve();
		expect(received).toEqual(['one']);
		events.dispose();
	}
});

test('keys enforce payload types for publishers and subscribers', () => {
	const events = new DomainEvents();
	// @ts-expect-error The owning domain requires a string ID.
	events.emit(changed, { id: 1 });
	// @ts-expect-error Unrelated payload types cannot be inferred as a union to bypass the key.
	events.on(changed, (_payload: { id: number }) => {});
	const other = domainEventKey<{ id: number }>('other:changed');
	// @ts-expect-error Keys retain their payload contract even when assigned to another key type.
	const incompatible: typeof changed = other;
	void incompatible;
	expect(changed.name).toBe('archives:changed');
});
