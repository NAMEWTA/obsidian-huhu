import { afterEach, expect, test, vi } from 'vitest';
import { generatePassword } from './password';

afterEach(() => vi.unstubAllGlobals());

test('generated passwords contain 12 characters and all four classes, using real WebCrypto randomness', () => {
	const values = Array.from({ length: 256 }, () => generatePassword());
	for (const value of values) {
		expect(value).toHaveLength(12);
		expect(value).toMatch(/[A-Z]/);
		expect(value).toMatch(/[a-z]/);
		expect(value).toMatch(/[2-9]/);
		expect(value).toMatch(/[!@#$%&*+\-=?]/);
	}
	expect(new Set(values).size).toBe(values.length);
});

test('random generation fails closed without WebCrypto rather than falling back to Math.random', () => {
	vi.stubGlobal('crypto', undefined);
	expect(() => generatePassword()).toThrow('crypto-unavailable');
});

test('bytes outside the unbiased range are rejected, and composition is checked before returning', () => {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+-=?';
	const valid = [...'Aa2!Bb3@Cc4#'].map(character => alphabet.indexOf(character));
	let calls = 0;
	vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => {
		calls++;
		bytes.fill(255);
		if (calls === 2) bytes.fill(0); // a full single-class candidate is rejected
		if (calls > 2) bytes.set(valid);
		return bytes;
	} });
	expect(generatePassword()).toBe('Aa2!Bb3@Cc4#');
	expect(calls).toBe(3);
});
