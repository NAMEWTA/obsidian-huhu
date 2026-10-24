import type { HomeWidgetBundle, HomeWidgetKind } from '../../api';

export interface IndexedWidgets {
	byKey: ReadonlyMap<string, { module: string; kind: HomeWidgetKind }>;
	errors: readonly string[];
}

export const widgetProviderKey = (provider: string, kind: string): string => JSON.stringify([provider, kind]);

/** A repeated kind within one provider is reported, never substituted for the first. */
export function indexWidgetProviders(bundles: readonly { module: string; bundle: HomeWidgetBundle }[]): IndexedWidgets {
	const byKey = new Map<string, { module: string; kind: HomeWidgetKind }>();
	const errors: string[] = [];
	for (const item of bundles) for (const kind of item.bundle.kinds) {
		const key = widgetProviderKey(item.module, kind.key);
		if (byKey.has(key)) errors.push(`${item.module}/${kind.key}`);
		else byKey.set(key, { module: item.module, kind });
	}
	return { byKey, errors };
}
