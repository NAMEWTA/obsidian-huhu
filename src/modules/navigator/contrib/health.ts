import { serviceKey } from '../../../app/contracts/module';
import type { HealthCheck, HealthProvider } from '../../health/api';
import type { PeriodicHealthSource, PeriodicHealthOwner } from './health-scan';
export type { PeriodicHealthSource, PeriodicHealthOwner } from './health-scan';
export const PERIODIC_HEALTH = serviceKey<HealthCheck>('navigator', 'health');
export const PERIODIC_HEALTH_PROVIDERS: readonly HealthProvider[] = [{ id: 'navigator.periodic', scope: 'periodic', service: PERIODIC_HEALTH }];

/** Registration and permission checks never load the scanner implementation. */
export function createPeriodicHealth(source: PeriodicHealthSource | PeriodicHealthOwner): HealthCheck & { resolve(reference: string): string | undefined; dispose(): void } {
	const references = new Map<string, string>();
	return {
		permission: async signal => !signal.aborted && source.available() ? 'allowed' : 'unavailable',
		async *scan(context) {
			yield* (await import('./health-scan')).createPeriodicHealthScan(source, references).scan(context);
		},
		resolve: reference => references.get(reference),
		dispose: () => references.clear(),
	};
}
