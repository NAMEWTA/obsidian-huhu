import { useState } from 'react';
import type { App } from 'obsidian';
import { VaultPathField } from '../../../../ui/components/huhu/VaultPathField';
import { NumberField } from '../../../../ui/components/huhu/NumberField';
import { SettingsSwitchRow } from '../../../../ui/components/huhu/SettingsSwitchRow';
import { useT } from '../../../../ui/react/hooks';
import type { AlbumConfig } from '../../core/board/types';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { Choice } from '../board/controls';
import { normalizeTransition } from './album-model';
export function AlbumEditor({
	app,
	initial,
	onClose,
	onSave,
	embedded = false,
}: {
	app: App;
	initial: AlbumConfig;
	onClose(this: void): void;
	onSave(this: void, value: AlbumConfig): void | Promise<void>;
	embedded?: boolean;
}) {
	const [draft, setDraft] = useState({ ...initial }),
		t = useT();
	return (
		<DashboardDialog
			embedded={embedded}
			title={t('album.editTitle')}
			onClose={onClose}
			onSave={() => onSave(draft)}
		>
			<VaultPathField
				app={app}
				kind="folder"
				create={false}
				allowCreate={false}
				label={t('settings.widgetAlbumFolder')}
				value={draft.folder}
				onChange={(folder) => setDraft({ ...draft, folder })}
			/>
			<NumberField
				label={t('settings.widgetAlbumInterval')}
				description={t('settings.widgetAlbumIntervalDesc')}
				value={draft.intervalSec}
				min={1}
				onChange={(intervalSec) => setDraft({ ...draft, intervalSec: intervalSec ?? 8 })}
			/>
			<SettingsSwitchRow
				label={t('settings.widgetAlbumRecursive')}
				checked={draft.recursive}
				onChange={() => setDraft({ ...draft, recursive: !draft.recursive })}
			/>
			<Choice
				label={t('settings.widgetAlbumTransition')}
				value={normalizeTransition(draft.transition)}
				options={[
					{ value: 'fade', label: t('settings.widgetAlbumTransitionFade') },
					{ value: 'slide-left', label: t('settings.widgetAlbumTransitionSlideLeft') },
					{ value: 'slide-right', label: t('settings.widgetAlbumTransitionSlideRight') },
					{ value: 'zoom', label: t('settings.widgetAlbumTransitionZoom') },
				]}
				onChange={(transition) => setDraft({ ...draft, transition: normalizeTransition(transition) })}
			/>
			<Choice
				label={t('album.heightRatio')}
				value={draft.heightRatio}
				options={['full', 'twoThirds', 'half', 'third'].map((value) => ({
					value,
					label: t(`album.size.${value}`),
				}))}
				onChange={(heightRatio) =>
					setDraft({ ...draft, heightRatio: heightRatio as AlbumConfig['heightRatio'] })
				}
			/>
		</DashboardDialog>
	);
}
