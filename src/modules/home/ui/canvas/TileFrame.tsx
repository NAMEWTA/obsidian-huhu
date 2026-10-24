import { useStore } from 'zustand';
import { useT } from '../../../../ui/react/hooks';
import type { BoardTileSource } from '../../core/board/board-tiles';
import { widgetProviderKey } from '../../core/board/widget-registry';
import { supportedTiers } from '../../core/board/widget-catalog';
import type { HomeWidgetTier } from '../../core/board/widget-tiers';
import type { BoardStore } from '../../services/board-store';
import { homeServices } from '../../services/instances';
import { Card } from '../cards/Card';
import { Section } from '../sections/Section';
import { useWidgetBackground } from '../widgets/WidgetBackground';
import { ExternalWidget } from './ExternalWidget';
import { WidgetCard } from './WidgetCard';
import { hasTiers, kindOfSource, type TileKind } from './canvas-model';
import { WIDGET_COMPONENTS, WIDGET_FRAME } from './widget-components';

/** The widget kinds whose card carries a picture behind it, by the key the background settings use. */
const BACKGROUND_KEY: Readonly<Record<string, string>> = {
	'quick-actions': 'quickActions',
	'year-progress': 'yearProgress',
	pomodoro: 'pomodoro',
	habit: 'habit',
	music: 'music',
};

export interface TileFrameProps {
	store: BoardStore;
	source: BoardTileSource;
	kind: TileKind | undefined;
	/** The name the card shows: the user's own title first, then the kind's, a section's or a card's name. */
	label: string;
	current: HomeWidgetTier | undefined;
	mobile: boolean;
	narrow: boolean;
	/** Provider registry revision: the view re-resolves its provider when it changes. */
	catalog: number;
	canConfigure: boolean;
	onTier(this: void, tier: HomeWidgetTier): void;
	onConfigure(this: void): void;
	onRemove(this: void): void;
	onMove(this: void, dx: number, dy: number): void;
	onResize(this: void, dw: number, dh: number): void;
}

/** One tile of the board: the card around the view that source names. Every tile kind uses the same frame. */
export function TileFrame(props: TileFrameProps) {
	const { store, source, kind, label, current, mobile, narrow, catalog, canConfigure, ...actions } = props;
	const frame = source.type === 'widget' && source.member.provider === 'home' ? WIDGET_FRAME[source.member.kind] : undefined;
	const data = useStore(store.state, (state) => state.data)!;
	const rename =
		source.type === 'section'
			? (value: string) =>
					store.sync.renameColumn(
						source.column.name,
						value,
						data.columns.findIndex((c) => c.id === source.column.id || c.name === source.column.name),
					)
			: source.type === 'card'
				? (value: string) => store.sync.updateCard(source.card.id, { title: value })
				: undefined;
	const background = useWidgetBackground(
		store,
		source.type === 'widget' && source.member.provider === 'home'
			? (BACKGROUND_KEY[source.member.kind] ?? '')
			: '',
		{ frame: false },
	);
	return (
		<WidgetCard
			title={label}
			icon={kind?.icon}
			chrome={frame?.chrome}
			bleed={frame?.bleed}
			background={background.layer ? background : undefined}
			onRename={rename}
			tiers={kind && hasTiers(source) ? supportedTiers(kind) : []}
			current={current}
			canConfigure={canConfigure}
			narrow={narrow}
			{...actions}
		>
			<TileContent store={store} source={source} kind={kind} mobile={mobile} catalog={catalog} />
		</WidgetCard>
	);
}

function TileContent({
	store,
	source,
	kind,
	mobile,
	catalog,
}: {
	store: BoardStore;
	source: BoardTileSource;
	kind: ReturnType<typeof kindOfSource>;
	mobile: boolean;
	catalog: number;
}) {
	const t = useT();
	if (source.type === 'section')
		return <Section store={store} column={{ ...source.column, half: false, height: undefined }} />;
	if (source.type === 'card') return <Card store={store} card={source.card} index={0} immersive />;
	if (source.type === 'widget') {
		const { member } = source;
		const entryId = member.instanceId === 'default' ? undefined : member.instanceId;
		const Component = member.provider === 'home' ? WIDGET_COMPONENTS[member.kind] : undefined;
		if (Component) return <Component store={store} entryId={entryId} />;
		// `catalog` is the provider registry's change counter: it is what makes this lookup re-run.
		const live =
			catalog < 0
				? undefined
				: homeServices.widgets?.byKey.get(widgetProviderKey(member.provider, member.kind))?.kind;
		const listed = catalog >= 0 && !!live?.instances().some((item) => item.id === member.instanceId);
		// An instance the provider no longer lists keeps its place on the board but its view is released.
		if (live && listed)
			return (
				<ExternalWidget store={store} kind={live} memberId={member.memberId} instanceId={member.instanceId} />
			);
		void mobile;
		return (
			<p className="m-0 text-xs text-muted-foreground">
				{t(kind ? 'home.widget.instanceMissing' : 'home.widget.unavailable')}
			</p>
		);
	}
	return <p className="m-0 text-xs text-muted-foreground">{t('renderer.missingTile')}</p>;
}
