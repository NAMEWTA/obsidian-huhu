import type {
	AgentDescription,
	AgentRunHandle,
	AgentRuntimePort,
	AutomationAction,
	AutomationActionHandle,
	AutomationRun,
	AutomationMessage,
	AutomationTaskDelivery,
	AutomationSourcePort,
	NotificationChannelId,
} from '../../../../shared/automation/types';

/** The id of an action (`AutomationAction['kind']`); it is also what the definition document stores as `action`. */
export type ActionKind = AutomationAction['kind'];
export type ActionOf<K extends ActionKind> = AutomationAction & { kind: K };

/** What a fresh action starts from; `text` is carried over when the user switches from another action. */
export interface ActionDefaults {
	agentId: string;
	cwd: string;
	text: string;
}

/** What the checks of a draft can see besides the action itself. */
export interface ActionCheck {
	/** The vault folder on disk; working directories must stay inside it. */
	cwd: string;
	agents: readonly AgentDescription[];
	channels: readonly NotificationChannelId[];
}

/** How an action is stored in the definition document: frontmatter properties plus one text section. */
export interface ActionDocument<K extends ActionKind> {
	/** The comment-delimited section of the document that holds the action's text. */
	readonly section: 'prompt' | 'script';
	/** The action's fields as frontmatter properties (the text field travels in the section instead). */
	encode(this: void, action: ActionOf<K>): Record<string, unknown>;
	/** Rebuild the action from the properties and the section text. */
	decode(this: void, properties: Readonly<Record<string, unknown>>, text: string): ActionOf<K>;
}

/** The effects an in-process action can have on the host (Obsidian); the module runtime provides them. */
export interface ActionHost {
	/** Open a note in an editor tab; rejects with `sourceMissing` when it no longer exists. */
	openFile(this: void, path: string): Promise<void>;
	/** Open an address in the built-in browser (the system browser while that module is off). */
	openUrl(this: void, url: string): Promise<void>;
	/** Invoke an Obsidian command and say so; rejects when the command does not exist. */
	runCommand(this: void, id: string): string;
}

export interface ActionResult extends AutomationMessage {
	/** An action that keeps running after it started hands back the means to follow and stop it. */
	handle?: AutomationActionHandle;
}

/** Everything an in-process action may use while it runs. */
export interface DirectContext {
	run: AutomationRun;
	desktop: boolean;
	signal: AbortSignal;
	sources: AutomationSourcePort;
	host: ActionHost;
	checkpointTask(this: void, delivery: AutomationTaskDelivery): Promise<void>;
}

/** Everything a terminal action may use when it starts. */
export interface TerminalContext {
	run: AutomationRun;
	/** The latest earlier run of the same automation that had a terminal (session reuse). */
	previous?: AutomationRun;
	agent: AgentRuntimePort;
	now: number;
	vaultName: string;
	/** The run was started by a delivery request, whose prompt is already final. */
	invocation: boolean;
}

/**
 * How an action is carried out. `terminal` actions start a process in an agent terminal that the service owns
 * until it ends; `direct` actions finish (or hand back a handle) in the plugin process.
 */
export type ActionRunner<K extends ActionKind> =
	| { readonly mode: 'direct'; execute(this: void, action: ActionOf<K>, context: DirectContext): Promise<ActionResult> }
	| {
			readonly mode: 'terminal';
			start(this: void, action: ActionOf<K>, context: TerminalContext): Promise<AgentRunHandle | undefined>;
	  };

/**
 * One kind of automation action (strategy). The editor, the lists, the run service and the document codec all
 * go through the registry (`registry.ts`) instead of branching on the kind. The form the user fills in lives in
 * the matching `ui/actions/<kind>.tsx` view.
 */
export interface ActionDefinition<K extends ActionKind = ActionKind> {
	readonly kind: K;
	/** Translation key of the name shown in pickers, lists and details. */
	readonly nameKey: string;
	/** Whether the action may run on a schedule; `false` actions only run by hand. */
	readonly scheduled: boolean;
	/** Whether the action needs the desktop app. */
	readonly desktop: boolean;
	/** Whether a definition stored inside a source document (a board task, an archive) may use the action. */
	readonly sourceBound: boolean;
	/** A fresh action of this kind. */
	create(this: void, defaults: ActionDefaults): ActionOf<K>;
	/** The main text of the action (prompt, script, message, path, address, command). */
	text(this: void, action: ActionOf<K>): string;
	setText(this: void, action: ActionOf<K>, value: string): void;
	readonly document: ActionDocument<K>;
	/** Why the main content is not acceptable yet; shown beside the content field. */
	contentError(this: void, action: ActionOf<K>): string | undefined;
	/** Why the rest of the action is not acceptable yet; shown in the footer. */
	settingsError?(this: void, action: ActionOf<K>, check: ActionCheck): string | undefined;
	/** The action in the form that is stored (a bare host name becomes an https address). */
	normalize?(this: void, action: ActionOf<K>): ActionOf<K>;
	/** The execution boundary: throws when the action must not be saved or started. */
	verify?(this: void, action: ActionOf<K>): void;
	/** A message that replaces the generic outcome when a run of the action succeeds (reminders show their text). */
	notice?(this: void, action: ActionOf<K>): string | undefined;
	readonly run: ActionRunner<K>;
}
