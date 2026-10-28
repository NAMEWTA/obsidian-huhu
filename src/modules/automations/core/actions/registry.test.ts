import { beforeEach, expect, test } from 'vitest';
import { setLanguage, t } from '../../../../shared/i18n';
import type { AutomationAction } from '../../../../shared/automation/types';
import { actionAvailability, actionDefinition, actionDefinitions, actionText, decodeAction, encodeAction, switchAutomationAction } from './registry';

beforeEach(() => setLanguage('en'));
const defaults = { agentId: 'codex', cwd: '/vault', text: 'Hello' };
const samples: AutomationAction[] = actionDefinitions.map((definition) =>
	definition.create({ ...defaults, text: definition.kind === 'open-url' ? 'https://example.com' : 'Hello' }),
);

test('every kind has one definition, in the order pickers list them', () => {
	expect(actionDefinitions.map((definition) => definition.kind)).toEqual([
		'agent', 'script', 'notify', 'create-task', 'open-file', 'open-url', 'obsidian-command',
	]);
	expect(new Set(actionDefinitions.map((definition) => definition.nameKey)).size).toBe(7);
	expect(actionDefinition('browser-workflow')).toBeUndefined();
});
test('each definition round-trips through its document form and keeps its text in the section', () => {
	for (const action of samples) {
		const stored = encodeAction(action);
		expect(stored.properties).not.toHaveProperty('kind');
		expect(decodeAction(action.kind, stored.properties, { [stored.section]: stored.text })).toEqual(action);
	}
	expect(encodeAction(samples[1]!).section).toBe('script');
	expect(encodeAction(samples[2]!)).toMatchObject({ section: 'prompt', text: 'Hello', properties: {} });
});
test('empty content is refused by every action with a message of its own', () => {
	for (const definition of actionDefinitions) {
		const empty = switchAutomationAction(samples[2]!, definition.kind, { agentId: 'codex', cwd: '/vault' });
		definition.setText(empty as never, '');
		expect(definition.contentError(empty as never), definition.kind).toBeTruthy();
	}
});
test('calendar and legacy card destinations round-trip independently with optional task and reminder times', () => {
	const actions: AutomationAction[] = [
		{ kind: 'create-task', path: 'Board.md', cardId: 'card', text: 'Legacy' },
		{ kind: 'create-task', target: 'board-card', path: 'Board.md', cardId: 'card', text: 'Explicit' },
		{ kind: 'create-task', target: 'calendar', path: 'Board.md', text: 'Calendar', time: '10:30', reminderTime: '09:45' },
		{ kind: 'create-task', target: 'calendar', path: 'Board.md', text: 'All day' },
	];
	for (const action of actions) {
		const encoded = encodeAction(action);
		expect(decodeAction(action.kind, encoded.properties, { [encoded.section]: encoded.text })).toEqual(action);
	}
});
test('switching keeps the text; scheduling and desktop rules come from the definition', () => {
	const switched = switchAutomationAction({ kind: 'notify', body: 'Water' }, 'agent', { agentId: 'codex', cwd: '/vault' });
	expect(switched).toMatchObject({ kind: 'agent', prompt: 'Water', agentId: 'codex', sessionMode: 'fresh' });
	expect(actionText(switched)).toBe('Water');
	expect(actionAvailability('open-file', 'scheduled', true)).toBe('automation.manualOnly');
	expect(actionAvailability('agent', 'scheduled', false)).toBe('automation.desktopOnly');
	expect(actionAvailability('notify', 'scheduled', false)).toBeUndefined();
	expect(actionDefinitions.filter((definition) => definition.sourceBound).map((definition) => definition.kind)).toEqual(['notify']);
});
test('agent checks: directory inside the vault, an available agent, no extra arguments on a reused session', () => {
	const agent = actionDefinition('agent')!;
	const action = { ...(agent.create(defaults) as Extract<AutomationAction, { kind: 'agent' }>), spaceId: 'space-a' };
	const check = { cwd: '/vault', agents: [{ id: 'codex', title: 'Codex', enabled: true }], channels: ['in-app' as const] };
	expect(agent.settingsError?.(action, check)).toBeUndefined();
	const { spaceId: _unbound, ...unbound } = action;
	expect(agent.settingsError?.(unbound, check)).toBe(t('automation.spaceRequired'));
	expect(agent.settingsError?.({ ...action, cwd: '/elsewhere' }, check)).toBeTruthy();
	expect(agent.settingsError?.({ ...action, agentId: 'other' }, check)).toBeTruthy();
	expect(agent.settingsError?.({ ...action, sessionMode: 'reuse', extraArgs: '--model opus' }, check)).toBeTruthy();
});
