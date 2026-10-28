import { readMarkdownDocument, readYaml } from '../../../../shared/storage/markdown-document';
import { AUTOMATION_DEFINITIONS_ROOT, huhuName } from '../../../../shared/storage/vault-layout';

/**
 * Pure content transforms for restore. Each one takes the exact source text and returns the exact text to write,
 * or throws `InvalidSection`; none of them reads or writes a file and none can start, schedule or notify anything.
 */
export class InvalidSection extends Error {
	constructor(
		readonly reason: string,
		readonly detail: Readonly<Record<string, unknown>> = {},
	) {
		super(reason);
		this.name = 'InvalidSection';
	}
}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value);
function parseObject(text: string, reason: string): Json {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new InvalidSection(`${reason}:not-json`);
	}
	if (!isObject(value)) throw new InvalidSection(`${reason}:not-object`);
	return value;
}

/** Walks the document and replaces every `deviceId` property equal to `from`. Returns how many were changed. */
export function rewriteDeviceId(value: unknown, from: string, to: string): number {
	if (from === to) return 0;
	let changed = 0;
	const visit = (node: unknown): void => {
		if (Array.isArray(node)) node.forEach(visit);
		else if (isObject(node)) {
			for (const [key, child] of Object.entries(node)) {
				if (key === 'deviceId' && child === from) {
					node[key] = to;
					changed++;
				} else visit(child);
			}
		}
	};
	visit(value);
	return changed;
}

export interface RestoredRuntime {
	readonly text: string;
	readonly runs: number;
	/** Runs that were pending/running/unknown in the source and are shown as interrupted history now. */
	readonly demoted: number;
}
const ACTIVE = new Set(['pending', 'running', 'unknown']);

/**
 * Automation run history for a restore: exact result data is kept (output, usage, timeline, taskDelivery, session
 * and source references, invocation request/receipt, retryOf), but nothing keeps its liveness. Active statuses become
 * `interrupted` (the original status is recorded in `restored.from`), and every run whose notification was not
 * attempted is marked so a restart can never publish it. Runs are never trimmed here.
 */
export function restoreAutomationRuntime(
	text: string,
	options: { readonly fromDevice: string; readonly toDevice: string; readonly at: number },
): RestoredRuntime {
	const state = parseObject(text, 'runtime');
	if (!Array.isArray(state.definitions) || !Array.isArray(state.runs) || !isObject(state.cursors))
		throw new InvalidSection('runtime:shape');
	if (!state.runs.every((run) => isObject(run) && typeof run.id === 'string' && typeof run.status === 'string'))
		throw new InvalidSection('runtime:run-shape');
	const ids = new Set<string>();
	for (const run of state.runs as Json[]) {
		if (ids.has(run.id as string)) throw new InvalidSection('runtime:duplicate-run', { id: String(run.id) });
		ids.add(run.id as string);
	}
	rewriteDeviceId(state, options.fromDevice, options.toDevice);
	const restored: Record<string, { at: number; from?: string }> = isObject(state.restored)
		? (structuredClone(state.restored) as Record<string, { at: number; from?: string }>)
		: {};
	let demoted = 0;
	for (const run of state.runs as Json[]) {
		const id = run.id as string;
		if (ACTIVE.has(run.status as string)) {
			restored[id] = { at: options.at, from: run.status as string };
			run.status = 'interrupted';
			if (typeof run.endedAt !== 'number') run.endedAt = options.at;
			demoted++;
		} else if (run.notificationAttempted !== true && !restored[id]) restored[id] = { at: options.at };
	}
	state.restored = restored;
	return { text: JSON.stringify(state), runs: state.runs.length, demoted };
}

export interface RestoredInbox {
	readonly text: string;
	readonly records: number;
	readonly receipts: number;
}
const CHANNEL_STATUS = new Set(['pending', 'sent', 'failed', 'unknown']);
/**
 * Notification records, read state and delivery receipts (including the tombstones of cleared records) as one unit.
 * A `pending` delivery is shown as `unknown`, exactly what a normal load does: the system never claims it was sent.
 */
export function restoreNotificationInbox(text: string): RestoredInbox {
	const state = parseObject(text, 'inbox');
	if (!Array.isArray(state.records) || !isObject(state.receipts)) throw new InvalidSection('inbox:shape');
	const settle = (deliveries: unknown): void => {
		if (!isObject(deliveries)) return;
		for (const [channel, status] of Object.entries(deliveries)) {
			if (!CHANNEL_STATUS.has(status as string)) throw new InvalidSection('inbox:delivery-status', { channel });
			if (status === 'pending') deliveries[channel] = 'unknown';
		}
	};
	for (const record of state.records as unknown[]) {
		if (
			!isObject(record) ||
			typeof record.id !== 'string' ||
			!Array.isArray(record.channels) ||
			!isObject(record.deliveries)
		)
			throw new InvalidSection('inbox:record-shape');
		settle(record.deliveries);
	}
	for (const deliveries of Object.values(state.receipts)) {
		if (!isObject(deliveries)) throw new InvalidSection('inbox:receipt-shape');
		settle(deliveries);
	}
	return { text: JSON.stringify(state), records: state.records.length, receipts: Object.keys(state.receipts).length };
}

const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
/** Own usage totals. Same invariants the stats store enforces on load. */
export function validateStats(text: string): { count: number } {
	const stats = parseObject(text, 'stats');
	const buckets = (value: unknown) =>
		isObject(value) &&
		Object.values(value).every((row) => isObject(row) && number(row.launched) && number(row.workMs));
	if (
		stats.version !== 1 ||
		!(stats.firstEventAt === null || number(stats.firstEventAt)) ||
		!number(stats.agentsLaunched) ||
		!number(stats.agentWorkMs) ||
		!buckets(stats.daily) ||
		!buckets(stats.byAgent)
	)
		throw new InvalidSection('stats:shape');
	return { count: Object.keys(stats.daily as Json).length };
}

/** History annotations: a map keyed by the native source tuple; each row is an object. Keys are kept as they are. */
export function validateHistory(text: string): { count: number } {
	const rows = parseObject(text, 'history');
	if (Object.keys(rows).length > 200_000 || !Object.values(rows).every(isObject))
		throw new InvalidSection('history:shape');
	return { count: Object.keys(rows).length };
}

/** Native-session references the automations created. A reference, never a transcript. */
export function validateRegistry(text: string): { count: number } {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new InvalidSection('registry:not-json');
	}
	if (!Array.isArray(value) && !isObject(value)) throw new InvalidSection('registry:shape');
	return { count: Array.isArray(value) ? value.length : Object.keys(value).length };
}

export function isEmptyDocument(
	kind: 'history' | 'stats' | 'registry' | 'runtime' | 'inbox' | 'records',
	text: string,
): boolean {
	try {
		const value: unknown = JSON.parse(text);
		switch (kind) {
			case 'history':
				return isObject(value) && Object.keys(value).length === 0;
			case 'registry':
				return Array.isArray(value) ? value.length === 0 : isObject(value) && Object.keys(value).length === 0;
			case 'stats':
				return (
					isObject(value) &&
					!value.agentsLaunched &&
					!value.agentWorkMs &&
					isObject(value.daily) &&
					Object.keys(value.daily).length === 0 &&
					isObject(value.byAgent) &&
					Object.keys(value.byAgent).length === 0
				);
			case 'runtime':
				return (
					isObject(value) &&
					Array.isArray(value.definitions) &&
					value.definitions.length === 0 &&
					Array.isArray(value.runs) &&
					value.runs.length === 0 &&
					isObject(value.cursors) &&
					Object.keys(value.cursors).length === 0
				);
			case 'inbox':
				return (
					isObject(value) &&
					Array.isArray(value.records) &&
					value.records.length === 0 &&
					isObject(value.receipts) &&
					Object.keys(value.receipts).length === 0
				);
			case 'records':
				return (
					isObject(value) &&
					isObject(value.spaces) &&
					Object.keys(value.spaces).length === 0 &&
					isObject(value.sessions) &&
					Object.keys(value.sessions).length === 0 &&
					(!isObject(value.inbox) ||
						!Array.isArray(value.inbox.messages) ||
						value.inbox.messages.length === 0)
				);
		}
	} catch {
		return false;
	}
}

export interface RestoredDefinition {
	readonly id: string;
	readonly name: string;
	readonly path: string;
	readonly text: string;
	/** The source had it enabled; the restored copy is disabled and the user turns it on again deliberately. */
	readonly wasEnabled: boolean;
}
const MAX_DEFINITION_CHARS = 1_000_000;

/**
 * One automation definition document (`操作.md`). Its target path comes from its own id and name by the same rule the
 * repository uses; the package path is never consulted. The restored copy is disabled (execution never resumes by
 * import) and, when it belonged to the adopted device, rebound to this device. The rest of the document is untouched.
 */
export function restoreDefinitionDocument(
	text: string,
	options: { readonly fromDevice: string; readonly toDevice: string },
): RestoredDefinition {
	if (text.length > MAX_DEFINITION_CHARS) throw new InvalidSection('definition:too-large');
	let document;
	let properties: unknown;
	try {
		document = readMarkdownDocument(text);
		if (document.yaml === null) throw new InvalidSection('definition:no-frontmatter');
		const yaml = readYaml(document.yaml);
		properties = yaml.toJS();
		if (!isObject(properties)) throw new InvalidSection('definition:frontmatter');
		if (properties['huhu-type'] !== 'automation') throw new InvalidSection('definition:not-automation');
		const id = properties['huhu-id'];
		const name = properties.name;
		if (typeof id !== 'string' || !/^[A-Za-z0-9:_-]{8,200}$/.test(id) || typeof name !== 'string' || !name)
			throw new InvalidSection('definition:identity');
		const wasEnabled = properties.enabled === true;
		if (wasEnabled) yaml.set('enabled', false);
		if (options.fromDevice !== options.toDevice && properties.deviceId === options.fromDevice)
			yaml.set('deviceId', options.toDevice);
		const folder = `${huhuName(name)}-${id.slice(-8)}`;
		const rebuilt = `${document.prefix}---${document.newline}${String(yaml)}---${document.newline}${document.body}`;
		return {
			id,
			name,
			path: `${AUTOMATION_DEFINITIONS_ROOT}/${folder}/操作.md`,
			text:
				wasEnabled || (options.fromDevice !== options.toDevice && properties.deviceId === options.fromDevice)
					? rebuilt
					: text,
			wasEnabled,
		};
	} catch (error) {
		if (error instanceof InvalidSection) throw error;
		throw new InvalidSection('definition:unreadable');
	}
}

/** `huhu-id` of a definition document already in the vault, or undefined when it cannot be read as one. */
export function definitionIdOf(text: string): string | undefined {
	try {
		const document = readMarkdownDocument(text);
		if (document.yaml === null) return undefined;
		const properties = readYaml(document.yaml).toJS() as unknown;
		return isObject(properties) &&
			properties['huhu-type'] === 'automation' &&
			typeof properties['huhu-id'] === 'string'
			? properties['huhu-id']
			: undefined;
	} catch {
		return undefined;
	}
}
