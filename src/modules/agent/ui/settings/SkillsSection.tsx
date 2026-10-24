// Card layout, per-agent toggles and update affordance adapted from xingkongliang/skills-manager 7f92c21 (MIT), Copyright (c) 2026 Tianliang Zhang: src/views/MySkills.tsx, src/components/SyncDots.tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { toast } from 'sonner';
import { ChevronRight, Folder, FolderOpen, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Textarea } from '../../../../ui/components/textarea';
import { Badge } from '../../../../ui/components/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../../ui/components/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../../ui/components/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
	AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../../../ui/components/alert-dialog';
import { buttonVariants } from '../../../../ui/components/button';
import { AgentIcon } from '../../../../ui/components/huhu/AgentIcon';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { SegmentedControl, SettingsRow } from '../../../../ui/components/huhu/SettingsFormControls';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { cn } from '../../../../ui/lib/utils';
import { useT } from '../../../../ui/react/hooks';
import type { SettingsHandle } from '../../../../shared/settings/store';
import { AGENT_CATALOG } from '../../core/launch/catalog';
import { SKILL_TARGET_ORDER, SkillError, filterRecords, skillCell, type SkillRecord, type SkillScope, type SkillTargetId } from '../../core/skills/library';
import type { TerminalSettings } from '../../core/terminal/settings';
import { pendingId, type SkillManager } from '../../services/skill-manager';
import { useAgentSettings } from './settings-context';

const MONOGRAMS: Partial<Record<SkillTargetId, string>> = { grok: 'GK', opencode: 'OC', pi: 'PI' };

function TargetGlyph({ target }: { target: SkillTargetId }) {
	if (target === 'agents') return <Folder className="size-4" aria-hidden />;
	if (target === 'claude-code' || target === 'codex' || target === 'gemini') return <AgentIcon agent={target} size={16} />;
	return <span aria-hidden className="text-3xs font-semibold leading-none">{MONOGRAMS[target] ?? target.slice(0, 2).toUpperCase()}</span>;
}

/** The text input and remembered names that exist beside discovery: extra directories for the picker and names saved by buttons. */
export function SkillsAdvanced({ handle, desktop, onChanged }: { handle: SettingsHandle<TerminalSettings>; desktop: boolean; onChanged?: () => void }) {
	const t = useT(),
		settings = useAgentSettings(handle);
	const report = (error: unknown) => { toast.error(error instanceof Error ? error.message : String(error)); };
	return (
		<>
			{desktop ? (
				<label className="block space-y-2 text-sm">
					{t('agent.skills.directories')}
					<Textarea
						defaultValue={settings.skillDirectories.join('\n')}
						onBlur={(e) => {
							const next = e.target.value.split('\n').map((p) => p.trim()).filter(Boolean);
							if (next.join('\n') === settings.skillDirectories.join('\n')) return;
							void handle.update((d) => { d.skillDirectories = next; }).then(() => onChanged?.()).catch(report);
						}}
					/>
					<span className="block text-xs text-muted-foreground">{t('agent.skills.directoriesHint')}</span>
				</label>
			) : (
				<p className="text-sm text-muted-foreground">{t('agent.skills.mobile')}</p>
			)}
			{AGENT_CATALOG.filter((a) => settings.knownSkills[a.id]?.length).map((a) => (
				<SettingsRow
					key={a.id}
					label={t('agent.skills.remembered', { name: a.title })}
					description={settings.knownSkills[a.id]?.join(', ')}
					control={
						<Button variant="ghost" onClick={() => { void handle.update((d) => { delete d.knownSkills[a.id]; }).catch(report); }}>
							{t('agent.skills.clear')}
						</Button>
					}
				/>
			))}
		</>
	);
}

type Confirm = { record: SkillRecord; target: SkillTargetId; dir: string };

export function SkillsSection({ manager, handle }: { manager: SkillManager; handle: SettingsHandle<TerminalSettings> }) {
	const t = useT(),
		state = useStore(manager.state),
		[query, setQuery] = useState(''),
		[scope, setScope] = useState<SkillScope | 'all'>('all'),
		[confirm, setConfirm] = useState<Confirm>(),
		[advanced, setAdvanced] = useState(false);
	useEffect(() => { void manager.refresh(); }, [manager]);
	const titles = useMemo(() => ({ agents: t('agent.skills.target.agents'), ...Object.fromEntries(AGENT_CATALOG.map((a) => [a.id, a.title])) }) as Record<SkillTargetId, string>, [t]);
	const visible = useMemo(() => filterRecords(state.records, query, scope), [state.records, query, scope]);
	const message = (error: unknown): string => error instanceof SkillError ? t(`agent.skills.error.${error.code}`) : error instanceof Error ? error.message : String(error);
	const run = (task: Promise<void>) => { task.catch((error: unknown) => { toast.error(message(error)); }); };
	const toggle = (record: SkillRecord, target: SkillTargetId, permanent = false) => {
		const cell = skillCell(record, target);
		manager.toggle(record.key, target, { permanent }).catch((error: unknown) => {
			// Without a system trash the copy is only deleted after the user agrees.
			if (error instanceof SkillError && error.code === 'trash-failed' && (cell.state === 'copy' || cell.state === 'stale')) setConfirm({ record, target, dir: cell.location.dir });
			else toast.error(message(error));
		});
	};
	const openable = useMemo(() => {
		const dirs = new Map<string, string>();
		for (const root of state.roots) if (root.target === 'agents' || state.records.some((r) => r.locations.some((l) => l.root === root.dir))) dirs.set(root.dir, `${titles[root.target as SkillTargetId] ?? root.target} · ${t(`agent.skills.scope.${root.scope}`)}`);
		return [...dirs];
	}, [state.roots, state.records, titles, t]);
	return (
		<div className="space-y-6" data-skills-manager="">
			<SettingsSection title={t('agent.skills.heading')} description={t('agent.skills.intro')}>
				<div className="flex flex-wrap items-center gap-2">
					<div className="relative min-w-40 flex-1">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
						<Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('agent.skills.search')} aria-label={t('agent.skills.search')} className="pl-8" />
					</div>
					<SegmentedControl
						value={scope}
						onChange={setScope}
						ariaLabel={t('agent.skills.scope')}
						options={[
							{ value: 'all', label: t('agent.skills.scope.all') },
							{ value: 'global', label: t('agent.skills.scope.global') },
							{ value: 'vault', label: t('agent.skills.scope.vault') },
						]}
					/>
					<Button variant="outline" size="icon" aria-label={t('agent.skills.refresh')} title={t('agent.skills.refresh')} disabled={state.loading} onClick={() => run(manager.refresh())}>
						<RefreshCw className={cn(state.loading && 'animate-spin')} />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon" aria-label={t('agent.skills.openFolder')} title={t('agent.skills.openFolder')}>
								<FolderOpen />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{openable.map(([dir, label]) => (
								<DropdownMenuItem key={dir} title={dir} onSelect={() => run(manager.open(dir))}>
									<span className="font-medium">{label}</span>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				{state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
				{state.unavailable.length > 0 && (
					<p className="text-xs text-muted-foreground" title={state.unavailable.join('\n')}>{t('agent.skills.unavailable', { count: state.unavailable.length })}</p>
				)}
				{visible.length === 0 ? (
					<EmptyState
						size="sm"
						title={state.loaded && !state.loading ? t('agent.skills.empty') : t('agent.skills.loading')}
						description={state.loaded && !state.loading ? t('agent.skills.emptyHint') : undefined}
					/>
				) : (
					<div className="@container">
						<ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 @4xl:grid-cols-2">
							{visible.map((record) => (
								<SkillCard key={record.key} record={record} titles={titles} pending={state.pending} onToggle={(target) => toggle(record, target)} onUpdate={() => run(manager.update(record.key))} onOpen={(dir) => run(manager.open(dir))} />
							))}
						</ul>
					</div>
				)}
			</SettingsSection>
			<Collapsible open={advanced} onOpenChange={setAdvanced}>
				<CollapsibleTrigger variant="row">
					<span className="flex items-center gap-1.5"><ChevronRight className={cn('size-4 transition-transform', advanced && 'rotate-90')} aria-hidden />{t('agent.skills.advanced')}</span>
				</CollapsibleTrigger>
				<CollapsibleContent className="space-y-3 pt-2">
					<SkillsAdvanced handle={handle} desktop onChanged={() => run(manager.refresh())} />
				</CollapsibleContent>
			</Collapsible>
			<AlertDialog open={!!confirm} onOpenChange={(open) => { if (!open) setConfirm(undefined); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('agent.skills.disableTitle', { name: confirm?.record.name ?? '' })}</AlertDialogTitle>
						<AlertDialogDescription>{t('agent.skills.deleteFallback', { path: confirm?.dir ?? '' })}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('ui.cancel')}</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: 'destructive' })}
							onClick={() => {
								const current = confirm;
								setConfirm(undefined);
								if (current) toggle(current.record, current.target, true);
							}}
						>
							{t('agent.skills.deletePermanently')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function SkillCard({ record, titles, pending, onToggle, onUpdate, onOpen }: {
	record: SkillRecord;
	titles: Record<SkillTargetId, string>;
	pending: readonly string[];
	onToggle: (target: SkillTargetId) => void;
	onUpdate: () => void;
	onOpen: (dir: string) => void;
}) {
	const t = useT();
	const cells = SKILL_TARGET_ORDER.map((target) => ({ target, cell: skillCell(record, target) }));
	const enabled = cells.some(({ cell }) => cell.state !== 'off');
	const stale = cells.some(({ cell }) => cell.state === 'stale');
	const updating = pending.includes(pendingId(record, '*'));
	const source = record.source;
	return (
		<li className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/50 bg-card p-3 text-card-foreground shadow-xs" data-skill={record.name}>
			<div className="flex min-w-0 items-center gap-2">
				<span aria-hidden className={cn('size-2 shrink-0 rounded-full', enabled ? 'bg-status-success' : 'bg-muted-foreground/40')} />
				<span className="min-w-0 flex-1 truncate text-sm font-medium" title={record.name}>{record.name}</span>
				<Badge variant="outline" className="shrink-0">{t(`agent.skills.scope.${record.scope}`)}</Badge>
				{stale && (
					<Button size="xs" variant="secondary" disabled={updating} title={t('agent.skills.updateHint')} onClick={onUpdate}>
						{updating && <Loader2 className="animate-spin" />}
						{t('agent.skills.update')}
					</Button>
				)}
			</div>
			<p className="m-0 line-clamp-2 min-h-8 text-xs text-muted-foreground" title={record.description || undefined}>
				{record.description || t('agent.skills.noDescription')}
			</p>
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
				<div className="flex min-w-0 max-w-full items-center gap-1 text-xs text-muted-foreground">
					<Button variant="ghost" size="icon-xs" aria-label={t('agent.skills.openSkill', { name: record.name })} title={source?.dir ?? record.locations[0]!.dir} onClick={() => onOpen((source ?? record.locations[0]!).dir)}>
						<FolderOpen />
					</Button>
					<span className="min-w-0 truncate" title={source?.dir}>
						{source ? t('agent.skills.source', { name: titles[source.target as SkillTargetId] ?? t('agent.skills.target.extra') }) : t('agent.skills.sourceMissing')}
					</span>
				</div>
				<div className="ml-auto flex items-center gap-1" role="group" aria-label={t('agent.skills.agents')}>
					{cells.map(({ target, cell }) => (
						<TargetButton key={target} record={record} target={target} title={titles[target]} cell={cell} busy={pending.includes(pendingId(record, target))} onToggle={() => onToggle(target)} />
					))}
				</div>
			</div>
		</li>
	);
}

function TargetButton({ record, target, title, cell, busy, onToggle }: {
	record: SkillRecord;
	target: SkillTargetId;
	title: string;
	cell: ReturnType<typeof skillCell>;
	busy: boolean;
	onToggle: () => void;
}) {
	const t = useT();
	const on = cell.state !== 'off';
	const locked = cell.state === 'manual' || (cell.state === 'off' && !record.source);
	const hint =
		cell.state === 'manual' ? t(cell.origin ? 'agent.skills.state.origin' : 'agent.skills.state.manual', { agent: title })
		: cell.state === 'copy' ? t('agent.skills.state.copy', { agent: title })
		: cell.state === 'stale' ? t('agent.skills.state.stale', { agent: title })
		: record.source ? t('agent.skills.state.off', { agent: title }) : t('agent.skills.state.noSource', { agent: title });
	const button: ReactNode = (
		<button
			type="button"
			data-hit-control
			data-target={target}
			data-state={cell.state}
			aria-label={hint}
			aria-pressed={on}
			aria-disabled={locked || busy}
			onClick={() => { if (!locked && !busy) onToggle(); }}
			className={cn(
				'relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border outline-none transition-[transform,opacity] focus-visible:ring-[3px] focus-visible:ring-ring/50',
				on ? 'border-border bg-accent text-accent-foreground' : 'border-transparent text-muted-foreground opacity-50 hover:opacity-100',
				cell.state === 'manual' && 'cursor-default border-dashed',
				locked && cell.state === 'off' && 'cursor-not-allowed',
			)}
		>
			{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <TargetGlyph target={target} />}
			{cell.state === 'stale' && <span aria-hidden className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-status-warning" />}
		</button>
	);
	return (
		<Tooltip>
			<TooltipTrigger asChild>{button}</TooltipTrigger>
			<TooltipContent>{hint}</TooltipContent>
		</Tooltip>
	);
}
