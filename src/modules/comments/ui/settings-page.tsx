// Layout adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/SettingsFormControls.tsx
import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import type { SettingsHandle } from '../../../shared/settings/store';
import type { CommentsSettings } from '../settings';
import { useT } from '../../../ui/react/hooks';
import { SettingsRow, SettingsSwitchRow, ColorField } from '../../../ui/components/huhu/SettingsFormControls';
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import { Choice } from '../../../ui/components/huhu/Choice';
import { Input } from '../../../ui/components/input';
import { Button } from '../../../ui/components/button';
import { Slider } from '../../../ui/components/slider';

export function commentsSettingsPage(settings: SettingsHandle<CommentsSettings>) {
	return function CommentsSettingsPage() {
		const t = useT(),
			value = useSyncExternalStore(
				(listener) => settings.subscribe(listener),
				() => settings.get(),
			);
		const [newColorName, setNewColorName] = useState('');
		const [newColorHex, setNewColorHex] = useState('#c0c0c0');
		const save = <K extends keyof CommentsSettings>(key: K, next: CommentsSettings[K]) => {
			void settings
				.update((draft) => {
					draft[key] = next;
				})
				.catch(() => toast.error(t('settings.writeFailed')));
		};
		return (
			<SettingsSection title={t('editor.comments.title')}>
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
							<div className="flex w-48 items-center gap-3">
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
				<div className="space-y-3 border-t border-border pt-3">
					<div className="text-sm font-medium">{t('editor.highlights.customColors')}</div>
					{value.customColors.map(color => <div key={color.id} className="flex flex-wrap items-center gap-2">
						<span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-border" style={{ backgroundColor: color.hex }} />
						<span className="min-w-0 flex-1 text-xs">{color.name} ({color.hex})</span>
						<Button type="button" size="xs" variant="ghost" aria-label={t('editor.highlights.deleteColor') + ': ' + color.name}
							onClick={() => save('customColors', value.customColors.filter(item => item.id !== color.id))}>{t('editor.highlights.deleteColor')}</Button>
					</div>)}
					<div className="flex flex-wrap items-center gap-2">
						<Input className="min-w-28 flex-1" value={newColorName} onChange={event => setNewColorName(event.target.value)}
							aria-label={t('editor.highlights.colorName')} placeholder={t('editor.highlights.colorName')} />
						<input aria-label={t('editor.highlights.colorValue')} className="h-9 w-12 cursor-pointer"
							type="color" value={newColorHex} onChange={event => setNewColorHex(event.target.value)} />
						<Button size="sm" variant="outline" disabled={!newColorName.trim() || value.customColors.length >= 32}
							onClick={() => {
								const id = ('custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).slice(0, 23) as `custom-${string}`;
								save('customColors', [...value.customColors, { id, name: newColorName.trim().slice(0, 60), hex: newColorHex }]);
								setNewColorName('');
							}}>{t('editor.highlights.addColor')}</Button>
					</div>
				</div>
			</SettingsSection>
		);
	};
}
