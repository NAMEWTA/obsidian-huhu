import type { ActionKind } from '../../core/actions/definition';
import { actionDefinition } from '../../core/actions/registry';
import { t as translate } from '../../../../shared/i18n';
import { agentView } from './agent';
import { createTaskView } from './create-task';
import { notifyView } from './notify';
import { obsidianCommandView } from './obsidian-command';
import { openFileView } from './open-file';
import { openUrlView } from './open-url';
import { scriptView } from './script';
import type { ActionView } from './types';

/**
 * The forms of every kind of action. This is the counterpart of `core/actions/registry.ts`: a kind needs an
 * entry in both, and the type check fails while either is missing.
 */
const registered = {
	agent: agentView,
	script: scriptView,
	notify: notifyView,
	'create-task': createTaskView,
	'open-file': openFileView,
	'open-url': openUrlView,
	'obsidian-command': obsidianCommandView,
} satisfies { [K in ActionKind]: ActionView<K> };

export const actionViews: readonly ActionView[] = Object.values(registered);

/** The view of a kind. A definition always has one; the registries are checked for it. */
export function actionView(kind: ActionKind): ActionView {
	const view = actionViews.find((item) => item.kind === kind);
	if (!view) throw new Error(`No view for automation action: ${kind}`);
	return view;
}

/** The translated name of a kind of action, as pickers and lists show it. */
export function actionName(kind: ActionKind): string {
	const definition = actionDefinition(kind);
	return translate(definition?.nameKey ?? 'automation.removedAction');
}
