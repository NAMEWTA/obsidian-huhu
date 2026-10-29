import { expect, test } from 'vitest';
import { encodeKey, encodeNamedKeys, type KeyDescription } from './keyboard';

const legacy = { kitty: 0, win32: false, applicationCursorKeys: false };

test('finite named keys preserve control, newline and navigation encodings in one block', () => {
	expect(
		encodeNamedKeys('Ctrl+C Enter Shift+Enter Tab Shift+Tab Backspace Escape ArrowUp Home Delete F1 F12', legacy),
	).toBe('\x03\r\x1b\r\t\x1b[Z\x7f\x1b\x1b[A\x1b[H\x1b[3~\x1bOP\x1b[24~');
	expect(encodeNamedKeys('a Shift+a Alt+x Ctrl+Space', legacy)).toBe('aA\x1bx\x00');
});

test('named keys follow the original kitty, win32 and application cursor modes', () => {
	expect(encodeNamedKeys('Shift+Enter Ctrl+C Escape', { ...legacy, kitty: 1 })).toBe('\x1b[13;2u\x1b[99;5u\x1b[27u');
	expect(encodeNamedKeys('Ctrl+C', { ...legacy, kitty: 1, win32: true })).toBe(
		'\x1b[67;46;3;1;8;1_\x1b[67;46;3;0;8;1_',
	);
	expect(encodeNamedKeys('ArrowUp Home Shift+ArrowLeft', { ...legacy, applicationCursorKeys: true })).toBe(
		'\x1bOA\x1bOH\x1b[1;2D',
	);
});

test('letter casing and explicit modifiers mean the same key in all three modes', () => {
	expect(encodeNamedKeys('A Alt+A Alt+Shift+a', legacy)).toBe('A\x1ba\x1bA');
	expect(encodeNamedKeys('A Alt+A Alt+Shift+a', { ...legacy, kitty: 1 })).toBe('A\x1b[97;3u\x1b[97;4u');
	expect(encodeNamedKeys('A', { ...legacy, win32: true })).toBe('\x1b[65;30;65;1;16;1_\x1b[65;30;65;0;16;1_');
	expect(encodeNamedKeys('Shift+Backspace', { ...legacy, kitty: 1 })).toBe('\x1b[127;2u');
	expect(encodeNamedKeys('Shift+Backspace', { ...legacy, win32: true })).toBe(
		'\x1b[8;14;8;1;16;1_\x1b[8;14;8;0;16;1_',
	);
});

test.each([
	'Shift+Backspace',
	'Alt+Shift+Backspace',
	'Ctrl+Shift+c',
	'Ctrl+Shift+Space',
	'Shift+Space',
	'Alt+Shift+Space',
])('legacy combinations without a distinct encoding reject the whole operation: %s', (key) => {
	expect(() => encodeNamedKeys(`Enter ${key}`, legacy)).toThrowError('INVALID_ARGUMENT');
});

test.each([
	['Enter', '\r', '\x1b[13;28;13;1;0;1_\x1b[13;28;13;0;0;1_'],
	['Tab', '\t', '\x1b[9;15;9;1;0;1_\x1b[9;15;9;0;0;1_'],
	['Backspace', '\x7f', '\x1b[8;14;8;1;0;1_\x1b[8;14;8;0;0;1_'],
	['Escape', '\x1b', '\x1b[27;1;27;1;0;1_\x1b[27;1;27;0;0;1_'],
	['Space', ' ', '\x1b[32;57;32;1;0;1_\x1b[32;57;32;0;0;1_'],
	['ArrowUp', '\x1b[A', '\x1b[38;72;0;1;256;1_\x1b[38;72;0;0;256;1_'],
	['ArrowDown', '\x1b[B', '\x1b[40;80;0;1;256;1_\x1b[40;80;0;0;256;1_'],
	['ArrowLeft', '\x1b[D', '\x1b[37;75;0;1;256;1_\x1b[37;75;0;0;256;1_'],
	['ArrowRight', '\x1b[C', '\x1b[39;77;0;1;256;1_\x1b[39;77;0;0;256;1_'],
	['Home', '\x1b[H', '\x1b[36;71;0;1;256;1_\x1b[36;71;0;0;256;1_'],
	['End', '\x1b[F', '\x1b[35;79;0;1;256;1_\x1b[35;79;0;0;256;1_'],
	['Insert', '\x1b[2~', '\x1b[45;82;0;1;256;1_\x1b[45;82;0;0;256;1_'],
	['Delete', '\x1b[3~', '\x1b[46;83;0;1;256;1_\x1b[46;83;0;0;256;1_'],
	['PageUp', '\x1b[5~', '\x1b[33;73;0;1;256;1_\x1b[33;73;0;0;256;1_'],
	['PageDown', '\x1b[6~', '\x1b[34;81;0;1;256;1_\x1b[34;81;0;0;256;1_'],
	['F1', '\x1bOP', '\x1b[112;59;0;1;0;1_\x1b[112;59;0;0;0;1_'],
	['F2', '\x1bOQ', '\x1b[113;60;0;1;0;1_\x1b[113;60;0;0;0;1_'],
	['F3', '\x1bOR', '\x1b[114;61;0;1;0;1_\x1b[114;61;0;0;0;1_'],
	['F4', '\x1bOS', '\x1b[115;62;0;1;0;1_\x1b[115;62;0;0;0;1_'],
	['F5', '\x1b[15~', '\x1b[116;63;0;1;0;1_\x1b[116;63;0;0;0;1_'],
	['F6', '\x1b[17~', '\x1b[117;64;0;1;0;1_\x1b[117;64;0;0;0;1_'],
	['F7', '\x1b[18~', '\x1b[118;65;0;1;0;1_\x1b[118;65;0;0;0;1_'],
	['F8', '\x1b[19~', '\x1b[119;66;0;1;0;1_\x1b[119;66;0;0;0;1_'],
	['F9', '\x1b[20~', '\x1b[120;67;0;1;0;1_\x1b[120;67;0;0;0;1_'],
	['F10', '\x1b[21~', '\x1b[121;68;0;1;0;1_\x1b[121;68;0;0;0;1_'],
	['F11', '\x1b[23~', '\x1b[122;87;0;1;0;1_\x1b[122;87;0;0;0;1_'],
	['F12', '\x1b[24~', '\x1b[123;88;0;1;0;1_\x1b[123;88;0;0;0;1_'],
])('each named key has a complete press encoding in every mode: %s', (key, ordinary, win32) => {
	expect(encodeNamedKeys(key!, legacy)).toBe(ordinary);
	expect(encodeNamedKeys(key!, { ...legacy, kitty: 1 })).toBe(key === 'Escape' ? '\x1b[27u' : ordinary);
	expect(encodeNamedKeys(key!, { ...legacy, kitty: 1, win32: true })).toBe(win32);
});

test.each([
	'',
	' ',
	'Enter\nEnter',
	'Ctrl++C',
	'Ctrl+Ctrl+C',
	'Hyper+C',
	'Meta+C',
	'Process',
	'Dead',
	'F13',
	'Ctrl+Tab',
	'Ctrl+Enter',
	'中',
	'\x1b[31m',
	'x'.repeat(4097),
	Array(257).fill('Enter').join(' '),
])('unknown, malformed or unrepresentable key syntax is rejected: %s', (keys) => {
	expect(() => encodeNamedKeys(keys, legacy)).toThrowError('INVALID_ARGUMENT');
});

test('the DOM key encoder never turns IME composition or legacy keyCode 229 into Enter', () => {
	const enter: KeyDescription = {
		type: 'keydown',
		key: 'Enter',
		code: 'Enter',
		ctrl: false,
		alt: false,
		shift: true,
		meta: false,
	};
	for (const modes of [
		{ kitty: 0, win32: false },
		{ kitty: 1, win32: false },
		{ kitty: 1, win32: true },
	]) {
		expect(encodeKey(enter, modes, true)).toBeUndefined();
		expect(encodeKey({ ...enter, keyCode: 229 }, modes, false)).toBeUndefined();
		for (const key of ['Process', 'Dead', 'Unidentified'])
			expect(encodeKey({ ...enter, key }, modes, false)).toBeUndefined();
	}
});
