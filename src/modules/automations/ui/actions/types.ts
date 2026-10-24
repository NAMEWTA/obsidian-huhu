import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AutomationDefinition } from '../../../../shared/automation/types';
import type { ActionKind, ActionOf } from '../../core/actions/definition';
import type { AutomationViewHost } from '../panel-contract';

/** What an action's forms receive. */
export interface ActionFormProps<K extends ActionKind> {
	/** The action being edited (the same object as `draft.action`). */
	action: ActionOf<K>;
	draft: AutomationDefinition;
	/** Change the action; the draft is copied first. */
	update(this: void, change: (action: ActionOf<K>) => void): void;
	/** Change anything else in the draft (schedule, channels, name). */
	onChange(this: void, change: (draft: AutomationDefinition) => void): void;
	host: AutomationViewHost;
	/** Whether the content field may show its error (it was visited or a save was tried). */
	showErrors: boolean;
	onTouch(this: void): void;
}

/**
 * What the user sees of one kind of action (the counterpart of `ActionDefinition`, which holds the behaviour).
 * The editor and the composer dialog render `Content` and `Options` of the view that matches the action, so a
 * new kind of action brings its own form without touching them.
 */
export interface ActionView<K extends ActionKind = ActionKind> {
	readonly kind: K;
	readonly Icon: LucideIcon;
	/** Whether the pre-run check command applies (it runs in the terminal's working directory). */
	readonly precheck?: boolean;
	/** The main form: what the action does. */
	Content(this: void, props: ActionFormProps<K>): ReactNode;
	/** Execution options shown beside the action picker (agent, directory, shell, session). */
	Options?(this: void, props: ActionFormProps<K>): ReactNode;
	/** Extra rows of the detail page; each is a labelled value. */
	facts?(this: void, action: ActionOf<K>): ReadonlyArray<{ label: string; value: string }>;
	/** A short line under the name in lists (the directory an action runs in). */
	hint?(this: void, action: ActionOf<K>): string | undefined;
	/** A small mark in the list row, beside the action (the agent that is started). */
	badge?(this: void, action: ActionOf<K>): { icon: ReactNode; label: string } | undefined;
	/** A check that needs the host (a board that may have disappeared); throws with a message to show. */
	beforeSave?(this: void, action: ActionOf<K>, host: AutomationViewHost): Promise<void>;
}
