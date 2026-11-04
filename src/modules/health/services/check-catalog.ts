import type { HealthCheckDescriptor } from '../api';

/** Scope metadata only: importing this catalog never loads an owner or provides an executable service. */
export const knownHealthChecks: readonly HealthCheckDescriptor[] = [
	{ id: 'archives.integrity', owner: 'archives', scope: 'archives', titleKey: 'health.page.scope.archives' },
	{ id: 'archives.belongings', owner: 'archives', scope: 'belongings', titleKey: 'health.page.scope.belongings' },
	{ id: 'navigator.periodic', owner: 'navigator', scope: 'periodic', titleKey: 'health.page.scope.periodic' },
	{ id: 'safe.container', owner: 'safe', scope: 'safe', titleKey: 'health.page.scope.safe' },
];
