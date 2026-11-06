import { WORKBENCH_FEATURES, type SavedPage, type WorkbenchFeature, type WorkbenchTarget } from './workbench';

export const WORKBENCH_UI_SCHEMA = 'huhu-workbench-ui/1';
export const PANEL_MIN = 220;
export const PANEL_MAX = 480;
export const PANEL_DEFAULT = 272;

/** The only workspace envelope; module data remains owned by its contribution. */
export type WorkbenchUiState = {
	schema: typeof WORKBENCH_UI_SCHEMA;
	route: WorkbenchTarget;
	navigation: { width: number; open: boolean; lastRoutes: Partial<Record<WorkbenchFeature, WorkbenchTarget>> };
	mode: 'workbench' | 'focus';
	pageViews: SavedPage[];
};

function record(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
function safeText(value: unknown, max: number): string | undefined {
	return typeof value === 'string' &&
		value.length > 0 &&
		value.length <= max &&
		![...value].some((character) => character.charCodeAt(0) < 32)
		? value
		: undefined;
}

/** Module sections are bounded identifiers; modules validate their own page semantics. */
export function normalizeTarget(raw: unknown): WorkbenchTarget {
	const value = record(raw);
	if (!value || !WORKBENCH_FEATURES.some((feature) => feature === value.feature)) return { feature: 'dashboard' };
	const feature = value.feature as WorkbenchFeature;
	if (feature === 'safe') return { feature };
	const target: WorkbenchTarget = { feature };
	const section = safeText(value.section, 128);
	if (section && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(section)) target.section = section;
	const resourceId = safeText(value.resourceId, 2048),
		focusId = safeText(value.focusId, 256);
	if (resourceId) target.resourceId = resourceId;
	if (focusId) target.focusId = focusId;
	return target;
}

export function targetKey(target: WorkbenchTarget): string {
	return JSON.stringify([target.feature, target.section ?? '', target.resourceId ?? '', target.focusId ?? '']);
}
export function panelWidth(raw: unknown): number {
	return typeof raw === 'number' && Number.isFinite(raw)
		? Math.round(Math.max(PANEL_MIN, Math.min(PANEL_MAX, raw)))
		: PANEL_DEFAULT;
}
function initialState(): WorkbenchUiState {
	return {
		schema: WORKBENCH_UI_SCHEMA,
		route: { feature: 'dashboard' },
		navigation: { width: PANEL_DEFAULT, open: true, lastRoutes: {} },
		mode: 'workbench',
		pageViews: [],
	};
}

export function normalizeWorkbenchState(raw: unknown): WorkbenchUiState {
	const value = record(raw);
	if (!value || value.schema !== WORKBENCH_UI_SCHEMA) return initialState();
	const navigation = record(value.navigation) ?? {},
		last = record(navigation.lastRoutes) ?? {};
	const lastRoutes: WorkbenchUiState['navigation']['lastRoutes'] = {};
	for (const feature of WORKBENCH_FEATURES) {
		const candidate = record(last[feature]);
		if (!candidate || candidate.feature !== feature) continue;
		lastRoutes[feature] = normalizeTarget(candidate);
	}
	const pageViews: SavedPage[] = [];
	if (Array.isArray(value.pageViews))
		for (const item of value.pageViews.slice(0, 100)) {
			const page = record(item),
				rawTarget = record(page?.target);
			if (!page || !rawTarget) continue;
			const target = normalizeTarget(rawTarget);
			if (target.feature !== rawTarget.feature) continue;
			const state = record(page.state) ?? {};
			pageViews.push({
				target,
				state: target.feature === 'safe' ? {} : cleanPageState(state, Object.keys(state).slice(0, 32)),
			});
		}
	return {
		schema: WORKBENCH_UI_SCHEMA,
		route: normalizeTarget(value.route),
		navigation: { width: panelWidth(navigation.width), open: navigation.open !== false, lastRoutes },
		mode: value.mode === 'focus' ? 'focus' : 'workbench',
		pageViews,
	};
}

/** Workspace state is a bounded projection, never a second business store. */
export function cleanPageState(raw: unknown, keys: readonly string[]): Record<string, unknown> {
	const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
	const forbidden =
		/^(?:__proto__|prototype|constructor|password|cookie|cookies|token|accessToken|refreshToken|authorization|credentials|secret)$/i;
	const clean = (item: unknown, depth: number): unknown => {
		if (item === null || typeof item === 'boolean') return item;
		if (typeof item === 'string') return item.slice(0, 8192);
		if (typeof item === 'number') return Number.isFinite(item) ? item : undefined;
		if (depth > 3 || !item || typeof item !== 'object') return undefined;
		if (Array.isArray(item))
			return item
				.slice(0, 100)
				.map((entry) => clean(entry, depth + 1))
				.filter((entry) => entry !== undefined);
		if (Object.prototype.toString.call(item) !== '[object Object]') return undefined;
		return Object.fromEntries(
			Object.entries(item)
				.slice(0, 32)
				.flatMap(([key, entry]) => {
					if (forbidden.test(key)) return [];
					const safe = clean(entry, depth + 1);
					return safe === undefined ? [] : [[key, safe]];
				}),
		);
	};
	return Object.fromEntries(
		keys.flatMap((key) => {
			if (forbidden.test(key) || !Object.prototype.hasOwnProperty.call(value, key)) return [];
			const safe = clean(value[key], 0);
			return safe === undefined ? [] : [[key, safe]];
		}),
	);
}
