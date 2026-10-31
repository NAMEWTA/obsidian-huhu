import { SafeError } from '../core/model';

const GROUPS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*+-=?'];
const ALPHABET = GROUPS.join('');

/** Uniform rejection sampling, including composition: no modulo bias or predictable fallback. */
export function generatePassword(): string {
	if (typeof crypto === 'undefined' || !crypto.getRandomValues) throw new SafeError('crypto-unavailable');
	const limit = 256 - 256 % ALPHABET.length;
	for (;;) {
		let value = '';
		while (value.length < 12) {
			const bytes = crypto.getRandomValues(new Uint8Array(24));
			for (const byte of bytes) {
				if (byte < limit) value += ALPHABET[byte % ALPHABET.length];
				if (value.length === 12) break;
			}
			bytes.fill(0);
		}
		if (GROUPS.every(group => [...value].some(character => group.includes(character)))) return value;
	}
}
