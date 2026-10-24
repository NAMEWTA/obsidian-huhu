import { expect, test } from 'vitest';
import { legacyFlagMembers, readLegacyMembers, widgetPresentationKey } from './widget-members';
import { WidgetLifetime } from './widget-lifetime';
import { indexWidgetProviders, widgetProviderKey } from './widget-registry';
import type { HomeWidgetKind } from '../../api';
import { builtinHomeWidgets } from '../../contrib/widgets';
import { DEFAULT_DASHBOARD_SETTINGS } from './types/model';

test('clock weather creates independent board instances and retired integrations are absent from the add catalog', async () => {
	const kinds = builtinHomeWidgets(
		() => DEFAULT_DASHBOARD_SETTINGS,
		() => undefined,
	).kinds;
	expect(kinds.some((kind) => kind.section === 'ticktick' || kind.section === 'weread')).toBe(false);
	expect(kinds.some((kind) => kind.key === 'weather')).toBe(false);
	const weather = kinds.find((kind) => kind.key === 'clock')!;
	expect(weather.multiple).toBe(true);
	const first = await weather.create!({} as never),
		second = await weather.create!({} as never);
	expect(first?.id).not.toBe(second?.id);
	expect(weather.instances()).toEqual([{ id: 'default' }]);
});

test('old enable flags rebuild the sidebar the user had, in the order they chose', () => {
	const raw = {
		widgetOrder: ['calendar', 'album', 'quickActions'],
		widgetQuickActionsEnabled: true,
		widgetCalendarEnabled: true,
		widgetLunarEnabled: false,
		pomodoroEnabled: false,
		albums: [{ id: 7 }, { id: 9 }],
	};
	const before = JSON.stringify(raw);
	expect(legacyFlagMembers(raw).map(widgetPresentationKey)).toEqual([
		'calendar',
		'album-7',
		'album-9',
		'quickActions',
	]);
	expect(JSON.stringify(raw)).toBe(before);
	expect(readLegacyMembers({})).toBeUndefined();
	expect(readLegacyMembers({ widgetMusicEnabled: true })?.map((m) => m.kind)).toContain('music');
});

test('widget resources release once, including late async registration and throwing cleanup', () => {
	const errors: unknown[] = [];
	const lifetime = new WidgetLifetime((error) => errors.push(error));
	let released = 0;
	const resource = () => {
		released++;
	};
	lifetime.register(resource);
	lifetime.register(resource);
	lifetime.register(() => {
		throw new Error('fixture');
	});
	lifetime.dispose();
	lifetime.dispose();
	lifetime.register(resource);
	lifetime.register(() => {
		released++;
	});
	expect(lifetime.signal.aborted).toBe(true);
	expect(released).toBe(2);
	expect(errors).toHaveLength(1);
});

test('same names in different providers coexist while a duplicate inside a provider is reported', () => {
	const kind: HomeWidgetKind = {
		key: 'calendar',
		titleKey: 'calendar',
		icon: 'calendar',
		category: 'time',
		sizes: { M: { w: 4, h: 40 } },
		defaultTier: 'M',
		minSize: { w: 2, h: 3 },
		instances: () => [{ id: 'default' }],
		render: () => undefined,
	};
	const duplicate = { ...kind, icon: 'other' };
	const index = indexWidgetProviders([
		{ module: 'home', bundle: { kinds: [kind, duplicate] } },
		{ module: 'automations', bundle: { kinds: [duplicate] } },
	]);
	expect(index.byKey.get(widgetProviderKey('home', 'calendar'))?.kind).toBe(kind);
	expect(index.byKey.get(widgetProviderKey('automations', 'calendar'))?.kind).toBe(duplicate);
	expect(index.errors).toEqual(['home/calendar']);
});
