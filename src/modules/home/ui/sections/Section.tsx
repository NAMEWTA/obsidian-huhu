// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts
import { observeBoardAction } from '../board/actions';
import { P2_SECTIONS, P1_SECTIONS } from './registry';
import { RssSection } from '../rss/RssSection';
import { P1Section } from './P1Section';
import { ProjectSection } from '../pm/ProjectSection';
import { SkillsSection } from '../skills/SkillsSection';
import { useState } from 'react';
import { Archive, Plus, Settings } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { useT } from '../../../../ui/react/hooks';
import type { DashboardColumn } from '../../core/board/types/model';
import type { BoardStore } from '../../services/board-store';
import { IconButton } from '../board/controls';
import { useWidgetActionsHost, useWidgetMenu, WidgetActions } from '../canvas/widget-frame';
import { SectionCards } from './SectionCards';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { SectionOptions } from './SectionOptions';
import { LibrarySection } from './types/LibrarySection';
import { ProjectDialog } from '../cards/ProjectDialog';
import { TasksWidget } from '../tasks/TasksWidget';
import { InboxSection } from '../inbox/InboxSection';
/**
 * The view of a section tile: the body only. Its title and the tile's menu belong to the card around it; what the
 * section adds to that card (add a card, settings, archive) goes into the card's title bar and menu.
 */
export function Section({ store, column }: { store: BoardStore; column: DashboardColumn }) {
	const t = useT(),
		actions = useWidgetActionsHost(),
		[adding, setAdding] = useState(false),
		[options, setOptions] = useState(false),
		[archive, setArchive] = useState(false),
		[archiving, setArchiving] = useState(false),
		[archiveError, setArchiveError] = useState('');
	const type = column.sectionType ?? column.name.toLowerCase(),
		retired = type === 'ticktick' || type === 'weread',
		library = type === 'library' || type === 'folder',
		p1 = P1_SECTIONS.includes(type),
		p2 = P2_SECTIONS.includes(type),
		memo = type === 'memo',
		todo = type === 'todo' || type === 'alltasks',
		project = type === 'projects' || type === 'notes',
		generic = !retired && !library && !p1 && !p2 && !memo && !todo;
	// Sections that draw their own controls portal them into the card's title bar; the plain card sections get these.
	useWidgetMenu(
		generic
			? [
					{
						id: 'archive',
						label: t('home.dashboard.archiveTasks'),
						icon: <Archive />,
						onSelect: () => {
							setArchiveError('');
							setArchive(true);
						},
					},
				]
			: [],
	);
	return (
		<section
			data-column={column.name}
			data-section-type={type}
			className="dashboard-section-row flex h-full min-h-0 min-w-0 flex-col"
		>
			{generic && (
				<WidgetActions>
					<IconButton
						label={t(project ? 'home.project.new' : 'home.dashboard.newCard')}
						onClick={() => setAdding(true)}
					>
						<Plus />
					</IconButton>
					<IconButton label={t('home.dashboard.settings')} onClick={() => setOptions(true)}>
						<Settings />
					</IconButton>
				</WidgetActions>
			)}
			{retired ? (
				<EmptyState
					size="sm"
					className="h-full"
					title={t('home.integrationRetired', { name: t(`home.dashboard.section.${type}`) })}
					description={t('home.integrationRetiredHint')}
				/>
			) : type === 'rss' ? (
				<RssSection store={store} column={column} actions={actions} />
			) : type === 'pm' ? (
				<ProjectSection store={store} column={column} actions={actions} />
			) : type === 'skills' ? (
				<SkillsSection store={store} column={column} actions={actions} />
			) : todo ? (
				<TasksWidget store={store} />
			) : memo ? (
				<InboxSection store={store} />
			) : p1 ? (
				<P1Section store={store} column={column} actions={actions} />
			) : library ? (
				<LibrarySection store={store} column={column} />
			) : (
				<SectionCards store={store} column={column} projects={project} onAdd={() => setAdding(true)} />
			)}
			{options && <SectionOptions store={store} column={column} onClose={() => setOptions(false)} />}
			{adding && project && <ProjectDialog store={store} column={column} onClose={() => setAdding(false)} />}
			{adding && !project && (
				<DashboardDialog title={t('home.dashboard.newCard')} onClose={() => setAdding(false)}>
					<div className="grid grid-cols-3 gap-2">
						{['task'].map((kind) => (
							<Button
								key={kind}
								variant="outline"
								className="h-20"
								onClick={() => {
									void observeBoardAction(
										store.sync
											.addCard(column.name, {
												type: kind as 'generic' | 'task' | 'web' | 'project',
											})
											.then(() => setAdding(false)),
									);
								}}
							>
								{t(`home.dashboard.card.${kind}`)}
							</Button>
						))}
					</div>
				</DashboardDialog>
			)}
			{archive && (
				<DashboardDialog
					title={t('home.dashboard.archiveTasks')}
					onClose={() => {
						if (!archiving) setArchive(false);
					}}
				>
					<p>
						{store.completedTasks(column.name).length
							? t('notice.archiveConfirm', { count: store.completedTasks(column.name).length })
							: t('notice.archiveEmpty')}
					</p>
					{archiveError && (
						<p role="alert" className="text-destructive">
							{archiveError}
						</p>
					)}
					<Button
						disabled={archiving || !store.completedTasks(column.name).length}
						onClick={() => {
							setArchiving(true);
							void store
								.archiveTasks(column.name)
								.then(() => setArchive(false))
								.catch((error: unknown) =>
									setArchiveError(error instanceof Error ? error.message : t('notice.archiveError')),
								)
								.finally(() => setArchiving(false));
						}}
					>
						{t('home.dashboard.archiveTasks')}
					</Button>
				</DashboardDialog>
			)}
		</section>
	);
}
