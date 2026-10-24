// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/renderer.ts, src/countdown-modal.ts
import { useState } from 'react';
import { useStore } from 'zustand';
import { Plus, Settings, Timer } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import type { CountdownConfig } from '../../core/board/types/model';
import { useClock, useImage } from '../board/hooks';
import { IconButton, Choice } from '../board/controls';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { WidgetActions } from '../canvas/widget-frame';
function CountdownBackground({
	store,
	entry,
	children,
}: {
	store: BoardStore;
	entry: CountdownConfig;
	children: import('react').ReactNode;
}) {
	const image = useImage(store, entry.background?.image ?? '');
	return (
		<div className="relative isolate flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-md">
			{image && (
				<div
					aria-hidden
					className="absolute inset-0 -z-10 bg-cover bg-center"
					style={{
						backgroundImage: `url(${JSON.stringify(image)})`,
						opacity: (entry.background?.opacity ?? 100) / 100,
						filter: `blur(${entry.background?.blur ?? 0}px)`,
					}}
				/>
			)}
			{children}
		</div>
	);
}

/** One countdown: its name, the remaining count large and centered, and (from the medium size) the target date. */
export function CountdownWidget({ store, entryId }: { store: BoardStore; entryId?: string }) {
	const entries = useStore(store.state, (s) => s.settings.countdowns),
		now = useClock(),
		t = useT(),
		[draft, setDraft] = useState<CountdownConfig | null>(null),
		shown = entries.filter((entry) => !entryId || entry.id === entryId);
	return (
		<>
			<WidgetActions>
				{shown.length === 1 && (
					<IconButton label={t('home.dashboard.settings')} onClick={() => setDraft({ ...shown[0]! })}>
						<Settings />
					</IconButton>
				)}
				{!entryId && (
					<IconButton
						label={t('countdown.add')}
						onClick={() =>
							setDraft({
								id: crypto.randomUUID(),
								label: '',
								targetDate: '',
								displayMode: 'days',
								reminderDays: 0,
							})
						}
					>
						<Plus />
					</IconButton>
				)}
			</WidgetActions>
			{shown.length === 0 ? (
				<EmptyState className="h-full" size="sm" icon={<Timer />} title={t('countdown.empty')} />
			) : (
				<div
					className={`grid h-full min-h-0 gap-2 ${shown.length > 1 ? 'grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] content-start' : ''}`}
					data-countdown
				>
					{shown.map((entry) => {
						const unit =
								entry.displayMode === 'days'
									? 86400000
									: entry.displayMode === 'hours'
										? 3600000
										: 60000,
							remaining = Math.max(0, Math.ceil((new Date(entry.targetDate).getTime() - now) / unit));
						return (
							<CountdownBackground key={entry.id} store={store} entry={entry}>
								<span className="max-w-full truncate px-1 text-sm text-muted-foreground" title={entry.label}>
									{entry.label || t('countdown.untitled')}
								</span>
								<span className="leading-tight font-semibold tabular-nums [font-size:clamp(2rem,min(14cqw,26cqh),4.5rem)]">{remaining}</span>
								<span className="text-xs text-muted-foreground">{t(`home.dashboard.${entry.displayMode}`)}</span>
								<span className="mt-1 hidden text-xs text-muted-foreground tabular-nums [@container(min-height:9rem)]:block">
									{entry.targetDate.slice(0, 10)}
								</span>
							</CountdownBackground>
						);
					})}
				</div>
			)}
			{draft && (
				<CountdownEditor
					initial={draft}
					onClose={() => setDraft(null)}
					onSave={(value) =>
						void store
							.settings((s) => {
								s.countdowns = [...s.countdowns.filter((c) => c.id !== value.id), value];
							})
							.then(() => setDraft(null))
					}
					onDelete={
						entries.some((entry) => entry.id === draft.id)
							? () =>
									void store
										.settings((s) => {
											s.countdowns = s.countdowns.filter((c) => c.id !== draft.id);
										})
										.then(() => setDraft(null))
							: undefined
					}
				/>
			)}
		</>
	);
}

export function CountdownEditor({
	initial,
	onClose,
	onSave,
	onDelete,
}: {
	initial: CountdownConfig;
	onClose(this: void): void;
	onSave(this: void, value: CountdownConfig): void;
	onDelete?(this: void): void;
}) {
	const t = useT(),
		[draft, setDraft] = useState(initial);
	return (
		<DashboardDialog
			title={t('home.dashboard.widget.countdown')}
			onClose={onClose}
			onSave={() => {
				if (draft.label.trim() && draft.targetDate) onSave(draft);
			}}
		>
			<Input
				value={draft.label}
				aria-label={t('home.dashboard.name')}
				onChange={(e) => setDraft({ ...draft, label: e.target.value })}
			/>
			<Input
				type="datetime-local"
				value={draft.targetDate.length === 10 ? `${draft.targetDate}T00:00` : draft.targetDate}
				aria-label={t('home.dashboard.date')}
				onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
			/>
			<Label>
				{t('home.dashboard.image')}
				<Input
					value={draft.background?.image ?? ''}
					onChange={(e) =>
						setDraft({
							...draft,
							background: {
								opacity: 100,
								dim: 30,
								blur: 0,
								...draft.background,
								image: e.target.value,
							},
						})
					}
				/>
			</Label>
			<Choice
				label={t('home.dashboard.mode')}
				value={draft.displayMode}
				onChange={(value) => setDraft({ ...draft, displayMode: value as CountdownConfig['displayMode'] })}
				options={['days', 'hours', 'minutes'].map((value) => ({
					value,
					label: t(`home.dashboard.${value}`),
				}))}
			/>
			<Label>
				{t('home.dashboard.reminderDays')}
				<Input
					type="number"
					min={0}
					value={draft.reminderDays}
					onChange={(e) => setDraft({ ...draft, reminderDays: +e.target.value })}
				/>
			</Label>
			{onDelete && (
				<Button variant="destructive" onClick={onDelete}>
					{t('common.delete')}
				</Button>
			)}
		</DashboardDialog>
	);
}
