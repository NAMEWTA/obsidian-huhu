import type { AutomationAction } from '../../../../shared/automation/types';
import { agentAction } from './agent';
import { createTaskAction } from './create-task';
import { notifyAction } from './notify';
import { obsidianCommandAction } from './obsidian-command';
import { openFileAction } from './open-file';
import { openUrlAction } from './open-url';
import { scriptAction } from './script';
import type { ActionDefaults, ActionDefinition, ActionKind } from './definition';

/**
 * Every kind of automation action, in the order pickers list them. Adding an action is one definition file plus
 * one line here (the type check fails while a kind of `AutomationAction` has no entry); the form lives in
 * `ui/actions/registry.ts`.
 */
const registered = {
	agent: agentAction,
	script: scriptAction,
	notify: notifyAction,
	'create-task': createTaskAction,
	'open-file': openFileAction,
	'open-url': openUrlAction,
	'obsidian-command': obsidianCommandAction,
} satisfies { [K in ActionKind]: ActionDefinition<K> };

export const actionDefinitions: readonly ActionDefinition[] = Object.values(registered);

/** The definition of a kind, or undefined for a kind this version does not know. */
export function actionDefinition(kind: string): ActionDefinition | undefined {
	return actionDefinitions.find((definition) => definition.kind === kind);
}
function required(kind: ActionKind): ActionDefinition {
	const definition = actionDefinition(kind);
	if (!definition) throw new Error(`Unknown automation action: ${kind}`);
	return definition;
}

/** The translation key explaining why `kind` cannot run for `trigger` here, or undefined when it can. */
export function actionAvailability(
	kind: ActionKind,
	trigger: 'manual' | 'scheduled',
	desktop: boolean,
): string | undefined {
	const definition = actionDefinition(kind);
	if (!definition) return 'automation.invalid';
	if (trigger === 'scheduled' && !definition.scheduled) return 'automation.manualOnly';
	if (definition.desktop && !desktop) return 'automation.desktopOnly';
	return undefined;
}

export const actionText = (action: AutomationAction): string => required(action.kind).text(action);
export const setActionText = (action: AutomationAction, value: string): void =>
	required(action.kind).setText(action, value);

/** The same automation with another kind of action; the text carries over, the rest starts from defaults. */
export function switchAutomationAction(
	current: AutomationAction,
	kind: ActionKind,
	defaults: Omit<ActionDefaults, 'text'>,
): AutomationAction {
	if (kind === current.kind) return current;
	return required(kind).create({ ...defaults, text: actionText(current) });
}

/** The properties and text section the action is stored as in the definition document. */
export function encodeAction(action: AutomationAction): {
	properties: Record<string, unknown>;
	section: 'prompt' | 'script';
	text: string;
} {
	const definition = required(action.kind);
	return { properties: definition.document.encode(action), section: definition.document.section, text: definition.text(action) };
}
export function decodeAction(
	kind: ActionKind,
	properties: Readonly<Record<string, unknown>>,
	sections: Readonly<Record<string, string>> | undefined,
): AutomationAction {
	const { document } = required(kind);
	return document.decode(properties, sections?.[document.section] ?? '');
}
