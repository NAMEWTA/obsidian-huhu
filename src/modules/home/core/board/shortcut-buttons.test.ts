import { expect, test } from 'vitest';
import { hotkeyKeys, readShortcutButtons, shortcutRunnable } from './shortcut-buttons';

test('a button needs a target, or an agent and a prompt', () => {
	expect(shortcutRunnable({ id: 'a', label: '', icon: 'x', type: 'file', target: 'n.md' })).toBe(true);
	expect(shortcutRunnable({ id: 'a', label: '', icon: 'x', type: 'command', target: ' ' })).toBe(false);
	expect(shortcutRunnable({ id: 'a', label: '', icon: 'x', type: 'agent', target: '', agentId: 'codex', prompt: 'go' })).toBe(true);
	expect(shortcutRunnable({ id: 'a', label: '', icon: 'x', type: 'agent', target: '', agentId: 'codex', prompt: '' })).toBe(false);
});

test('stored buttons keep their order and lose malformed entries', () => {
	expect(readShortcutButtons(undefined)).toEqual([]);
	expect(readShortcutButtons([{ id: 'a', type: 'command', target: 'x', label: 1 }])).toEqual([
		{ id: 'a', label: '', icon: 'zap', type: 'command', target: 'x' },
	]);
});

test('hotkeys list modifiers in a fixed order and capitalize a letter key', () => {
	expect(hotkeyKeys({ modifiers: ['Shift', 'Mod'], key: 'p' })).toEqual(['Mod', 'Shift', 'P']);
	expect(hotkeyKeys({ modifiers: [], key: 'F5' })).toEqual(['F5']);
});
