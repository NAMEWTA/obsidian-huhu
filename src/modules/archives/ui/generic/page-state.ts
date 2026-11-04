import type { EntityQuery, EntityState, Filter } from '../../core/schema/model';
import { identifier } from '../../core/schema/value';
import { validateQuery } from '../../core/generic/query';
export interface ArchivePageState {
	section?: string;
	selectedId?: string;
	search: string;
	offset: number;
	layout?: 'table' | 'card';
	filter?: Filter;
	sort?: EntityQuery['sort'];
	states?: EntityState[];
	scroll: number;
}
export function restoreArchivePageState(raw: Record<string, unknown>): ArchivePageState {
	const section = typeof raw.section === 'string' ? raw.section : undefined;
	const state: ArchivePageState = {
		section: identifier(section) ? section : undefined,
		selectedId: typeof raw.selectedId === 'string' && raw.selectedId.length <= 4096 ? raw.selectedId : undefined,
		search: typeof raw.search === 'string' ? raw.search.slice(0, 2048) : '',
		offset:
			typeof raw.offset === 'number' &&
			Number.isSafeInteger(raw.offset) &&
			raw.offset >= 0 &&
			raw.offset <= 1000000
				? raw.offset
				: 0,
		layout: raw.layout === 'card' || raw.layout === 'table' ? raw.layout : undefined,
		scroll:
			typeof raw.scroll === 'number' && Number.isFinite(raw.scroll) && raw.scroll >= 0
				? Math.min(raw.scroll, 10000000)
				: 0,
	};
	try {
		const query = { filter: raw.filter, sort: raw.sort, states: raw.states };
		if (JSON.stringify(query).length <= 16384) {
			validateQuery(query);
			state.filter = query.filter;
			state.sort = query.sort;
			state.states = query.states;
		}
	} catch {
		/* Discard only malformed saved query data, never the user's selected record. */
	}
	return state;
}
