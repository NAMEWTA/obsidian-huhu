import { useState } from 'react';
import { ColorField } from '../../../../ui/components/huhu/ColorField';
import { Button } from '../../../../ui/components/button';
import { SettingsRow } from '../../../../ui/components/huhu/SettingsRow';
import { Choice } from '../../../../ui/components/huhu/Choice';
import { SegmentedControl } from '../../../../ui/components/huhu/SettingsFormControls';
import { useT } from '../../../../ui/react/hooks';
import { CUSTOM_COLOR_KEYS, DEFAULT_CUSTOM, type CustomColorKey, type CustomColors } from '../../../../theme/custom';
import { isHexColor, rgbToHex } from '../../../../theme/color';
import { PALETTE_SCHEMES, type ThemeSettings } from '../../../../theme/settings';
import type { SettingsHandle } from '../../../../shared/settings/store';

const LABELS: Record<CustomColorKey, string> = {
	background: 'appearance.customBackground',
	foreground: 'appearance.customForeground',
	primary: 'appearance.customPrimary',
	border: 'appearance.customBorder',
	sidebar: 'appearance.customSidebar',
};

/** `#rrggbb` of a CSS colour (computed styles report rgb()); null when it is not one. */
function toHex(css: string): string | null {
	const value = css.trim();
	if (isHexColor(value)) return value.toLowerCase();
	const match = /^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(value);
	return match ? rgbToHex([Number(match[1]), Number(match[2]), Number(match[3])]) : null;
}

/** One colour: native picker plus hex text. The text keeps a draft so half-typed values are not thrown away. */
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
	const [draft, setDraft] = useState(value);
	const [seen, setSeen] = useState(value);
	// Follow the stored value when it changes from elsewhere (reset, import, another picker).
	if (seen !== value) {
		setSeen(value);
		setDraft(value);
	}
	return (
		<ColorField
			label={label}
			description=""
			value={draft}
			fallback={value}
			onChange={(next) => {
				setDraft(next);
				if (isHexColor(next)) onChange(next.toLowerCase());
			}}
		/>
	);
}

/** The custom theme's five colours for light or dark mode, with "start from a theme" and reset. */
export function CustomColorsEditor({
	handle,
	settings,
	initialMode,
	ownerDocument,
	onError,
}: {
	handle: SettingsHandle<ThemeSettings>;
	settings: ThemeSettings;
	initialMode: 'light' | 'dark';
	ownerDocument: Document;
	onError: () => void;
}) {
	const t = useT();
	const [mode, setMode] = useState<'light' | 'dark'>(initialMode);
	const colors = settings.custom[mode];
	const write = (recipe: (draft: CustomColors) => void) =>
		void handle.update((draft) => {
			recipe(draft.custom[mode]);
		}).catch(onError);
	const copyFrom = (id: string) => {
		// Read the palette back from a probe carrying its classes; the tokens are the single source of the colours.
		const probe = ownerDocument.createElement('div');
		probe.classList.add(`huhu-editor--${id}`, `theme-${mode}`);
		ownerDocument.body.appendChild(probe);
		const read = (token: string) =>
			toHex(ownerDocument.defaultView!.getComputedStyle(probe).getPropertyValue(token));
		const next: Partial<CustomColors> = {
			background: read('--ne-preview-bg') ?? undefined,
			foreground: read('--ne-preview-fg') ?? undefined,
			primary: read('--ne-link') ?? undefined,
			border: read('--ne-quote') ?? undefined,
			sidebar: read('--ne-code-bg') ?? undefined,
		};
		probe.remove();
		write((draft) => Object.assign(draft, Object.fromEntries(Object.entries(next).filter(([, value]) => value))));
	};
	return (
		<div className="space-y-1">
			<SettingsRow
				label={t('appearance.customEditing')}
				control={
					<SegmentedControl
						value={mode}
						ariaLabel={t('appearance.customEditing')}
						onChange={setMode}
						options={[
							{ value: 'light', label: t('appearance.mode.light') },
							{ value: 'dark', label: t('appearance.mode.dark') },
						]}
					/>
				}
			/>
			{CUSTOM_COLOR_KEYS.map((key) => (
				<ColorRow
					key={`${mode}-${key}`}
					label={t(LABELS[key])}
					value={colors[key]}
					onChange={(value) =>
						write((draft) => {
							draft[key] = value;
						})
					}
				/>
			))}
			<SettingsRow
				label={t('appearance.customFrom')}
				description={t('appearance.customFromDesc')}
				control={
					<Choice
						label={t('appearance.customFrom')}
						value=""
						className="w-44 max-w-full"
						options={[
							['', t('appearance.customFromPlaceholder')],
							...PALETTE_SCHEMES.map((id) => [id, t(`appearance.scheme.${id}`)] as const),
						]}
						onChange={(id) => id && copyFrom(id)}
					/>
				}
			/>
			<SettingsRow
				label={t('appearance.customReset')}
				control={
					<Button
						variant="secondary"
						size="sm"
						onClick={() => write((draft) => Object.assign(draft, DEFAULT_CUSTOM[mode]))}
					>
						{t('appearance.useDefault')}
					</Button>
				}
			/>
		</div>
	);
}
