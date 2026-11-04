import { serviceKey } from '../../../app/contracts/module';
import type { HealthCheck, HealthProvider } from '../../health/api';
import type { SafeHealthSource } from './health-scan';
export type { SafeHealthSource } from './health-scan';
export const SAFE_HEALTH = serviceKey<HealthCheck>('safe', 'health-container');
export const SAFE_HEALTH_PROVIDERS: readonly HealthProvider[] = [{ id: 'safe.container', scope: 'safe', service: SAFE_HEALTH }];

export function createSafeHealth(source: SafeHealthSource): HealthCheck {
	const access = (): 'locked' | 'unavailable' | 'allowed' => {
		const state = source.state();
		return state === 'locked' ? 'locked' : state === 'loading' || state === 'error' ? 'unavailable' : 'allowed';
	};
	return {
		permission: async signal => { signal.throwIfAborted(); return access(); },
		async *scan(context) {
			context.signal.throwIfAborted();
			const allowed = access();
			if (allowed !== 'allowed') { yield { checked: 0, status: allowed }; return; }
			const { createSafeHealthScan } = await import('./health-scan');
			context.signal.throwIfAborted();
			yield* createSafeHealthScan(source).scan(context);
		},
	};
}
