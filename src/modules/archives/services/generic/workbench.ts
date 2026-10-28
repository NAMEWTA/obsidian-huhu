import type { NavigationItem, PanelModel } from '../../../../app/contracts/workbench';
import type { ArchivesWorkbench } from '../../api';
import { t } from '../../../../shared/i18n';
import type { ArchivesApplication } from './application';
export function archiveSection(section: string | undefined): string | undefined {
	return section === 'person' ? 'type-person' : section === 'company' ? 'type-company' : section;
}
export function genericArchivesWorkbench(source: () => ArchivesApplication | undefined): ArchivesWorkbench {
	return {
		subscribe: (listener) => source()?.runtime.subscribe(listener) ?? (() => {}),
		navigation(): readonly NavigationItem[] {
			const catalog = source()?.catalog.snapshot();
			return [
				...(catalog?.types
					.filter((type) => type.enabled)
					.map((type) => ({
						id: `archives-${type.id}`,
						labelKey: 'workbench.contacts',
						label: type.label,
						icon: type.icon,
						badge: type.count,
						target: { feature: 'contacts' as const, section: type.id },
						children: catalog.views
							.filter((view) => view.definition.kind === 'view' && view.definition.typeId === type.id)
							.map((view) => ({
								id: `archives-${view.definition.id}`,
								labelKey: 'workbench.contacts',
								label: view.definition.label,
								icon: 'table',
								target: { feature: 'contacts' as const, section: view.definition.id },
							})),
					})) ?? []),
				{
					id: 'archives-designer',
					labelKey: 'archives.designer',
					icon: 'sliders-horizontal',
					target: { feature: 'contacts', section: 'archive-designer' },
				},
				{
					id: 'archives-recovery',
					labelKey: 'archives.recovery',
					icon: 'shield-check',
					target: { feature: 'contacts', section: 'archive-recovery' },
				},
			];
		},
		title(target): string {
			const application = source(),
				section = archiveSection(target.section);
			if (section === 'archive-designer') return t('archives.designer');
			if (section === 'archive-recovery') return t('archives.recovery');
			if (target.resourceId) {
				const record = application?.runtime.index.get(target.resourceId);
				if (record) return record.name;
			}
			return (
				(section ? application?.runtime.index.definition(section)?.definition.label : undefined) ??
				t('workbench.contacts')
			);
		},
		panel(target): PanelModel {
			const application = source();
			if (!application) return { sections: [] };
			void application.runtime.ensureLoaded().catch((error) => console.error('[HUHU archives]', error));
			const index = application.runtime.index,
				catalog = index.catalog(),
				selected = target.resourceId ? index.get(target.resourceId) : undefined,
				section = archiveSection(target.section);
			return {
				searchable: true,
				sections: [
					{
						id: 'archives-tools',
						items: [
							{
								id: 'archive-designer',
								label: t('archives.designer'),
								icon: 'sliders-horizontal',
								target: { feature: 'contacts', section: 'archive-designer' },
							},
							{
								id: 'archive-recovery',
								label: t('archives.recovery'),
								icon: 'shield-check',
								target: { feature: 'contacts', section: 'archive-recovery' },
								badge: index.diagnostics().length || undefined,
							},
						],
					},
				],
				tree: {
					label: t('workbench.contacts'),
					selectedId: selected?.id ?? section,
					defaultExpandedIds: catalog.types.filter((type) => type.enabled).map((type) => type.id),
					folderClick: 'expand',
					emptyText: t(application.runtime.loading ? 'contacts.loading' : 'contacts.empty'),
					nodes: catalog.types
						.filter((type) => type.enabled || type.id === selected?.typeId || type.id === section)
						.map((type) => ({
							id: type.id,
							label: type.label,
							icon: type.icon,
							badge: type.count,
							children: index.query({ typeId: type.id, limit: 500 }).items.map((record) => ({
								id: record.id,
								label: record.name,
								avatar: [...record.name][0] ?? '?',
							})),
						})),
					target: (id) =>
						catalog.types.some((type) => type.id === id)
							? { feature: 'contacts', section: id }
							: index.get(id)
								? { feature: 'contacts', section: index.get(id)!.typeId, resourceId: id }
								: undefined,
				},
			};
		},
	};
}
