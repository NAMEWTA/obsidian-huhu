import { expect, test } from 'vitest';
import { captureForegroundIntent } from './foreground-intent';

test('owned modal focus can return to its anchor while a new external focus revokes foreground permission', () => {
	const container = document.createElement('div'),
		anchor = document.createElement('button'),
		other = document.createElement('input'),
		modal = document.createElement('div'),
		confirm = document.createElement('button');
	modal.append(confirm);
	container.append(anchor, modal, other);
	document.body.append(container);
	anchor.focus();
	const changes = new Set<() => void>();
	const intent = captureForegroundIntent({
		document,
		window,
		isCurrent: () => true,
		onTargetChange: (listener) => {
			changes.add(listener);
			return () => {
				changes.delete(listener);
			};
		},
	});
	try {
		const release = intent.allowWithin!(modal);
		confirm.focus();
		confirm.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		expect(intent.valid()).toBe(true);
		release();
		anchor.focus();
		expect(intent.valid()).toBe(true);
		other.focus();
		expect(intent.valid()).toBe(false);
	} finally {
		intent.dispose();
		container.remove();
	}
	expect(changes.size).toBe(0);
});

test('active leaf or window changes invalidate an intent even when the original Tab ID is unchanged', () => {
	let change!: () => void;
	const intent = captureForegroundIntent({
		document,
		window,
		isCurrent: () => true,
		onTargetChange: (listener) => {
			change = listener;
			return () => {};
		},
	});
	try {
		change();
		expect(intent.valid()).toBe(false);
	} finally {
		intent.dispose();
	}
	const next = captureForegroundIntent({ document, window, isCurrent: () => true, onTargetChange: () => () => {} });
	try {
		window.dispatchEvent(new Event('blur'));
		expect(next.valid()).toBe(false);
	} finally {
		next.dispose();
	}
});

test('commit is one synchronous focus in the original leaf, while legacy dispose keeps valid semantics', () => {
	const leaf = document.createElement('section'),
		anchor = document.createElement('button'),
		input = document.createElement('textarea');
	leaf.append(anchor, input);
	document.body.append(leaf);
	anchor.focus();
	const intent = captureForegroundIntent({
		document,
		window,
		container: leaf,
		isCurrent: () => true,
		onTargetChange: () => () => {},
	});
	try {
		expect(intent.commitFocus!(input, () => input.focus())).toBe(true);
		expect(document.activeElement).toBe(input);
		expect(intent.valid()).toBe(true);
		expect(
			intent.commitFocus!(input, () => {
				throw new Error('must not replay');
			}),
		).toBe(false);
	} finally {
		intent.dispose();
		leaf.remove();
	}
	const disposed = captureForegroundIntent({
		document,
		window,
		container: document.body,
		isCurrent: () => true,
		onTargetChange: () => () => {},
	});
	disposed.dispose();
	expect(disposed.valid()).toBe(true);
	expect(disposed.commitFocus!(document.body, () => {})).toBe(false);
});

test.each([
	'pointer',
	'key',
	'focus',
	'blur',
	'leaf',
	'different-container',
	'missing-container',
	'disconnected',
] as const)('commit rejects %s without running the focus callback', (reason) => {
	const leaf = document.createElement('section'),
		other = document.createElement('section'),
		anchor = document.createElement('button'),
		input = document.createElement('textarea'),
		external = document.createElement('input');
	leaf.append(anchor, input);
	other.append(external);
	document.body.append(leaf, other);
	anchor.focus();
	let change = () => {};
	const intent = captureForegroundIntent({
		document,
		window,
		container: reason === 'missing-container' ? undefined : leaf,
		isCurrent: () => true,
		onTargetChange: (listener) => {
			change = listener;
			return () => {};
		},
	});
	let calls = 0;
	try {
		if (reason === 'pointer') anchor.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		if (reason === 'key') anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
		if (reason === 'focus') external.focus();
		if (reason === 'blur') window.dispatchEvent(new Event('blur'));
		if (reason === 'leaf') change();
		if (reason === 'disconnected') input.remove();
		expect(
			intent.commitFocus!(reason === 'different-container' ? external : input, () => {
				calls++;
			}),
		).toBe(false);
		expect(calls).toBe(0);
	} finally {
		intent.dispose();
		leaf.remove();
		other.remove();
	}
});
