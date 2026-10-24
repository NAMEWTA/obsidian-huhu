import { mergeClockWeather } from '../../core/board/clock-weather';
import { t } from '../../../../shared/i18n';
import type { App } from 'obsidian';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
import { huhuName } from '../../../../shared/storage/vault-layout';
import { inboxRoot } from '../vault/memo-files';
import type { DashboardData, DashboardSettings, QuickAction } from '../../core/board/types/model';
import { cardKind } from '../../core/board/card-kind';
import { widgetPresentationKey } from '../../core/board/widget-members';
import { dropItems, renameItems } from '../../core/board/grid';
import { actionKey } from '../../core/board/quick-actions';
import { memoCardText } from './card-move';

function identity(text: string): string {
	let a = 2166136261,
		b = 2246822507;
	for (let i = 0; i < text.length; i++) {
		a = Math.imul(a ^ text.charCodeAt(i), 16777619);
		b = Math.imul(b ^ text.charCodeAt(i), 3266489909);
	}
	return (a >>> 0).toString(16) + (b >>> 0).toString(16);
}
export function needsWidgetConsolidation(data: DashboardData): boolean {
	return (
		!!data.widgets?.some((m) => m.provider === 'home' && m.kind === 'weather') ||
		(data.widgetMigration !== 1 &&
			(!!data.widgets?.some(
				(widget) => widget.provider === 'home' && ['shortcuts', 'quick-notes'].includes(widget.kind),
			) ||
				data.columns.some((column) =>
					column.cards.some(
						(card) =>
							card.type === 'web' ||
							cardKind(column.sectionType ?? column.name.toLowerCase(), card.type) === 'memo',
					),
				)))
	);
}
/** Destination first, byte verification second, source retirement last in SyncEngine's guarded board commit. */
export async function consolidateBoardWidgets(
	app: App,
	path: string,
	data: DashboardData,
	settings: DashboardSettings,
): Promise<DashboardData> {
	if (!needsWidgetConsolidation(data)) return data;
	const combined = mergeClockWeather(data, settings);
	if (data.widgetMigration === 1) return combined;
	data = combined;
	const files = contentFiles(app),
		moved = new Set<string>(),
		actions: QuickAction[] = data.quickActions.map((action, index) => ({
			...action,
			id: action.id ?? `legacy:${identity(`${path}:${index}:${action.type}:${action.target}`)}`,
		}));
	const order = data.quickActionOrder?.map((key) => {
		const old = data.quickActions.findIndex(
			(action) => actionKey(action, false) === key || `c:${action.target}` === key,
		);
		return old >= 0 ? actionKey(actions[old]!, false) : key;
	});
	// Original blocks retain unknown metadata, image embeds, nested tasks and links, without lossy reserialization.
	const blocks = data.document?.source
		.split(/^## /m)
		.slice(1)
		.map((section) => section.split(/^### /m).slice(1));
	for (let ci = 0; ci < data.columns.length; ci++) {
		const column = data.columns[ci]!;
		for (let i = 0; i < column.cards.length; i++) {
			const card = column.cards[i]!;
			if (card.type === 'web') {
				actions.push({
					id: `web:${identity(`${path}:${card.id}`)}`,
					name: card.title,
					icon: 'globe',
					type: 'url',
					target: card.url,
					openIn: card.openIn ?? 'tab',
				});
				// Preserve the original web card alongside the shortcut, including extra notes.
			}
			if (card.type !== 'web' && cardKind(column.sectionType ?? column.name.toLowerCase(), card.type) !== 'memo')
				continue;
			const token = identity(`${path}:${card.id}`),
				target = `${inboxRoot(settings)}/迁移-${token}-${huhuName(card.title)}.md`;
			const original = blocks?.[ci]?.[i];
			const body = original ? `# ${original}` : `# ${card.title}\n${memoCardText(card)}\n`;
			const { rewriteContentLinks } = await import('../../../../host/obsidian/storage/content-link-text');
			const preserved = rewriteContentLinks(body, (link, syntax) => {
				if (!link || link.startsWith('#')) return undefined;
				const destination = files.resolveLink(link, path, syntax);
				if (!destination) return undefined;
				const fragment = link.includes('#') ? link.slice(link.indexOf('#')) : '';
				return (
					'/' +
					(syntax === 'wiki'
						? destination.path
						: destination.path.split('/').map(encodeURIComponent).join('/')) +
					fragment
				);
			});
			const content = `<!-- huhu-migration:${token} -->\n${preserved}`;
			await files.process(target, (existing) => {
				if (existing !== null && existing !== content)
					throw new Error(t('home.migration.changed', { path: target }));
				return content;
			});
			const destination = files.getFileByPath(target);
			if (!destination || (await files.read(destination)) !== content)
				throw new Error(t('home.migration.failed', { path: target }));
			moved.add(card.id);
		}
	}
	const previous = data.widgets ?? [],
		folded = previous.filter(
			(widget) =>
				widget.provider === 'home' && ['shortcuts', 'quick-notes', 'quick-actions'].includes(widget.kind),
		);
	if (folded.some((widget) => widget.kind === 'shortcuts'))
		for (const button of settings.shortcutButtons ?? [])
			actions.push({
				id: `shortcut:${button.id}`,
				name: button.label,
				icon: button.icon,
				type: button.type === 'automation' ? 'action' : button.type,
				target: button.target,
				agentId: button.agentId,
				prompt: button.prompt,
			});
	if (folded.some((widget) => widget.kind === 'quick-notes'))
		for (const preset of settings.quickNotePresets ?? [])
			actions.push({
				id: `note:${preset.id}`,
				name: preset.label,
				icon: preset.icon,
				type: 'note',
				target: preset.id,
				preset: { ...preset },
			});
	const heir =
		folded.find((widget) => widget.kind === 'quick-actions') ??
		(folded[0]
			? { ...folded[0], kind: 'quick-actions' }
			: actions.length
				? {
						memberId: 'home:quick-actions:default',
						provider: 'home',
						kind: 'quick-actions',
						instanceId: 'default',
					}
				: undefined);
	const gone = new Set(folded.map((widget) => `widget:${widgetPresentationKey(widget)}`));
	const widgets = previous.filter((widget) => !folded.includes(widget));
	if (heir) widgets.push(heir);
	let grid = data.grid;
	if (grid && heir && folded[0]) {
		const keep = folded.find((widget) => widget.memberId === heir.memberId) ?? folded[0];
		const old = `widget:${widgetPresentationKey(keep)}`,
			next = `widget:${widgetPresentationKey(heir)}`;
		gone.delete(old);
		grid = renameItems(dropItems(grid, gone), (id) => (id === old ? next : id));
	}
	return {
		...data,
		widgetMigration: 1,
		widgets,
		grid,
		quickActions: actions,
		quickActionOrder: order,
		columns: data.columns.map((column) => ({
			...column,
			cards: column.cards.filter((card) => !moved.has(card.id)),
		})),
	};
}
