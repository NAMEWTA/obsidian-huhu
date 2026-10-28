// Layout adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/SettingsFormControls.tsx
import { useState, useSyncExternalStore } from 'react';
import type { App } from 'obsidian';
import { toast } from 'sonner';
import { normalizeVaultFolder, type ContactsSettings } from '../../../shared/contacts-settings';
import type { SettingsHandle } from '../../../shared/settings/store';
import type { WriteQueue } from '../../../shared/storage/write-queue';
import { confirm, ct, errorText } from './forms';
import { useT } from '../../../ui/react/hooks';
import { SettingsRow } from '../../../ui/components/huhu/SettingsRow';
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import { Choice } from '../../../ui/components/huhu/Choice';
import { VaultPathField } from '../../../ui/components/huhu/VaultPathField';
import { Button } from '../../../ui/components/button';
export function archivesSettingsPage(
	app: App,
	controller: { countFolder(root: string): Promise<number>; queue: WriteQueue; reload(): Promise<void> },
	settings: SettingsHandle<ContactsSettings>,
) {
	return function ArchivesSettingsPage() {
		useT();
		const value = useSyncExternalStore(
				(listener) => settings.subscribe(listener),
				() => settings.get(),
			),
			[candidate, setCandidate] = useState(value.rootFolder),
			[busy, setBusy] = useState(false);
		const preview = async () => {
			setBusy(true);
			try {
				// Typed paths are always relative to the vault: no leading `/` or `./`, no `..`, no hidden folders.
				const root = normalizeVaultFolder(candidate);
				if (!root) {
					toast.error(ct('invalidFolder'));
					return;
				}
				const count = await controller.countFolder(root);
				if (!(await confirm(app, ct('folderPreview', { folder: root, count }), ct('apply')))) return;
				await controller.queue.settled();
				const previous = settings.get().rootFolder;
				try {
					await settings.update(
						(draft) => {
							draft.rootFolder = root;
						},
						{ persist: 'immediate' },
					);
				} catch (error) {
					void settings
						.update((draft) => {
							draft.rootFolder = previous;
						})
						.catch(() => undefined);
					throw error;
				}
				await controller.reload();
			} catch (error) {
				toast.error(errorText(error));
			} finally {
				setBusy(false);
			}
		};
		return (
			<SettingsSection title={ct('storage')}>
				<SettingsRow
					label={ct('folder')}
					description={ct('folderHint')}
					className="flex-wrap [&>div:last-child]:w-full"
					control={
						<div className="flex flex-wrap gap-2">
							<VaultPathField
								app={app}
								label={ct('folder')}
								className="min-w-40 flex-1"
								value={candidate}
								// The folder is created when the new root is applied, after the preview is confirmed.
								create={false}
								onChange={setCandidate}
							/>
							<Button
								disabled={busy}
								onClick={() => {
									void preview();
								}}
							>
								{ct('preview')}
							</Button>
						</div>
					}
				/>
				<SettingsRow
					label={ct('columns')}
					description={ct('columnsHint')}
					control={
						<Choice
							label={ct('columns')}
							value={String(value.maxColumns)}
							options={[
								['5', '5'],
								['6', '6'],
							]}
							onChange={(v) => {
								void settings
									.update((draft) => {
										draft.maxColumns = v === '5' ? 5 : 6;
									})
									.catch((error) => toast.error(errorText(error)));
							}}
						/>
					}
				/>
			</SettingsSection>
		);
	};
}
