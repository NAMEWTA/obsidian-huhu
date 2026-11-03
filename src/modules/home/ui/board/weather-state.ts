import type { BoardWeatherState } from '../../services/board-store';

/** What the weather tile says about its request. Data presence is separate: a state may keep an older forecast. */
export type WeatherView =
	| { kind: 'unconfigured' }
	| { kind: 'waiting' }
	| { kind: 'invalidated' }
	| { kind: 'loading'; stage: NonNullable<BoardWeatherState['stage']> | 'cache-read' }
	| { kind: 'refreshing' }
	| { kind: 'ready'; stale: boolean }
	| { kind: 'error'; code: NonNullable<BoardWeatherState['errorCode']> }
	| { kind: 'cancelled' };

/**
 * `key` is the location key the tile is configured for ('' when there is none). A published state for another
 * location is an older request whose result was discarded, never a state to show as this location's.
 */
export function weatherView(key: string, current: BoardWeatherState | undefined): WeatherView {
	if (!key) return { kind: 'unconfigured' };
	if (!current) return { kind: 'waiting' };
	if (current.locationKey !== key) return { kind: 'invalidated' };
	switch (current.status) {
		case 'loading':
			return { kind: 'loading', stage: current.stage ?? 'cache-read' };
		case 'refreshing':
			return { kind: 'refreshing' };
		case 'ready':
			return { kind: 'ready', stale: !!current.stale };
		case 'error':
			return { kind: 'error', code: current.errorCode ?? 'network' };
		case 'cancelled':
			return { kind: 'cancelled' };
		default:
			return { kind: 'waiting' };
	}
}
