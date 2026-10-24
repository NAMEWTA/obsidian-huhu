// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/quick-note-config-modal.ts
import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { VaultPathField } from '../../../../ui/components/huhu/VaultPathField';
import { useT } from '../../../../ui/react/hooks';
import type { QuickNotePreset } from '../../core/board/types/model';
import { DEFAULT_NEW_NOTE_FOLDER } from '../../core/board/default-paths';
import { DEFAULT_QUICK_NOTE_FORMAT } from '../../platform/vault/quick-note-presets';
import { cleanVaultFolder } from '../../platform/vault/vault-notes';
import type { BoardStore } from '../../services/board-store';
import { observeBoardAction } from '../board/actions';
import { IconButton } from '../board/controls';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { DraftList } from './DraftList';

const blank = (): QuickNotePreset => ({
	id: crypto.randomUUID(),
	icon: 'file-plus',
	label: '',
	templatePath: '',
	folder: '',
	filename: '',
});

/** The buttons of the quick-notes widget: a name, the folder the note goes in, an optional template, the file name format. */
export function QuickNoteConfigDialog({ store, onClose }: { store: BoardStore; onClose(this: void): void }) {
	const t = useT(),
		[rows, setRows] = useState<QuickNotePreset[]>(() => {
			const saved = structuredClone(store.state.getState().settings.quickNotePresets);
			return saved.length ? saved : [blank()];
		}),
		[error, setError] = useState('');
	const patch = (id: string, change: Partial<QuickNotePreset>) =>
		setRows((list) => list.map((row) => (row.id === id ? { ...row, ...change } : row)));
	return (
		<DashboardDialog
			wide
			title={t('quickNote.configTitle')}
			onClose={onClose}
			onSave={() => {
				try {
					const presets = rows
						.filter((row) => row.label.trim() || row.folder.trim())
						.map((row) => ({ ...row, label: row.label.trim(), folder: cleanVaultFolder(row.folder) }));
					void observeBoardAction(
						store
							.settings((s) => {
								s.quickNotePresets = presets;
							})
							.then(onClose),
					);
				} catch {
					setError(t('quickNote.invalidFolder'));
				}
			}}
		>
			<DraftList items={rows} onChange={(items) => setRows(items)}>
				{(row) => (
					<div
						key={row.id}
						data-quick-button-row
						className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2"
					>
						<Label className="grid gap-1.5">
							{t('home.dashboard.name')}
							<Input value={row.label} onChange={(e) => patch(row.id, { label: e.target.value })} />
						</Label>
						<Label className="grid gap-1.5">
							{t('quickNote.folder')}
							<VaultPathField
								app={store.host.app}
								kind="folder"
								value={row.folder}
								label={t('quickNote.folder')}
								onChange={(folder) => patch(row.id, { folder })}
							/>
						</Label>
						<Label className="grid gap-1.5">
							{t('quickNote.template')}
							<div className="flex min-w-0 items-center gap-1">
								<div className="min-w-0 flex-1">
									<VaultPathField
										app={store.host.app}
										kind="file"
										value={row.templatePath}
										label={t('quickNote.template')}
										onChange={(templatePath) => patch(row.id, { templatePath })}
									/>
								</div>
								{row.templatePath && (
									<IconButton label={t('quickNote.clearTemplate')} onClick={() => patch(row.id, { templatePath: '' })}>
										<X />
									</IconButton>
								)}
							</div>
						</Label>
						<Label className="grid gap-1.5">
							{t('quickNote.filenameFormat')}
							<div className="flex min-w-0 items-center gap-1">
								<Input
									className="min-w-0 flex-1"
									value={row.filename}
									placeholder={DEFAULT_QUICK_NOTE_FORMAT}
									onChange={(e) => patch(row.id, { filename: e.target.value })}
								/>
								<IconButton
									label={t('common.delete')}
									onClick={() => setRows((list) => list.filter((item) => item.id !== row.id))}
								>
									<Trash2 />
								</IconButton>
							</div>
						</Label>
					</div>
				)}
			</DraftList>
			<p className="m-0 text-xs text-muted-foreground">
				{t('quickNote.configHint', { folder: DEFAULT_NEW_NOTE_FOLDER })}
			</p>
			{error && (
				<p role="alert" className="m-0 text-sm text-destructive">
					{error}
				</p>
			)}
			<Button variant="outline" size="sm" className="justify-self-start" onClick={() => setRows((list) => [...list, blank()])}>
				<Plus />
				{t('quickNote.addButton')}
			</Button>
		</DashboardDialog>
	);
}
