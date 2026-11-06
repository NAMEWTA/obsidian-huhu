// Layout adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/SettingsFormControls.tsx
import { useState, useSyncExternalStore } from 'react';
import type { SettingsHandle } from '../../../shared/settings/store';
import type { CommentsSettings } from '../settings';
import { DesignScope } from '../../../ui/react/design-scope';
import { useT } from '../../../ui/react/hooks';
import { SettingsRow, SettingsSwitchRow, ColorField } from '../../../ui/components/huhu/SettingsFormControls';
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import { Choice } from '../../../ui/components/huhu/Choice';
import { Input } from '../../../ui/components/input';
import { Button } from '../../../ui/components/button';
import { Slider } from '../../../ui/components/slider';

export function commentsSettingsPage(settings: SettingsHandle<CommentsSettings>) {
	function CommentsSettingsBody() {
		const t = useT(),
			value = useSyncExternalStore(
				(listener) => settings.subscribe(listener),
				() => settings.get(),
			);
		const [writeError, setWriteError] = useState(false);
		const [newColorName, setNewColorName] = useState('');
		const [newColorHex, setNewColorHex] = useState('#c0c0c0');
		const save = <K extends keyof CommentsSettings>(key: K, next: CommentsSettings[K]) => {
			setWriteError(false);
			void settings
				.update((draft) => {
					draft[key] = next;
				})
				.catch(() => setWriteError(true));
		};
		return (
			<SettingsSection title={t('editor.comments.title')}>
				{writeError && <p role="alert" className="text-sm text-[var(--hu-danger)]">{t('settings.writeFailed')}</p>}
				<SettingsRow
					label={t('editor.comments.author')}
					control={
						<Input
							aria-label={t('editor.comments.author')}
							value={value.author}
							onChange={(e) => save('author', e.target.value)}
						/>
					}
				/>
				{(
					[
						['highlightEnabled', 'settings.editorHighlight'],
						['popoverEnabled', 'settings.editorPopover'],
						['gutterEnabled', 'editor.comments.gutterEnabled'],
						['showCount', 'editor.comments.showCount'],
						['highlightLines', 'editor.comments.highlightLines'],
						['highlightResolved', 'editor.comments.highlightResolved'],
						['followAccent', 'editor.comments.followAccent'],
						['deleteWithNote', 'editor.comments.deleteWithNote'],
					] as const
				).map(([key, label]) => (
					<SettingsSwitchRow
						key={key}
						label={t(label)}
						checked={value[key]}
						onChange={() => save(key, !value[key])}
					/>
				))}
				{!value.followAccent && (
					<ColorField
						label={t('editor.comments.color')}
						description=""
						value={value.color}
						fallback="#7c3aed"
						onChange={(color) => save('color', color)}
					/>
				)}
				{(
					[
						['hoverDelay', 200, 1000, 50],
						['fuzzyThreshold', 0.1, 0.5, 0.05],
					] as const
				).map(([key, min, max, step]) => (
					<SettingsRow
						key={key}
						label={t(`editor.comments.${key}`)}
						control={
							<div className="flex w-48 min-w-0 max-w-full items-center gap-3">
								<Slider
									aria-label={t(`editor.comments.${key}`)}
									min={min}
									max={max}
									step={step}
									value={[value[key]]}
									onValueChange={(v) => save(key, v[0] ?? min)}
								/>
								<output className="text-xs tabular-nums">{value[key]}</output>
							</div>
						}
					/>
				))}
				<SettingsRow
					label={t('editor.comments.panelSide')}
					control={
						<Choice
							label={t('editor.comments.panelSide')}
							value={value.panelSide}
							options={['left', 'right'].map((key) => [key, t(`editor.comments.${key}`)])}
							onChange={(v) => save('panelSide', v === 'left' ? 'left' : 'right')}
						/>
					}
				/>
				<SettingsRow
					label={t('editor.comments.sort')}
					control={
						<Choice
							label={t('editor.comments.sort')}
							value={value.sort}
							options={['position', 'created', 'activity'].map((key) => [
								key,
								t(`editor.comments.${key}`),
							])}
							onChange={(v) => save('sort', v === 'created' || v === 'activity' ? v : 'position')}
						/>
					}
				/>
				<SettingsRow label={t('editor.highlights.exportFolder')}
					control={<Input aria-label={t('editor.highlights.exportFolder')} value={value.exportFolder}
						onChange={event => save('exportFolder', event.target.value)} />} />
				<div className="space-y-3 border-t border-[var(--hu-line)] pt-3">
					<div className="text-sm font-medium">{t('editor.highlights.customColors')}</div>
					{value.customColors.map(color => <div key={color.id} className="flex flex-wrap items-center gap-2">
						<span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-[var(--hu-line)]" style={{ backgroundColor: color.hex }} />
						<span className="min-w-0 flex-1 text-xs">{color.name} ({color.hex})</span>
						<Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" type="button" size="sm" variant="ghost" aria-label={t('editor.highlights.deleteColor') + ': ' + color.name}
							onClick={() => save('customColors', value.customColors.filter(item => item.id !== color.id))}>{t('editor.highlights.deleteColor')}</Button>
					</div>)}
					<div className="flex flex-wrap items-center gap-2">
						<Input className="min-w-28 flex-1" value={newColorName} onChange={event => setNewColorName(event.target.value)}
							aria-label={t('editor.highlights.colorName')} placeholder={t('editor.highlights.colorName')} />
						<input aria-label={t('editor.highlights.colorValue')} className="h-9 w-12 cursor-pointer"
							type="color" value={newColorHex} onChange={event => setNewColorHex(event.target.value)} />
						<Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" size="sm" variant="secondary" disabled={!newColorName.trim() || value.customColors.length >= 32}
							onClick={() => {
								const id = ('custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).slice(0, 23) as `custom-${string}`;
								save('customColors', [...value.customColors, { id, name: newColorName.trim().slice(0, 60), hex: newColorHex }]);
								setNewColorName('');
							}}>{t('editor.highlights.addColor')}</Button>
					</div>
				</div>
			</SettingsSection>
		);
	}
	return function CommentsSettingsPage() {
		return <DesignScope className="huhu-settings-stack min-w-0 px-1 break-words [&_[data-slot=label]]:break-all [&_[data-slot=settings-row]>div]:max-w-full [&_[data-slot=settings-row]>div]:min-w-0 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:break-all [&_button]:h-auto"><CommentsSettingsBody /></DesignScope>;
	};
}
