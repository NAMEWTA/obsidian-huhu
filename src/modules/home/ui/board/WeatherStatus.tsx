import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';
import { cn } from '../../../../ui/lib/utils';
import type { WeatherView } from './weather-state';

/** The whole weather request budget the store enforces (BoardStore.weather), in seconds, so the wait is never open-ended. */
const BUDGET_SECONDS = 27;

/**
 * What the weather tile says about its request: one persistent line (never a toast) with the actions that fit the
 * state. The forecast itself, when there is an older one, stays where the tile draws it.
 */
export function WeatherStatus({
	view,
	time,
	onRetry,
	onConfigure,
	onCancel,
	className,
}: {
	view: WeatherView;
	/** When the forecast on screen was fetched, already formatted for the reader. */
	time: string;
	onRetry(this: void): void;
	onConfigure(this: void): void;
	onCancel(this: void): void;
	className?: string;
}) {
	const t = useT();
	const busy = view.kind === 'loading' || view.kind === 'refreshing';
	const message = (() => {
		switch (view.kind) {
			case 'loading':
				return `${t('weather.state.loading', { seconds: BUDGET_SECONDS })} ${t(`weather.stage.${view.stage}`)}`;
			case 'refreshing':
				return t('weather.state.refreshing', { time });
			case 'ready':
				return view.stale ? t('weather.state.outdated', { time }) : t('weather.stale', { time });
			case 'error':
				return t(`weather.error.${view.code}`);
			default:
				return t(`weather.state.${view.kind}`);
		}
	})();
	const actions: [string, () => void][] = [];
	if (view.kind === 'unconfigured') actions.push(['weather.configure', onConfigure]);
	if (busy) actions.push(['weather.cancel', onCancel]);
	if (view.kind === 'error' || view.kind === 'cancelled' || (view.kind === 'ready' && view.stale)) actions.push(['weather.retry', onRetry]);
	if (view.kind === 'error') actions.push(['weather.configure', onConfigure]);
	return (
		<div
			data-weather-state={view.kind}
			role={view.kind === 'error' ? 'alert' : 'status'}
			aria-busy={busy || undefined}
			className={cn('flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground', view.kind === 'error' && 'border-l-2 border-destructive pl-2 text-foreground', className)}
		>
			<p className="m-0 min-w-0 flex-1 basis-40 break-words">{message}</p>
			{actions.map(([key, run]) => (
				<Button key={key} type="button" size="xs" variant="outline" onClick={run}>
					{t(key)}
				</Button>
			))}
		</div>
	);
}
