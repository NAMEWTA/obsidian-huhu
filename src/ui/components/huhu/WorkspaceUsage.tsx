import type { UsageSnapshot } from '../../../app/contracts/workbench';
import { t } from '../../../shared/i18n';
import { AgentIcon } from './AgentIcon';
import { Button } from '../button';

/** Shared transport-only view for the status bar and dashboard. It never renders account percentages. */
export function WorkspaceUsage({
	value,
	onProvider,
}: {
	value: NonNullable<UsageSnapshot['workspace']>;
	onProvider?: (id: string) => void;
}) {
	const number = (value: number) =>
		new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
	return (
		<div className="flex h-full min-h-0 flex-col gap-3" data-workspace-usage>
			<div className="flex min-w-0 items-baseline justify-between gap-2">
				<span className="truncate text-xs text-muted-foreground" title={value.root}>
					{value.root.split(/[\\/]/).filter(Boolean).at(-1)}
				</span>
				<span className="text-xs text-muted-foreground">{t('shell.workspaceUsage')}</span>
			</div>
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<strong className="text-2xl font-semibold tabular-nums">
					{value.knownSessions ? number(value.total) : '—'}{' '}
					<span className="text-xs font-normal text-muted-foreground">{t('shell.tokens')}</span>
				</strong>
				<span className="text-xs text-muted-foreground">
					{t('shell.workspaceSessions', { count: value.sessions })}
				</span>
			</div>
			{value.error ? (
				<p role="alert" className="m-0 text-xs text-destructive">
					{value.error}
				</p>
			) : null}
			<div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
				{value.providers.map((provider) => (
					<Button
						key={provider.id}
						variant="ghost"
						className="flex w-full justify-between gap-2 px-1 text-xs"
						onClick={() => onProvider?.(provider.id)}
					>
						<span className="flex min-w-0 items-center gap-2">
							<AgentIcon agent={provider.id === 'gemini' ? 'gemini-cli' : provider.id} size={14} />
							<span className="truncate">{provider.name}</span>
						</span>
						<span className="tabular-nums">{provider.knownSessions ? number(provider.total) : '—'}</span>
					</Button>
				))}
			</div>
			{value.knownSessions < value.sessions ? (
				<span className="text-xs text-muted-foreground">
					{t('shell.workspaceUnknown', { count: value.sessions - value.knownSessions })}
				</span>
			) : null}
		</div>
	);
}
