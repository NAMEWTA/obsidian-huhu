import { defineSettings, f } from '../../shared/settings/schema';

export const healthSettings = defineSettings({
	concurrency: f.number({ default: 2, min: 1, max: 4, integer: true }),
	batchSize: f.number({ default: 100, min: 1, max: 500, integer: true }),
	maxItems: f.number({ default: 10000, min: 1, max: 1000000, integer: true }),
	maxIssues: f.number({ default: 1000, min: 1, max: 10000, integer: true }),
	freshnessMinutes: f.number({ default: 5, min: 1, max: 1440, integer: true }),
});
export type HealthSettings = ReturnType<typeof healthSettings.defaults>;
