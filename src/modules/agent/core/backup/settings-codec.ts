import type { ExclusionCategory } from './format';

/**
 * The portable part of the `agent` settings namespace (contracts section 6): appearance, plain command text,
 * provider/account identifiers and permission-mode intent. Everything else is left out by construction (an allow
 * list, not a block list), so a new secret field can never leak into a package by being forgotten here.
 *
 * Deliberately not exported: structured `env` values (global override, per-agent), launch arguments (they can embed
 * tokens), CLI/shell/skill paths of this machine, the YOLO acknowledgement and anything that is an authorization of this machine.
 */
const STRING_FIELDS = ['fontFamily', 'foreground', 'background', 'lastQuickCommand', 'defaultAgent'] as const;
const BOOLEAN_FIELDS = ['cursorBlink', 'useObsidianTheme', 'statusHooks', 'generatedTitles', 'notifications'] as const;
const NUMBER_FIELDS = ['fontSize', 'lineHeight', 'scrollback', 'usageRefreshSec'] as const;
const AGENT_ENTRY = ['enabled', 'permissionMode', 'accountId', 'showUsage'] as const;
const AGENT_GLOBAL = ['globalPermissionMode', 'usageRefreshSec', 'showUsageInStatusBar'] as const;
const MAX_ITEMS = 2000;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value);
// Dictionaries may carry `__proto__` as ordinary data. Never resolve a missing key through Object.prototype.
const ownRecord = (value?: unknown): Json => Object.assign(Object.create(null) as Json, isObject(value) ? value : {});
const stringMap = (value: unknown): Json | undefined =>
	isObject(value)
		? Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === 'string').slice(0, MAX_ITEMS))
		: undefined;
const booleanMap = (value: unknown): Json | undefined =>
	isObject(value)
		? Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === 'boolean').slice(0, MAX_ITEMS))
		: undefined;
const strings = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, MAX_ITEMS) : [];
const permission = (value: unknown, inherit = false): boolean =>
	value === 'manual' || value === 'yolo' || (inherit && value === 'inherit');

/** What `portableAgentSettings` leaves out, for the manifest. */
export const SETTINGS_EXCLUSIONS: readonly ExclusionCategory[] = [
	'env-values',
	'launch-arguments',
	'machine-paths',
	'yolo-acknowledgement',
];

/** Settings fields that can raise what an agent may do. A package may carry the intent; it never applies it silently. */
export function portableAgentSettings(value: unknown): Json {
	const agent = ownRecord(value);
	const out = ownRecord();
	for (const key of STRING_FIELDS) if (typeof agent[key] === 'string') out[key] = agent[key];
	for (const key of BOOLEAN_FIELDS) if (typeof agent[key] === 'boolean') out[key] = agent[key];
	for (const key of NUMBER_FIELDS)
		if (typeof agent[key] === 'number' && Number.isFinite(agent[key])) out[key] = agent[key];
	if (['block', 'bar', 'underline'].includes(agent.cursorStyle as string)) out.cursorStyle = agent.cursorStyle;
	if (agent.renderer === 'webgl' || agent.renderer === 'dom') out.renderer = agent.renderer;
	if (permission(agent.permissionMode)) out.permissionMode = agent.permissionMode;
	for (const key of ['enabled', 'usageAnalytics'] as const) {
		const map = booleanMap(agent[key]);
		if (map) out[key] = map;
	}
	if (Array.isArray(agent.hiddenNavigation)) out.hiddenNavigation = strings(agent.hiddenNavigation);
	if (isObject(agent.accounts))
		out.accounts = Object.fromEntries(Object.entries(agent.accounts).filter(([, v]) => Array.isArray(v))
			.slice(0, MAX_ITEMS).map(([id, value]) => [id, strings(value)]));
	if (isObject(agent.accountLabels))
		out.accountLabels = Object.fromEntries(Object.entries(agent.accountLabels).slice(0, MAX_ITEMS)
			.flatMap(([id, row]) => { const map = stringMap(row); return map ? [[id, map]] : []; }));
	if (Array.isArray(agent.quickCommands))
		out.quickCommands = agent.quickCommands.filter(isObject).slice(0, MAX_ITEMS).map((value) => {
			const command = ownRecord(value);
			const row = ownRecord();
			for (const key of ['id', 'name', 'content', 'agentId', 'cwd', 'spaceId'] as const)
				if (typeof command[key] === 'string') row[key] = command[key];
			if (command.type === 'terminal' || command.type === 'agent') row.type = command.type;
			if (command.scope === 'global' || command.scope === 'vault') row.scope = command.scope;
			return row;
		});
	if (isObject(agent.agents)) {
		const agents = ownRecord(agent.agents);
		const group = ownRecord();
		if (permission(agents.globalPermissionMode)) group.globalPermissionMode = agents.globalPermissionMode;
		if (typeof agents.usageRefreshSec === 'number' && Number.isFinite(agents.usageRefreshSec))
			group.usageRefreshSec = agents.usageRefreshSec;
		if (typeof agents.showUsageInStatusBar === 'boolean') group.showUsageInStatusBar = agents.showUsageInStatusBar;
		if (isObject(agents.agents))
			group.agents = Object.fromEntries(Object.entries(agents.agents).slice(0, MAX_ITEMS).flatMap(([id, value]) => {
				if (!isObject(value)) return [];
				const source = ownRecord(value);
				const row = ownRecord();
				for (const key of ['enabled', 'showUsage'] as const) if (typeof source[key] === 'boolean') row[key] = source[key];
				if (permission(source.permissionMode, true)) row.permissionMode = source.permissionMode;
				if (typeof source.accountId === 'string') row.accountId = source.accountId;
				return [[id, row]];
			}));
		out.agents = group;
	}
	return out;
}

const rank = (mode: unknown): number => (mode === 'yolo' ? 1 : 0);
export interface MergedSettings {
	readonly agent: Json;
	/** Permission settings the package asked to raise to YOLO; they were kept as they are on this machine. */
	readonly permissionRaisesSkipped: number;
}

/**
 * Overlay the portable part onto this machine's existing namespace. Machine fields stay as they are. A permission
 * mode never goes up (manual -> yolo) through an import: the user confirms YOLO on this machine, as for any first use.
 */
export function mergePortableAgentSettings(target: unknown, portable: unknown): MergedSettings {
	const base = ownRecord(isObject(target) ? structuredClone(target) : undefined);
	const incoming = portableAgentSettings(portable);
	let skipped = 0;
	const guard = (current: unknown, next: unknown): unknown => {
		if (rank(next) > rank(current)) {
			skipped++;
			return current;
		}
		return next;
	};
	// The mode an agent really runs with: its own setting, or the global one when it inherits.
	const effective = (own: unknown, global: unknown) =>
		own === 'manual' || own === 'yolo' ? own : (global ?? 'manual');
	const beforeGlobal = ownRecord(base.agents).globalPermissionMode;
	for (const key of Object.keys(incoming)) {
		if (key === 'agents') continue;
		base[key] = key === 'permissionMode' ? guard(base[key] ?? 'manual', incoming[key]) : incoming[key];
	}
	const group = incoming.agents;
	if (isObject(group)) {
		const current = ownRecord(base.agents);
		for (const key of AGENT_GLOBAL) {
			if (!Object.hasOwn(group, key)) continue;
			current[key] = key === 'globalPermissionMode' ? guard(current[key] ?? 'manual', group[key]) : group[key];
		}
		if (isObject(group.agents)) {
			const rows = ownRecord(current.agents);
			for (const [id, row] of Object.entries(group.agents)) {
				if (!isObject(row)) continue;
				const existing = ownRecord(rows[id]);
				const before = effective(existing.permissionMode, beforeGlobal);
				const previous = existing.permissionMode;
				for (const key of AGENT_ENTRY) if (Object.hasOwn(row, key)) existing[key] = row[key];
				// Compare what the agent will really run with, so `inherit` cannot be a way around the rule.
				if (rank(effective(existing.permissionMode, current.globalPermissionMode)) > rank(before)) {
					skipped++;
					if (previous === undefined) delete existing.permissionMode;
					else existing.permissionMode = previous;
				}
				rows[id] = existing;
			}
			current.agents = rows;
		}
		base.agents = current;
	}
	return { agent: base, permissionRaisesSkipped: skipped };
}
