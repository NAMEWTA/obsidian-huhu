// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/workspace-switcher.ts
import { useId, useState } from 'react';
import { useStore } from 'zustand';
import { Plus } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { IconButton } from '../board/controls';
import { boardEntries, boardLabel } from './board-names';
export function WorkspaceSwitcher({ store }: { store: BoardStore }) {
	const { settings, path } = useStore(store.state),
		t = useT(),
		labelId = useId();
	const [open, setOpen] = useState(false),
		[name, setName] = useState(''),
		[busy, setBusy] = useState(false);
	const close = () => {
		setOpen(false);
		setName('');
	};
	const create = () => {
		if (busy) return;
		setBusy(true);
		void store.host
			.createWorkspace(name.trim())
			.then(() => store.switch(store.host.settings.dashboardFile))
			.then(close)
			.finally(() => setBusy(false));
	};
	return (
		<>
			<div
				role="group"
				aria-labelledby={labelId}
				className="dashboard-workspace-switcher flex w-fit max-w-full min-w-0 flex-wrap items-center gap-1 rounded-full bg-[var(--hu-hover)] p-1"
			>
				<span id={labelId} className="sr-only">
					{t('home.frame.boards')}
				</span>
				{boardEntries(settings).map((entry) => {
					const label = boardLabel(entry, t);
					return (
						<Tooltip key={entry.file}>
							<TooltipTrigger asChild>
								<Button
									size="sm"
									variant={entry.file === path ? 'secondary' : 'ghost'}
									className="h-5 max-w-32 min-w-5 rounded-full px-2 text-xs"
									aria-label={label}
									aria-current={entry.file === path ? 'page' : undefined}
									onClick={() => {
										void store.host
											.switchWorkspace(entry.file)
											.then(() => store.switch(entry.file));
									}}
								>
									<span className="min-w-0 truncate">{label}</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>{label}</TooltipContent>
						</Tooltip>
					);
				})}
				<IconButton
					label={t('workbench.newBoard')}
					className="size-5 rounded-full"
					onClick={() => setOpen(true)}
				>
					<Plus className="size-3" />
				</IconButton>
			</div>
			{open && (
				<DashboardDialog title={t('workbench.newBoard')} busy={busy} onClose={close} onSave={create}>
					<Label className="grid gap-2">
						{t('home.dashboard.name')}
						<Input
							autoFocus
							value={name}
							placeholder={t('home.dashboard.boardNamePlaceholder')}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
									e.preventDefault();
									create();
								}
							}}
						/>
					</Label>
				</DashboardDialog>
			)}
		</>
	);
}
