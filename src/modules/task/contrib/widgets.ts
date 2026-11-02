import type { HomeWidgetBundle, HomeWidgetKind } from '../../home/api';
/** Presentation contribution only. Home never constructs or disposes the task service. */
export function taskWidgets(render: HomeWidgetKind['render']): HomeWidgetBundle {
	return {
		kinds: [
			{
				key: 'tasks',
				titleKey: 'task.title',
				icon: 'list-checks',
				category: 'productivity',
				sizes: { S: { w: 3, h: 2 }, M: { w: 6, h: 2 }, L: { w: 6, h: 4 }, XL: { w: 12, h: 4 } },
				defaultTier: 'L',
				minSize: { w: 3, h: 2 },
				multiple: true,
				instances: () => [{ id: 'default' }],
				render,
			},
		],
	};
}
