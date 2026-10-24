import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../../../../ui/components/input';
import { Button } from '../../../../ui/components/button';
import { Slider } from '../../../../ui/components/slider';
import { SettingsRow } from '../../../../ui/components/huhu/SettingsRow';
import { Choice } from '../../../../ui/components/huhu/Choice';
import { useT } from '../../../../ui/react/hooks';
import {
	FONT_SIZE_RANGE, INTERFACE_FONTS, MONO_FONTS, TEXT_FONTS, normalizeFontFamily,
	type ThemeSettings,
} from '../../../../theme/settings';
import type { SettingsHandle } from '../../../../shared/settings/store';

type FontKind = 'Interface' | 'Text' | 'Mono';
const FONT_SETS: Record<FontKind, readonly string[]> = { Interface: INTERFACE_FONTS, Text: TEXT_FONTS, Mono: MONO_FONTS };
const SAMPLE_VAR: Record<FontKind, string> = { Interface: '--font-interface', Text: '--font-text', Mono: '--font-monospace' };

/** The free-text font list of a "Custom…" choice; commits on blur or Enter so every keystroke is not a rewrite. */
function FamilyInput({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
	const t = useT();
	const [draft, setDraft] = useState(value);
	const [seen, setSeen] = useState(value);
	// Follow the stored value when it changes from elsewhere (reset, import, another picker).
	if (seen !== value) {
		setSeen(value);
		setDraft(value);
	}
	const commit = () => {
		const clean = normalizeFontFamily(draft);
		setDraft(clean);
		if (clean !== value) onCommit(clean);
	};
	return (
		<Input
			aria-label={label}
			className="w-full min-w-0 text-xs"
			value={draft}
			placeholder={t('appearance.fontCustomPlaceholder')}
			spellCheck={false}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === 'Enter' && !event.nativeEvent.isComposing) commit();
			}}
		/>
	);
}

function FontRow({ kind, handle, settings }: { kind: FontKind; handle: SettingsHandle<ThemeSettings>; settings: ThemeSettings }) {
	const t = useT();
	const choiceKey = `font${kind}` as const;
	const customKey = `font${kind}Custom` as const;
	const value = settings[choiceKey];
	const label = t(`appearance.font${kind}`);
	const fail = () => toast.error(t('settings.writeFailed'));
	const optionLabel = (id: string) => t(id === 'default' && kind === 'Interface' ? 'appearance.font.defaultInterface' : `appearance.font.${id}`);
	return (
		<SettingsRow
			label={label}
			description={t(`appearance.font${kind}Desc`)}
			alignTop
			control={
				<div className="flex w-64 max-w-full flex-col gap-2">
					<Choice
						label={label}
						value={value}
						className="w-full"
						options={FONT_SETS[kind].filter((id) => kind === 'Interface' || id !== 'host').map((id) => [id, optionLabel(id)] as const)}
						onChange={(next) => void handle.update((draft) => { (draft as Record<string, unknown>)[choiceKey] = next; }).catch(fail)}
					/>
					{value === 'custom' && (
						<FamilyInput
							label={t('appearance.fontCustomLabel', { font: label })}
							value={settings[customKey]}
							onCommit={(next) => void handle.update((draft) => { (draft as Record<string, unknown>)[customKey] = next; }).catch(fail)}
						/>
					)}
					<p className="text-sm leading-snug" style={{ fontFamily: `var(${SAMPLE_VAR[kind]})` }}>
						{t('appearance.fontSample')}
					</p>
				</div>
			}
		/>
	);
}

function SliderRow({ label, description, value, min, max, step, format, onChange, onReset }: {
	label: string; description: string; value: number; min: number; max: number; step: number;
	format: (value: number) => string; onChange: (value: number) => void; onReset: () => void;
}) {
	const t = useT();
	return (
		<SettingsRow
			label={label}
			description={description}
			control={
				<div className="flex w-64 max-w-full items-center gap-3">
					<Slider aria-label={label} min={min} max={max} step={step} value={[value || min]} onValueChange={(next) => onChange(next[0] ?? min)} />
					<output className="w-12 shrink-0 text-right text-xs tabular-nums">{value ? format(value) : t('appearance.useDefault')}</output>
					{value > 0 && (
						<Button variant="outline" size="sm" onClick={onReset}>
							{t('appearance.useDefault')}
						</Button>
					)}
				</div>
			}
		/>
	);
}

/** Interface, reading and monospace fonts, note text size and line height. */
export function Typography({ handle, settings }: { handle: SettingsHandle<ThemeSettings>; settings: ThemeSettings }) {
	const t = useT();
	const fail = () => toast.error(t('settings.writeFailed'));
	const set = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) =>
		void handle.update((draft) => { draft[key] = value; }).catch(fail);
	return (
		<div className="space-y-1">
			{(['Interface', 'Text', 'Mono'] as const).map((kind) => (
				<FontRow key={kind} kind={kind} handle={handle} settings={settings} />
			))}
			<SliderRow
				label={t('appearance.fontSize')}
				description={t('appearance.fontSizeDesc')}
				value={settings.fontSize}
				min={FONT_SIZE_RANGE.min}
				max={FONT_SIZE_RANGE.max}
				step={1}
				format={(value) => `${value}px`}
				onChange={(value) => set('fontSize', value)}
				onReset={() => set('fontSize', 0)}
			/>
			<SliderRow
				label={t('appearance.lineHeight')}
				description={t('appearance.lineHeightDesc')}
				value={settings.lineHeight}
				min={1.2}
				max={2.2}
				step={0.05}
				format={(value) => value.toFixed(2)}
				onChange={(value) => set('lineHeight', Math.round(value * 100) / 100)}
				onReset={() => set('lineHeight', 0)}
			/>
		</div>
	);
}
