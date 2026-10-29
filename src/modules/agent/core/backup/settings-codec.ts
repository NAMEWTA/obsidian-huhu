import type { ExclusionCategory } from './format';

/**
 * The portable part of the `agent` settings namespace (contracts section 6): appearance, plain command text,
 * provider/account identifiers and permission-mode intent. Everything else is left out by construction (an allow
 * list, not a block list), so a new secret field can never leak into a package by being forgotten here.
 *
 * Deliberately not exported: structured `env` values (global override, per-agent), launch arguments (they can embed
 * tokens), CLI/shell/skill paths of this machine, the YOLO acknowledgement and anything that is an authorization of this machine.
 */
const TOP_LEVEL = [
	'fontFamily',
	'fontSize',
	'lineHeight',
	'cursorStyle',
	'cursorBlink',
	'scrollback',
	'renderer',
	'useObsidianTheme',
	'foreground',
	'background',
	'lastQuickCommand',
	'defaultAgent',
	'statusHooks',
	'generatedTitles',
	'notifications',
	'hiddenNavigation',
	'usageRefreshSec',
] as const;
const AGENT_ENTRY = ['enabled', 'permissionMode', 'accountId', 'showUsage'] as const;
const AGENT_GLOBAL = ['globalPermissionMode', 'usageRefreshSec', 'showUsageInStatusBar'] as const;
const QUICK_COMMAND = ['id', 'name', 'type', 'content', 'agentId', 'cwd', 'scope', 'spaceId'] as const;
const MAX_ITEMS = 2000;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value);
const pick = (source: Json, keys: readonly string[]): Json => {
	const out: Json = {};
	for (const key of keys) if (key in source && source[key] !== undefined) out[key] = structuredClone(source[key]);
	return out;
};
const stringMap = (value: unknown): Json | undefined =>
	isObject(value)
		? Object.fromEntries(
				Object.entries(value)
					.filter(([, v]) => typeof v === 'string')
					.slice(0, MAX_ITEMS),
			)
		: undefined;

/** What `portableAgentSettings` leaves out, for the manifest. */
export const SETTINGS_EXCLUSIONS: readonly ExclusionCategory[] = [
	'env-values',
	'launch-arguments',
	'machine-paths',
	'yolo-acknowledgement',
];

/** Settings fields that can raise what an agent may do. A package may carry the intent; it never applies it silently. */
export function portableAgentSettings(agent: unknown): Json {
	if (!isObject(agent)) return {};
	const out = pick(agent, TOP_LEVEL);
	if (typeof agent.permissionMode === 'string') out.permissionMode = agent.permissionMode;
	if (isObject(agent.enabled)) out.enabled = structuredClone(agent.enabled);
	if (isObject(agent.usageAnalytics)) out.usageAnalytics = structuredClone(agent.usageAnalytics);
	if (isObject(agent.accounts)) out.accounts = structuredClone(agent.accounts);
	const labels = isObject(agent.accountLabels)
		? Object.fromEntries(
				Object.entries(agent.accountLabels).flatMap(([id, row]) => {
					const map = stringMap(row);
					return map ? [[id, map]] : [];
				}),
			)
		: undefined;
	if (labels) out.accountLabels = labels;
	if (Array.isArray(agent.quickCommands))
		out.quickCommands = agent.quickCommands
			.filter(isObject)
			.slice(0, MAX_ITEMS)
			.map((command) => pick(command, QUICK_COMMAND));
	if (isObject(agent.agents)) {
		const group: Json = pick(agent.agents, AGENT_GLOBAL);
		if (isObject(agent.agents.agents))
			group.agents = Object.fromEntries(
				Object.entries(agent.agents.agents).flatMap(([id, row]) =>
					isObject(row) ? [[id, pick(row, AGENT_ENTRY)]] : [],
				),
			);
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
	const base: Json = isObject(target) ? structuredClone(target) : {};
	const incoming: Json = isObject(portable) ? structuredClone(portable) : {};
	let skipped = 0;
	const guard = (current: unknown, next: unknown): unknown => {
		if (rank(next) > rank(current)) {
			skipped++;
			return current;
		}
		return next;
	};
	for (const key of Object.keys(incoming)) {
		if (key === 'agents') continue;
		base[key] = key === 'permissionMode' ? guard(base[key] ?? 'manual', incoming[key]) : incoming[key];
	}
	const group = incoming.agents;
	if (isObject(group)) {
		const current: Json = isObject(base.agents) ? base.agents : {};
		for (const key of AGENT_GLOBAL) {
			if (!(key in group)) continue;
			current[key] = key === 'globalPermissionMode' ? guard(current[key] ?? 'manual', group[key]) : group[key];
		}
		if (isObject(group.agents)) {
			const rows: Json = isObject(current.agents) ? current.agents : {};
			for (const [id, row] of Object.entries(group.agents)) {
				if (!isObject(row)) continue;
				const existing: Json = isObject(rows[id]) ? rows[id] : {};
				for (const key of AGENT_ENTRY) {
					if (!(key in row)) continue;
					existing[key] = key === 'permissionMode' ? guard(existing[key] ?? 'inherit', row[key]) : row[key];
				}
				rows[id] = existing;
			}
			current.agents = rows;
		}
		base.agents = current;
	}
	return { agent: base, permissionRaisesSkipped: skipped };
}
