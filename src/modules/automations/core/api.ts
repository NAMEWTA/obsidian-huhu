import type { AutomationTemplate } from './templates';
import type { ActionKind } from './actions/definition';
import type {
	AgentRuntimePort,
	AutomationDefinition,
	AutomationRun,
	AutomationSourcePort,
	NoteLink,
	SourceRef,
} from '../../../shared/automation/types';

/** What a new automation starts out with; anything left out gets the usual default. */
export interface AutomationPrefill {
	/** The name; also the text of the action when `text` is not given. */
	name?: string;
	/** The main text of the action (the reminder message, the prompt, the script). */
	text?: string;
	/** When the automation runs once (milliseconds since the epoch). */
	at?: number;
	/** The note the automation comes from. */
	link?: NoteLink;
}

/** What the editor opens for: a new definition (optionally from a board or archive source) or an existing one. */
export interface AutomationEditRequest {
	/** The kind of action a new definition starts with. */
	action?: ActionKind;
	source?: SourceRef;
	prefill?: AutomationPrefill;
	existing?: AutomationDefinition;
	/** A template picked in the empty list; fills a new definition. */
	template?: AutomationTemplate;
}

/** Read and action surface shared by native hosts and any automation panel. */
export interface AutomationsApi {
	readonly executionEnabled: boolean;
	readonly deviceId: string;
	readonly loadError: string;
	readonly definitions: readonly AutomationDefinition[];
	readonly state: { readonly runs: readonly AutomationRun[]; readonly cursors: Readonly<Record<string, number>> };
	readonly sources: AutomationSourcePort;
	agent(): AgentRuntimePort | undefined;
	subscribe(listener: () => void): () => void;
	save(definition: AutomationDefinition): Promise<void>;
	remove(definition: AutomationDefinition): Promise<void>;
	clearHistory(): Promise<void>;
	tick(now?: number): Promise<void>;
	run(
		definition: AutomationDefinition,
		trigger?: 'manual' | 'scheduled',
		at?: number,
		now?: number,
	): Promise<AutomationRun | undefined>;
	stop(run: AutomationRun): Promise<void>;
	/** Repeat the same admitted calendar delivery with its original date, identity and destination. */
	retryRun?(run: AutomationRun): Promise<AutomationRun | undefined>;
	openRun?(run: AutomationRun): Promise<void>;
}
