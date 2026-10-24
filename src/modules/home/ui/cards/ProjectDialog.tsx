import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { VaultPathField } from '../../../../ui/components/huhu/VaultPathField';
import { useT } from '../../../../ui/react/hooks';
import type { DashboardColumn } from '../../core/board/types/model';
import { ensureFolder } from '../../platform/calendar/daily-notes';
import { cleanVaultFolder } from '../../platform/vault/vault-notes';
import type { BoardStore } from '../../services/board-store';
import { observeBoardAction } from '../board/actions';
import { DashboardDialog } from '../dialogs/DashboardDialog';

/** A new project: pick the vault folder that is the project (a folder that does not exist yet is created). */
export function ProjectDialog({
	store,
	column,
	onClose,
}: {
	store: BoardStore;
	column: DashboardColumn;
	onClose(this: void): void;
}) {
	const t = useT(),
		[folder, setFolder] = useState(''),
		[title, setTitle] = useState(''),
		[busy, setBusy] = useState(false);
	const save = () => {
		let dir: string;
		try {
			dir = cleanVaultFolder(folder);
		} catch {
			toast(t('home.project.invalidFolder'));
			return;
		}
		if (busy) return;
		if (!dir) {
			toast(t('home.project.chooseFolder'));
			return;
		}
		setBusy(true);
		void observeBoardAction(
			ensureFolder(store.host.app, dir)
				.then(() =>
					store.sync.addCard(column.name, {
						type: 'project',
						title: title.trim() || dir.split('/').at(-1)!,
						folder: dir,
					}),
				)
				.then(onClose),
		).finally(() => setBusy(false));
	};
	return (
		<DashboardDialog title={t('home.project.new')} busy={busy} onClose={onClose} onSave={save}>
			<Label className="grid gap-2">
				{t('home.project.folder')}
				<VaultPathField app={store.host.app} kind="folder" value={folder} label={t('home.project.folder')} onChange={setFolder} />
			</Label>
			<Label className="grid gap-2">
				{t('home.dashboard.name')}
				<Input
					value={title}
					placeholder={folder.split('/').at(-1) ?? ''}
					onChange={(e) => setTitle(e.target.value)}
				/>
			</Label>
		</DashboardDialog>
	);
}
