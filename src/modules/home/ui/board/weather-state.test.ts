import { expect, test } from 'vitest';
import type { BoardWeatherState } from '../../services/board-store';
import { weatherView } from './weather-state';

const state = (patch: Partial<BoardWeatherState>): BoardWeatherState => ({
	locationKey: 'k',
	status: 'ready',
	data: null,
	error: '',
	...patch,
});

test('every published weather status has its own view and none is shown as loading by default', () => {
	expect(weatherView('', undefined)).toEqual({ kind: 'unconfigured' });
	expect(weatherView('', state({ status: 'ready' }))).toEqual({ kind: 'unconfigured' });
	expect(weatherView('k', undefined)).toEqual({ kind: 'waiting' });
	expect(weatherView('k', state({ status: 'waiting' }))).toEqual({ kind: 'waiting' });
	expect(weatherView('k', state({ status: 'unconfigured' }))).toEqual({ kind: 'waiting' });
	expect(weatherView('k', state({ status: 'loading', stage: 'fallback' }))).toEqual({ kind: 'loading', stage: 'fallback' });
	expect(weatherView('k', state({ status: 'loading' }))).toEqual({ kind: 'loading', stage: 'cache-read' });
	expect(weatherView('k', state({ status: 'refreshing' }))).toEqual({ kind: 'refreshing' });
	expect(weatherView('k', state({ status: 'ready', stale: true }))).toEqual({ kind: 'ready', stale: true });
	expect(weatherView('k', state({ status: 'error', errorCode: 'timeout' }))).toEqual({ kind: 'error', code: 'timeout' });
	expect(weatherView('k', state({ status: 'cancelled' }))).toEqual({ kind: 'cancelled' });
});

test('a state published for another location is an invalidated older request', () => {
	expect(weatherView('new', state({ locationKey: 'old', status: 'ready' }))).toEqual({ kind: 'invalidated' });
});
