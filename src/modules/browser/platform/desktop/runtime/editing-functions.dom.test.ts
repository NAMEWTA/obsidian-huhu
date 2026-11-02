// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { prepareFill, confirmTypingTarget } from './editing-functions';

// Run the exact fixed function shipped to Chromium, against a DOM fixture.
function prepare(element: HTMLElement, text: string): () => Record<string, unknown> {
	return (new Function(`return (${prepareFill})`)() as (this: HTMLElement, value: string) => () => Record<string, unknown>).call(element, text);
}
function typing(element: HTMLElement): boolean {
	return (new Function(`return (${confirmTypingTarget})`)() as (this: HTMLElement) => boolean).call(element);
}
function field(type = 'text', initial = 'before') {
	const element = document.createElement('input'); element.type = type; element.value = initial;
	document.body.append(element); element.focus(); return element;
}
afterEach(() => { document.body.replaceChildren(); });
it.each([
	['expected', 'matched', true], ['before', 'rejected', false], ['exp', 'truncated', false], ['EXPECTED', 'transformed', false],
] as const)('reports observed fill %s without returning input values', (actual, verification, ok) => {
	const element = field(), readback = prepare(element, 'expected'); element.value = actual;
	expect(readback()).toEqual({ ok, verification, sensitive: false });
});
it('keeps password values only in the page closure, including transformed results', () => {
	const element = field('password', 'SYNTHETIC_OLD_SECRET'), readback = prepare(element, 'SYNTHETIC_NEW_SECRET');
	element.value = 'SYNTHETIC_NEW_SECRET'; expect(readback()).toEqual({ ok: true, verification: 'matched', sensitive: true });
	element.value = 'SYNTHETIC_FORMATTED_SECRET'; expect(readback()).toEqual({ ok: false, verification: 'transformed', sensitive: true });
	expect(JSON.stringify(readback())).not.toContain('SECRET');
});
it('rejects focus redirection, detached, readonly, disabled and non-text targets before insertion', () => {
	const element = field(); field(); expect(() => prepare(element, 'text')).toThrow(); expect(typing(element)).toBe(false);
	element.focus(); element.readOnly = true; expect(() => prepare(element, 'text')).toThrow(); expect(typing(element)).toBe(false);
	element.readOnly = false; element.disabled = true; expect(() => prepare(element, 'text')).toThrow();
	element.disabled = false; element.remove(); expect(() => prepare(element, 'text')).toThrow();
	const checkbox = field('checkbox'); expect(() => prepare(checkbox, 'text')).toThrow(); expect(typing(checkbox)).toBe(false);
});
it('does not claim success after the original element is replaced', () => {
	const element = field(), readback = prepare(element, 'expected'); element.replaceWith(document.createElement('input'));
	expect(readback()).toEqual({ ok: false, verification: 'unverified', sensitive: false });
});
it('supports native textarea selection and confirms the actual typing target', () => {
	const element = document.createElement('textarea'); element.value = 'before'; document.body.append(element); element.focus();
	expect(typing(element)).toBe(true); const readback = prepare(element, '中😀\nline'); element.value = '中😀\nline';
	expect(readback()).toEqual({ ok: true, verification: 'matched', sensitive: false });
});
