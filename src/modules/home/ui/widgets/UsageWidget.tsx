import { useEffect, useSyncExternalStore } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { IconButton } from '../board/controls';
import { Progress } from '../../../../ui/components/progress';
import { AgentIcon } from '../../../../ui/components/huhu/AgentIcon';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useOwnerDocument, useVisible } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import type { UsageProvider, UsageSnapshot } from '../../../../app/contracts/workbench';
import type { AgentUsage } from '../../../agent/api';
import {
	maxUsed,
	rankProviders,
	resetIn,
	resetUnits,
	usageStatusKey,
	shownPercent,
	usageTone,
	type ResetIn,
	type UsageTone,
} from '../../core/board/usage-view';
import type { BoardStore } from '../../services/board-store';
import { useClock } from '../board/hooks';
import { WidgetActions } from '../canvas/widget-frame';
import { WorkspaceUsage } from '../../../../ui/components/huhu/WorkspaceUsage';

const TONE_TEXT: Record<UsageTone, string> = {
	normal: 'text-muted-foreground',
	warning: 'text-status-warning',
	danger: 'text-destructive',
};
const TONE_BAR: Record<UsageTone, string> = {
	normal: '',
	warning: '[&_[data-slot=progress-indicator]]:bg-status-warning',
	danger: '[&_[data-slot=progress-indicator]]:bg-destructive',
};

const none = () => undefined;

/** The agent module's quota service while it is active, with its latest snapshot. */
function useAgentUsage(store: BoardStore): { usage: AgentUsage | undefined; snapshot: UsageSnapshot | undefined } {
	const { usage: current, watchUsage } = store.widgets,
		doc = useOwnerDocument(),
		visible = useVisible(),
		usage = useSyncExternalStore(
			(listener: () => void) => watchUsage?.(listener) ?? none,
			() => current?.(),
		),
		snapshot = useSyncExternalStore(
			(listener: () => void) => usage?.subscribe(listener) ?? none,
			() => usage?.snapshot(),
		);
	useEffect(() => {
		const win = doc.defaultView;
		return win && visible ? usage?.observeWindow?.(win) : undefined;
	}, [doc, usage, visible]);
	return { usage, snapshot };
}

function Bar({ used, display = 'used' }: { used: number; display?: 'used' | 'remaining' }) {
	const tone = usageTone(used);
	return (
		<Progress
			value={shownPercent(used, display)}
			aria-hidden
			className={`h-1.5 min-w-8 flex-1 bg-muted ${TONE_BAR[tone]}`}
		/>
	);
}

function resetText(t: ReturnType<typeof useT>, reset: ResetIn): string {
	const { key, values } = resetUnits(reset);
	return t(key, values);
}

function ProviderName({ provider }: { provider: UsageProvider }) {
	return (
		<>
			<AgentIcon agent={provider.id === 'gemini' ? 'gemini-cli' : provider.id} size={14} className="shrink-0" />
			<span className="min-w-0 truncate font-medium">
				{provider.name}
				{provider.account && <span className="font-normal text-muted-foreground"> · {provider.account}</span>}
			</span>
		</>
	);
}

function Percent({ used }: { used: number }) {
	return (
		<span className={`shrink-0 text-xs tabular-nums ${TONE_TEXT[usageTone(used)]}`}>
			{shownPercent(used, 'used')}%
		</span>
	);
}

/** Rows after the first stay out of the smallest tile; the per-window bars appear once the tile is tall. */
const FIRST_ONLY = '[@container(max-width:20rem)_and_(max-height:12.5rem)]:hidden';
const WHEN_TALL = 'hidden [@container(min-height:12.5rem)]:flex';
const ONLY_SHORT = '[@container(min-height:12.5rem)]:hidden';

/** One provider: name and top share with one bar for the busiest quota window, then (tall) a bar per window. */
function ProviderRow({ provider, first, now }: { provider: UsageProvider; first: boolean; now: number }) {
	const t = useT(),
		used = maxUsed(provider),
		reset = resetIn(
			provider.windows.flatMap((window) => (window.resetsAt ? [window.resetsAt] : [])),
			now,
		);
	return (
		<li
			className={`flex min-w-0 flex-col gap-1 ${first ? '' : FIRST_ONLY}`}
			data-usage-provider={provider.id}
			data-usage-first={first || undefined}
		>
			<div className="flex min-w-0 items-center gap-2 text-sm">
				<ProviderName provider={provider} />
				<span className="flex-1" />
				{provider.windows.length ? (
					<Percent used={used} />
				) : (
					<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
						{provider.failed && <TriangleAlert className="size-3" />}
						{provider.statusLabel ?? t(usageStatusKey(provider.status))}
					</span>
				)}
				{provider.stale && provider.windows.length > 0 && (
					<TriangleAlert className="size-3 shrink-0 text-muted-foreground" aria-label={t('usage.stale')} />
				)}
			</div>
			{provider.windows.length > 0 && (
				<div className={`items-center gap-2 ${ONLY_SHORT} flex`}>
					<Bar used={used} />
					{reset && (
						<span className="shrink-0 text-xs text-muted-foreground">
							{t('usage.resetsIn', { time: resetText(t, reset) })}
						</span>
					)}
				</div>
			)}
			{provider.windows.map((window) => {
				const own = window.resetsAt ? resetIn([window.resetsAt], now) : undefined;
				return (
					<div
						key={window.key ?? window.label}
						className={`items-center gap-2 pl-6 text-xs ${WHEN_TALL}`}
						data-usage-window
					>
						<span className="w-10 shrink-0 truncate text-muted-foreground">{window.label}</span>
						<Bar used={window.usedPercent} />
						<Percent used={window.usedPercent} />
						{own && (
							<span className="hidden shrink-0 text-muted-foreground @[26rem]:inline">
								{resetText(t, own)}
							</span>
						)}
					</div>
				);
			})}
		</li>
	);
}

/** Provider quotas from the agent module: the busiest provider in the smallest tile, every provider from the medium one, every window when tall. */
export function UsageWidget({ store }: { store: BoardStore }) {
	const t = useT(),
		{ usage, snapshot } = useAgentUsage(store),
		now = useClock(60_000),
		providers = rankProviders(snapshot?.providers ?? []),
		refreshing = snapshot?.refreshing ?? false;
	if (snapshot?.workspace)
		return (
			<div className="flex h-full min-h-0 flex-col" data-usage>
				<WidgetActions>
					<IconButton
						label={t('usage.refresh')}
						disabled={refreshing}
						onClick={() => {
							void usage?.refresh();
						}}
					>
						<RefreshCw className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />
					</IconButton>
				</WidgetActions>
				<WorkspaceUsage value={snapshot.workspace} />
			</div>
		);
	return (
		<div className="flex h-full min-h-0 flex-col" data-usage>
			{usage && (
				<WidgetActions>
					<IconButton
						label={t('usage.refresh')}
						disabled={refreshing}
						onClick={() => {
							void usage.refresh().catch(() => undefined);
						}}
					>
						<RefreshCw className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />
					</IconButton>
				</WidgetActions>
			)}
			{!usage ? (
				<EmptyState
					className="h-full"
					size="sm"
					icon={<TriangleAlert />}
					title={t('usage.unavailable')}
					description={t('usage.unavailableHint')}
					descriptionClassName="hidden [@container(min-height:12.5rem)]:block"
				/>
			) : providers.length === 0 ? (
				<EmptyState
					className="h-full"
					size="sm"
					title={t('usage.empty')}
					description={t('usage.emptyHint')}
					descriptionClassName="hidden [@container(min-height:12.5rem)]:block"
				/>
			) : (
				<ul className="m-0 flex min-h-0 min-w-0 flex-1 list-none flex-col justify-center gap-3 overflow-auto p-0">
					{providers.map((provider, index) => (
						<ProviderRow key={provider.id} provider={provider} first={index === 0} now={now} />
					))}
				</ul>
			)}
		</div>
	);
}
