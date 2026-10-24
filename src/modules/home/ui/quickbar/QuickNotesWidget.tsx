// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/quick-note-section.ts
import { useState } from 'react';
import { useStore } from 'zustand';
import { toast } from 'sonner';
import { FilePlus, NotebookPen, Plus, Settings } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { ObsidianIcon } from '../../../../ui/components/huhu/ObsidianIcon';
import { useT } from '../../../../ui/react/hooks';
import type { QuickNotePreset } from '../../core/board/types/model';
import { presetNoteName } from '../../platform/vault/quick-note-presets';
import type { BoardStore } from '../../services/board-store';
import { IconButton } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
import { QuickNoteConfigDialog } from './QuickNoteConfigDialog';

/**
 * The quick-notes widget: one button per saved preset. A button makes a note in its folder (named by its filename
 * format, seeded by its template) and opens it in a new tab.
 */
export function QuickNotesWidget({ store }: { store: BoardStore }) {
	const presets = useStore(store.state, (state) => state.settings.quickNotePresets),
		t = useT(),
		[config, setConfig] = useState(false);
	const create = (preset: QuickNotePreset) => {
		void store
			.newNote(preset.folder, presetNoteName(preset.filename), preset.templatePath)
			.catch((error: unknown) => toast(error instanceof Error ? error.message : t('quickNote.createFailed')));
	};
	return (
		<>
			<WidgetActions>
				<IconButton label={t('quickNote.config')} onClick={() => setConfig(true)}>
					<Settings />
				</IconButton>
			</WidgetActions>
			<div data-quick-notes className="dashboard-quicknote flex h-full min-h-0 min-w-0 flex-col gap-3">
				{presets.length ? (
					<div
						data-quick-buttons
						className="flex min-h-0 flex-1 flex-wrap content-start items-start gap-2 overflow-y-auto"
					>
						{presets.map((preset) => (
							<Button
								key={preset.id}
								size="sm"
								variant="secondary"
								className="max-w-full"
								title={preset.folder}
								onClick={() => create(preset)}
							>
								{preset.icon && preset.icon !== 'file-text' ? <ObsidianIcon name={preset.icon} /> : <FilePlus />}
								<span className="min-w-0 truncate">{preset.label || preset.folder}</span>
							</Button>
						))}
					</div>
				) : (
					<EmptyState
						size="sm"
						className="min-h-0 flex-1"
						icon={<NotebookPen />}
						title={t('quickNote.empty')}
						action={
							<Button variant="outline" size="sm" onClick={() => setConfig(true)}>
								<Plus />
								{t('quickNote.addButton')}
							</Button>
						}
					/>
				)}
			</div>
			{config && <QuickNoteConfigDialog store={store} onClose={() => setConfig(false)} />}
		</>
	);
}
