// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/status-bar/StatusBarSurface.tsx
import { useCallback, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import type { UsageSnapshot, UsageStatusHandle, UsageStatusProps } from '../../app/contracts/workbench';
import { t } from '../../shared/i18n';
import { ContainerProviders } from '../../ui/react/providers';
import { Button } from '../../ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../ui/components/dropdown-menu';
import { ProviderSegment, maxUsed, usageTone } from './ProviderSegment';
import { UsageRosterPanel } from './UsageRosterPanel';
import { planUsage } from './usage-plan';
import { WorkspaceUsage } from '../../ui/components/huhu/WorkspaceUsage';

const empty: UsageSnapshot = { providers: [], refreshing: false };

/** Usage entry of the Obsidian status bar: icon and percentage, with the roster panel on click. */
export function UsageStatusItem({ usage, preferences, onPreferences, navigate, report }: UsageStatusProps) {
	const [open, setOpen] = useState(false);
	const snapshot = useSyncExternalStore(
		useCallback((listener) => usage.subscribe(listener), [usage]),
		() => usage.snapshot() ?? empty,
	);
	if (snapshot.workspace)
		return (
			<DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="h-5 gap-1 rounded px-1 py-0.5 text-xs font-normal"
						aria-label={t('shell.workspaceUsage')}
						data-hit-control
					>
						{snapshot.workspace.knownSessions
							? new Intl.NumberFormat(undefined, {
									notation: 'compact',
									maximumFractionDigits: 1,
								}).format(snapshot.workspace.total)
							: '—'}{' '}
						{t('shell.tokens')}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="top" align="end" className="w-80 max-w-[calc(100vw-16px)] p-3">
					<WorkspaceUsage
						value={snapshot.workspace}
						onProvider={(id) => navigate({ feature: 'terminal', section: 'usage', resourceId: id })}
					/>
					<Button
						variant="ghost"
						className="mt-2 w-full"
						disabled={snapshot.refreshing}
						onClick={() => {
							void usage.refresh().catch(report);
						}}
					>
						{t('shell.refreshUsage')}
					</Button>
					<Button
						variant="ghost"
						className="w-full"
						onClick={() => navigate({ feature: 'terminal', section: 'usage' })}
					>
						{t('shell.usageDetails')}
					</Button>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	if (!snapshot.providers.length) return null;
	const { shown, hidden } = planUsage(snapshot.providers, preferences.usageMode);
	return (
		<DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-5 gap-3 rounded px-1 py-0.5 text-xs font-normal hover:bg-accent/70"
					aria-label={t('shell.usage')}
					data-hit-control
				>
					{preferences.usageMode === 'verbose' && (
						<span className="text-2xs text-muted-foreground">
							{t(preferences.usageDisplay === 'used' ? 'shell.used' : 'shell.remaining')}
						</span>
					)}
					{shown.map((provider) => (
						<span key={provider.id} data-usage-chip={provider.id} className="inline-flex">
							<ProviderSegment
								provider={provider}
								mode={preferences.usageMode}
								display={preferences.usageDisplay}
								refreshing={snapshot.refreshing}
							/>
						</span>
					))}
					{!!hidden.length && (
						<span
							data-usage-more
							title={hidden.map((p) => p.name).join(' · ')}
							className={`h-4 rounded-full border px-1.5 text-2xs ${usageTone(Math.max(...hidden.map(maxUsed)))}`}
						>
							+{hidden.length}
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="top"
				align="end"
				sideOffset={8}
				collisionPadding={8}
				className="w-[360px] max-w-[calc(100vw-16px)] p-0"
			>
				<UsageRosterPanel
					selectAccount={(provider, id) => {
						void usage.selectAccount?.(provider, id).catch(report);
					}}
					snapshot={snapshot}
					preferences={preferences}
					onPreferences={onPreferences}
					refresh={() => {
						void usage.refresh().catch(report);
					}}
					navigate={navigate}
				/>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** Mounts the usage entry into a status bar item; the returned handle re-renders and unmounts it. */
export function mountUsageStatus(item: HTMLElement, props: UsageStatusProps): UsageStatusHandle {
	const container = item.createDiv({ cls: 'huhu-ui huhu-status-usage-root' });
	const root = createRoot(container);
	const render = (next: UsageStatusProps) =>
		root.render(
			<ContainerProviders container={container}>
				<UsageStatusItem {...next} />
			</ContainerProviders>,
		);
	render(props);
	return {
		update: render,
		dispose: () => {
			root.unmount();
			container.remove();
		},
	};
}
