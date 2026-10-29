import { contributionPoint, serviceKey } from '../../app/contracts/module';
import type {
	AgentRuntimePort,
	AutomationAction,
	AutomationDefinition,
	AutomationUiPort,
	SourceRef,
	ScheduleSpec,
} from '../../shared/automation/types';
import type { AutomationPrefill } from './core/api';
import type { AgentDispatchRequest, AgentDispatchReceipt } from '../../shared/agent-dispatch';
import { AUTOMATION_DEFINITIONS_ROOT } from '../../shared/storage/vault-layout';

/**
 * A product that keeps automation definitions inside its own documents (board widgets and cards, archive
 * reminders). Contributed to `automations.sources` while the product is active.
 */
export interface AutomationSource {
	/** The source kinds this product owns. */
	readonly kinds: readonly SourceRef['kind'][];
	list(): Promise<AutomationDefinition[]>;
	canNotify?(definition: AutomationDefinition): Promise<boolean>;
	/** Write the definition back into its document, or remove it (`remove`). */
	save(definition: AutomationDefinition, remove?: boolean): Promise<void>;
	open(source: SourceRef, ownerWindow?: Window): Promise<void>;
	/** Boards only: documents a definition can be pinned to as a quick action. */
	readonly pinTargets?: () => string[];
	readonly pin?: (path: string, definition: AutomationDefinition) => Promise<void>;
}

/** Automations as other products see them: quick actions and opening the automation board. */
export interface AutomationsService extends AutomationUiPort {
	/** Set when definitions or run history could not be read. */
	readonly loadError: string;
	/** Runs that are pending or running. */
	activeRuns(): ReadonlyArray<{ id: string }>;
	subscribe(listener: () => void): () => void;
}

export const AUTOMATION_SOURCES = contributionPoint<AutomationSource>('automations', 'sources');
export const AUTOMATIONS = serviceKey<AutomationsService>('automations', 'ui');
/** Journal-backed deliveries; never activate an agent or choose another destination implicitly. */
export interface AutomationInvocations {
	invoke(request: AgentDispatchRequest, options?: { signal?: AbortSignal }): Promise<AgentDispatchReceipt>;
	receipt(invocationId: string): AgentDispatchReceipt | undefined;
}
export const AUTOMATION_INVOCATIONS = serviceKey<AutomationInvocations>('automations', 'invocations');
/** Agent and script execution; provided by the agent module (desktop only). */
export const AUTOMATION_AGENT_RUNTIME = serviceKey<AgentRuntimePort>('agent', 'automation-runtime');

/**
 * Opens the "New automation" dialog. This is the one way other modules (the dashboard's calendar and to-dos,
 * archives, the agent workspace) create an automation: the dialog fits its form to the action, saves the
 * definition and tells the caller what was saved.
 */
export interface AutomationComposer {
	open(request?: AutomationComposeRequest): Promise<AutomationDefinition | undefined>;
}
export interface AutomationComposeRequest {
	/** The kind of action whose form opens first (`notify` is the reminder); the user may switch. Default: `agent`. */
	action?: AutomationAction['kind'];
	/** Values the form starts with. */
	prefill?: AutomationPrefill;
	/**
	 * The document the definition is kept in (a board task, an archive record). Such a definition can only be
	 * a reminder, so the action cannot be switched.
	 */
	source?: SourceRef;
	/** The window the dialog opens in; defaults to the window of the most recent leaf. */
	ownerWindow?: Window;
}
export type { AutomationPrefill };
export const AUTOMATION_COMPOSER = serviceKey<AutomationComposer>('automations', 'composer');

/** Shared schedule engine for source-owned recurring tasks; no second cadence parser. */
export interface AutomationSchedule {
	next(schedule: ScheduleSpec, after: number): number | null;
	validate(schedule: ScheduleSpec): void;
	wallTime(stamp: string, timezone: string): number;
}
export const AUTOMATION_SCHEDULE = serviceKey<AutomationSchedule>('automations', 'schedule');

/** Recovery owners of this module: run history/invocations/results (one device file) and the Markdown definition documents. */
export const AUTOMATION_RUNTIME_OWNER = 'automations-runtime';
export const AUTOMATION_DEFINITIONS_OWNER = 'automations-definitions';
export function automationRuntimePath(deviceId: string): string {
	if (!/^[a-zA-Z0-9_-]+$/.test(deviceId)) throw new Error('huhu-storage.invalid-device');
	return `.huhu/automation/${deviceId}/runtime.json`;
}
/** Exactly `<definitions root>/<one folder>/操作.md`: the only file shape the definitions repository writes. */
export function isAutomationDefinitionPath(path: string): boolean {
	const prefix = `${AUTOMATION_DEFINITIONS_ROOT}/`;
	if (!path.startsWith(prefix)) return false;
	const parts = path.slice(prefix.length).split('/');
	return (
		parts.length === 2 && parts[0]!.length > 0 && parts[0] !== '.' && parts[0] !== '..' && parts[1] === '操作.md'
	);
}

/**
 * Whether a definition document would be read back by this module's own repository codec (frontmatter, action registry,
 * schedule, `isDefinition`): the reason when it would not, so a restore can refuse before writing it. Loaded lazily.
 */
export const checkAutomationDocument = async (path: string, text: string): Promise<string | undefined> =>
	(await import('./core/documents')).checkAutomationDocument(path, text);
