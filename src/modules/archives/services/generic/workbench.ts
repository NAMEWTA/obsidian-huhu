import { canonical } from '../../core/schema/value';
import { displayLabel } from '../../core/schema/labels';
import type { NavigationItem, PanelModel } from '../../../../app/contracts/workbench';
import { BELONGING_TYPE_ID, type ArchivesWorkbench } from '../../api';
import { t } from '../../../../shared/i18n';
import type { ArchivesApplication } from './application';
export function genericArchivesWorkbench(source: () => ArchivesApplication | undefined): ArchivesWorkbench {
	return {
		subscribe: (listener) => source()?.runtime.subscribe(listener) ?? (() => {}),
		navigation(): readonly NavigationItem[] {
			const catalog = source()?.catalog.snapshot();
			return [
				...(!catalog?.types.some((type) => type.id === BELONGING_TYPE_ID && type.enabled)
					? [
							{
								id: 'archives-belongings',
								labelKey: 'archives.belongings.title',
								icon: 'package',
								target: { feature: 'contacts' as const, section: BELONGING_TYPE_ID },
							},
						]
					: []),
				...(catalog?.types
					.filter((type) => type.enabled)
					.map((type) => ({
						id: `archives-${type.id}`,
						labelKey: 'workbench.contacts',
						label: displayLabel(type),
						icon: type.icon,
						badge: type.count,
						target: { feature: 'contacts' as const, section: type.id },
						children: catalog.views
							.filter((view) => view.definition.kind === 'view' && view.definition.typeId === type.id)
							.map((view) => ({
								id: `archives-${view.definition.id}`,
								labelKey: 'workbench.contacts',
								label: displayLabel(view.definition),
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
					id: 'archives-report',
					labelKey: 'archives.annualReport',
					icon: 'chart-column',
					target: { feature: 'contacts', section: 'archive-belongings-report' },
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
				section = target.section;
			if (section === BELONGING_TYPE_ID && !target.resourceId) return t('archives.belongings.title');
			if (section === 'archive-belongings-report') return t('archives.annualReport');
			if (section === 'archive-designer') return t('archives.designer');
			if (section === 'archive-recovery') return t('archives.recovery');
			if (target.resourceId) {
				const record = application?.runtime.index.get(target.resourceId);
				if (record) return record.name;
			}
			return (
				(section
					? displayLabel(application?.runtime.index.definition(section)?.definition, t('workbench.contacts'))
					: undefined) ?? t('workbench.contacts')
			);
		},
		panel(target): PanelModel {
			const application = source();
			if (!application) return { sections: [] };
			void application.runtime.ensureLoaded().catch((error) => console.error('[HUHU archives]', error));
			const index = application.runtime.index,
				catalog = index.catalog(),
				selected = target.resourceId ? index.get(target.resourceId) : undefined,
				section = target.section;
			return {
				searchable: true,
				sections: [
					{
						id: 'archives-views',
						title: t('archives.views'),
						items: catalog.views.map((view) => ({
							id: view.definition.id,
							label: displayLabel(view.definition),
							icon: 'table',
							target: { feature: 'contacts' as const, section: view.definition.id },
						})),
					},
					{
						id: 'archives-tools',
						title: t('archives.management'),
						items: [
							...(!catalog.types.some((type) => type.id === BELONGING_TYPE_ID && type.enabled)
								? [
										{
											id: 'archives-belongings',
											label: t('archives.belongings.title'),
											icon: 'package',
											target: { feature: 'contacts' as const, section: BELONGING_TYPE_ID },
										},
									]
								: []),
							{
								id: 'archive-designer',
								label: t('archives.designer'),
								icon: 'sliders-horizontal',
								target: { feature: 'contacts', section: 'archive-designer' },
							},
							{
								id: 'archive-belongings-report',
								label: t('archives.annualReport'),
								icon: 'chart-column',
								target: { feature: 'contacts', section: 'archive-belongings-report' },
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
					emptyText: t(application.runtime.loading ? 'contacts.loading' : 'contacts.empty'),
					nodes: [],
					data: {
						pageSize: 100,
						async load({ search, limits }: { search: string; limits: Readonly<Record<string, number>> }) {
							await application.runtime.ensureLoaded();
							const index = application.runtime.index,
								selected = target.resourceId ? index.get(target.resourceId) : undefined;
							const nodes = [],
								pages = [];
							for (const type of index
								.catalog()
								.types.filter(
									(type) => type.enabled || type.id === selected?.typeId || type.id === section,
								)) {
								const given = limits[type.id];
								const requested =
									typeof given === 'number' && Number.isSafeInteger(given) && given > 0 ? given : 100;
								const typeMatch =
									!!search.trim() &&
									displayLabel(type).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
								const records = [];
								let total = 0;
								for (let offset = 0; offset < requested; offset += 500) {
									const page = index.query({
										typeId: type.id,
										search: typeMatch ? undefined : search,
										offset,
										limit: Math.min(500, requested - offset),
									});
									total = page.total;
									records.push(...page.items);
									if (offset + page.items.length >= total) break;
								}
								const loaded = records.length;
								if (
									selected?.typeId === type.id &&
									selected.lifecycle !== 'archived' &&
									!records.some((record) => record.id === selected.id) &&
									(!search.trim() ||
										typeMatch ||
										`${selected.name}\n${canonical(selected.values)}`
											.toLocaleLowerCase()
											.includes(search.trim().toLocaleLowerCase()))
								)
									records.push(selected);
								if (!search.trim() || typeMatch || total) {
									nodes.push({
										id: type.id,
										label: displayLabel(type),
										icon: type.icon,
										badge: type.count,
										children: records.map((record) => ({
											id: record.id,
											label: record.name,
											avatar: [...record.name][0] ?? '?',
										})),
									});
									pages.push({ id: type.id, label: displayLabel(type), loaded, total });
								}
							}
							return { nodes, pages };
						},
					},
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
