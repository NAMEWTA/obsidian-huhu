import { skillGroup, retainSkillAssignments } from '../../core/skills/groups';
import { SkillCard, SkillDetail } from './SkillCard';
import type { LibrarySkill } from '../../services/skill-library';
import { observeBoardAction } from '../board/actions';
// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/skill-section.ts
import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { toast } from 'sonner';
import { ChevronDown, Layers, Columns3, RefreshCw, Settings, Sparkles } from 'lucide-react';
import type { BoardStore } from '../../services/board-store';
import type { DashboardColumn, SkillsSectionConfig } from '../../core/board/types';
import { SkillLibrary } from '../../services/skill-library';
import { Input } from '../../../../ui/components/input';
import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';
import { useVisible } from '../../../../ui/react/contexts';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { IconButton, Choice } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { p1Classes } from '../theme/p1-classes';
import { Pagination, IconChoice } from '../sections/P1Controls';
export function SkillsSection({
	store,
	column,
}: {
	store: BoardStore;
	column: DashboardColumn;
	/** The title bar is reached through `WidgetActions`; kept so callers that still pass it compile. */
	actions?: HTMLElement | null;
}) {
	const isVisible = useVisible();
	const service = useMemo(() => new SkillLibrary(), []);
	useEffect(() => {
		if (!isVisible) return;
		void service.refresh();
		const stop = store.widgets.watchAgents?.(() => void service.refresh());
		return () => {
			stop?.();
			service.dispose();
		};
	}, [service, store, isVisible]);
	const state = useStore(service.state),
		t = useT(),
		config = column.skillsConfig ?? {},
		[search, setSearch] = useState(''),
		[collapsed, setCollapsed] = useState<string[]>([]),
		[groupFilter, setGroupFilter] = useState('_all'),
		[page, setPage] = useState(1),
		[detail, setDetail] = useState<LibrarySkill | null>(null),
		[groupEdit, setGroupEdit] = useState(false),
		[groups, setGroups] = useState(config.groups ?? []);
	const patch = (prefs: Partial<SkillsSectionConfig>) =>
		store.edit((data) => {
			const col = data.columns.find((c) => c.id === column.id && c.name === column.name);
			if (col) col.skillsConfig = { ...col.skillsConfig, ...prefs };
		});
	const groupFor = (name: string) => skillGroup(name, config);
	const filtered = state.entries
		.filter(
			(e) =>
				e.name.toLowerCase().includes(search.toLowerCase()) &&
				(groupFilter === '_all' || groupFor(e.name) === groupFilter),
		)
		.sort(
			(a, b) =>
				Number(config.pinned?.includes(b.name) ?? false) - Number(config.pinned?.includes(a.name) ?? false) ||
				a.name.localeCompare(b.name) * (config.sortDir === 'desc' ? -1 : 1),
		);
	// Curated groups stay complete; only their ungrouped backlog is paginated.
	const paginated = config.groupView ? filtered.filter((entry) => groupFor(entry.name) === '_none') : filtered;
	const size = config.pageSize ?? 50,
		pages = Math.max(1, Math.ceil(paginated.length / size)),
		current = Math.min(page, pages);
	const visible = paginated.slice((current - 1) * size, current * size);
	const pin = (name: string) =>
		observeBoardAction(
			patch({
				pinned: config.pinned?.includes(name)
					? config.pinned.filter((n) => n !== name)
					: [...(config.pinned ?? []), name],
			}),
		);
	const assign = (name: string, group: string) =>
		observeBoardAction(patch({ assignments: { ...config.assignments, [name]: group } }));
	const renderCards = (entries: typeof visible, className = 'dashboard-skillsec-grid') => (
		<div data-card-grid className={p1Classes(className)}>
			{entries.map((entry) => (
				<SkillCard
					key={entry.name}
					store={store}
					entry={entry}
					config={config}
					pinned={config.pinned?.includes(entry.name) ?? false}
					pin={() => {
						void pin(entry.name);
					}}
					detail={() => setDetail(entry)}
					reveal={() => {
						void service.reveal(entry.sources[0]!).catch((e) => toast(String(e)));
					}}
					assign={(group) => {
						void assign(entry.name, group);
					}}
				/>
			))}
		</div>
	);

	return (
		<div data-skills className={p1Classes('dashboard-skillsec-content h-full')}>
			<WidgetActions>
				<IconButton
					label={t('home.pipeline.refresh')}
					disabled={state.loading}
					onClick={() => {
						void service.refresh();
					}}
				>
					<RefreshCw />
				</IconButton>
				<IconButton
					label={t('home.p1.group')}
					onClick={() => {
						setGroups(config.groups ?? []);
						setGroupEdit(true);
					}}
				>
					<Settings />
				</IconButton>
			</WidgetActions>
			<div data-toolbar className="flex shrink-0 flex-wrap items-center gap-2">
				<Input
					data-hit-control
					className="min-w-32 flex-1"
					aria-label={t('skills.searchPh')}
					placeholder={t('skills.searchPh')}
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
				/>
				<IconChoice
					icon="filter"
					label={t('home.p1.group')}
					value={groupFilter}
					options={[
						{ value: '_all', label: t('pm.filterAllStages') },
						...(config.groups ?? []).map((g) => ({ value: g.id, label: g.name })),
						{ value: '_manage', label: t('home.p1.group') },
					]}
					onChange={(value) => {
						if (value === '_manage') {
							setGroups(config.groups ?? []);
							setGroupEdit(true);
						} else {
							setGroupFilter(value);
							setPage(1);
						}
					}}
				/>
				<IconChoice
					icon="arrow-down-up"
					label={t('home.p1.sort')}
					value={config.sortDir ?? 'asc'}
					options={[
						{ value: 'asc', label: t('home.p1.asc') },
						{ value: 'desc', label: t('home.p1.desc') },
					]}
					onChange={(sortDir) => {
						void observeBoardAction(patch({ sortDir: sortDir as 'asc' | 'desc' }));
					}}
				/>
				<Button
					variant="outline"
					size="icon"
					aria-label={t('home.p1.groups')}
					title={t('home.p1.groups')}
					aria-pressed={config.groupView === 'groups'}
					onClick={() => {
						void observeBoardAction(
							patch({ groupView: config.groupView === 'groups' ? undefined : 'groups' }),
						);
					}}
				>
					<Layers />
				</Button>
				<Button
					variant="outline"
					size="icon"
					aria-label={t('home.p1.kanban')}
					title={t('home.p1.kanban')}
					aria-pressed={config.groupView === 'kanban'}
					onClick={() => {
						void observeBoardAction(
							patch({ groupView: config.groupView === 'kanban' ? undefined : 'kanban' }),
						);
					}}
				>
					<Columns3 />
				</Button>
				<Choice
					className="ml-auto w-32 data-[size=sm]:h-9"
					label={t('dataview.pageSize', { count: size })}
					value={String(size)}
					options={[10, 20, 50, 100].map((value) => ({
						value: String(value),
						label: t('dataview.pageSize', { count: value }),
					}))}
					onChange={(value) => {
						setPage(1);
						void observeBoardAction(patch({ pageSize: Number(value) }));
					}}
				/>
			</div>
			<div className={p1Classes('dashboard-skillsec-results')}>
				<div className={p1Classes('dashboard-skillsec-stats')}>
					{t('skills.statSummary', {
						total: String(filtered.length),
						claude: String(
							filtered.filter((e) => e.sources.some((s) => s.target === 'claude-code')).length,
						),
						codex: String(filtered.filter((e) => e.sources.some((s) => s.target === 'codex')).length),
						workbuddy: '0',
					})}
				</div>
				{filtered.length > 0 &&
					(config.groupView ? (
						<div
							className={p1Classes(
								config.groupView === 'kanban'
									? 'dashboard-skillsec-kanban'
									: 'dashboard-skillsec-groups',
							)}
						>
							{[...(config.groups ?? []), { id: '_none', name: t('home.p1.ungrouped') }].map((group) => (
								<section
									data-group-key={group.id}
									className={p1Classes(
										`${config.groupView === 'kanban' ? 'dashboard-skillsec-kcol' : 'dashboard-skillsec-group'} ${collapsed.includes(group.id) ? 'is-collapsed' : ''}`,
									)}
									key={group.id}
									onDragOver={(event) => {
										if (event.dataTransfer.types.includes('application/x-huhu-skill'))
											event.preventDefault();
									}}
									onDrop={(event) => {
										const name = event.dataTransfer.getData('application/x-huhu-skill');
										if (state.entries.some((entry) => entry.name === name)) {
											event.preventDefault();
											void assign(name, group.id);
										}
									}}
								>
									<Button
										variant="ghost"
										className={p1Classes('dashboard-skillsec-group-head')}
										aria-expanded={!collapsed.includes(group.id)}
										onClick={() =>
											setCollapsed(
												collapsed.includes(group.id)
													? collapsed.filter((id) => id !== group.id)
													: [...collapsed, group.id],
											)
										}
									>
										<span className={p1Classes('dashboard-skillsec-group-chevron')}>
											<ChevronDown />
										</span>
										<span className={p1Classes('dashboard-skillsec-group-name')}>{group.name}</span>
										<span className={p1Classes('dashboard-skillsec-group-count')}>
											{filtered.filter((e) => groupFor(e.name) === group.id).length}
										</span>
									</Button>
									{renderCards(
										(group.id === '_none' ? visible : filtered).filter(
											(e) => groupFor(e.name) === group.id,
										),
										config.groupView === 'kanban'
											? 'dashboard-skillsec-kcol-list'
											: 'dashboard-skillsec-grid dashboard-skillsec-group-grid',
									)}
								</section>
							))}
						</div>
					) : (
						renderCards(visible)
					))}
				{pages > 1 && <Pagination page={current} pages={pages} change={setPage} />}
				{(state.loading || state.error || !filtered.length) && (
					<EmptyState
						size="sm"
						className="min-h-0 flex-1"
						icon={<Sparkles />}
						title={
							!state.loading && !state.error && !filtered.length
								? t(search ? 'skills.noMatches' : 'skills.emptyHint')
								: state.loading
									? t('dataview.scanning')
									: state.error
						}
					/>
				)}
			</div>
			{detail && (
				<SkillDetail
					store={store}
					entry={state.entries.find((e) => e.name === detail.name) ?? detail}
					service={service}
					pinned={config.pinned?.includes(detail.name) ?? false}
					pin={() => {
						void pin(detail.name);
					}}
					close={() => setDetail(null)}
				/>
			)}
			{groupEdit && (
				<DashboardDialog
					title={t('home.p1.group')}
					onClose={() => setGroupEdit(false)}
					onSave={() => {
						void observeBoardAction(
							patch({ groups, assignments: retainSkillAssignments(config, groups) }).then(() => {
								setGroupEdit(false);
								setGroupFilter('_all');
							}),
						);
					}}
				>
					{groups.map((g, i) => (
						<div className="flex gap-2" key={g.id}>
							<Input
								aria-label={t('home.dashboard.name')}
								value={g.name}
								onChange={(e) =>
									setGroups(groups.map((v, n) => (n === i ? { ...v, name: e.target.value } : v)))
								}
							/>
							<Input
								aria-label={t('home.p1.keywords')}
								value={g.keywords ?? ''}
								onChange={(e) =>
									setGroups(groups.map((v, n) => (n === i ? { ...v, keywords: e.target.value } : v)))
								}
							/>
							<Button variant="ghost" onClick={() => setGroups(groups.filter((v) => v.id !== g.id))}>
								{t('common.delete')}
							</Button>
						</div>
					))}
					<Button
						variant="outline"
						onClick={() => setGroups([...groups, { id: crypto.randomUUID(), name: '', keywords: '' }])}
					>
						{t('common.add')}
					</Button>
				</DashboardDialog>
			)}
		</div>
	);
}
