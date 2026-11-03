import { useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { DesignScope, useDesignNotice } from '../../../../ui/react/design-scope';
import type DashboardPlugin from '../../../main';
import { registerMessages } from '../../../../shared/i18n';
import { messages } from '../../../../shared/i18n/lazy/appearance';
import { useOwnerWindow, useT } from '../../../../ui/react/hooks';
import { SettingsRow } from '../../../../ui/components/huhu/SettingsRow';
import { SettingsSwitchRow } from '../../../../ui/components/huhu/SettingsSwitchRow';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { Choice } from '../../../../ui/components/huhu/Choice';
import { Button } from '../../../../ui/components/button';
import { SearchableSetting } from '../SearchableSetting';
import { deriveCustomTokens } from '../../../../theme/custom';
import {
	ADDITIONAL_EDITOR_SCHEMES,
	ADDITIONAL_THEME_PRESETS,
	CYCLE_THEME_PRESETS,
	FEATURED_EDITOR_SCHEMES,
	EMPHASIS_STYLES,
	HEADING_STYLES,
	SULIWORLD_CARDS,
	SULIWORLD_VARIANTS,
	resetCurrentStyle,
	resolveTheme,
	themeSettings,
	type ThemeSettings,
} from '../../../../theme/settings';
import { parseExport, EXPORT_KIND, EXPORT_VERSION } from '../../appearance';
import { CustomColorsEditor } from './CustomColors';
import { SchemeSwatch, SwatchGrid, ThemeSwatch } from './swatches';
import { Typography } from './Typography';
import { StylePreview } from './StylePreview';

registerMessages(messages);

/** A block that is searched as one setting (the swatch grids are not label/control rows). */
function Block({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
	return (
		<SearchableSetting
			title={title}
			description={description}
			keywords={['theme', 'style', 'color', 'colour', '主题', '配色', '颜色', '样式']}
		>
			<span data-setting-label className="sr-only">
				{title}
			</span>
			{children}
		</SearchableSetting>
	);
}

/** Settings -> Appearance: curated styles, retained palettes, real samples, typography and backup. */
export function AppearanceSettings({ plugin }: { plugin: DashboardPlugin }) {
	return (
		<DesignScope className="min-w-0 break-words [&_[data-slot=label]]:break-all [&_[data-slot=settings-row]>div]:max-w-full [&_[data-slot=settings-row]>div]:min-w-0 [&_[data-slot=settings-row]>div]:break-words">
			<AppearanceContent plugin={plugin} />
		</DesignScope>
	);
}
function AppearanceContent({ plugin }: { plugin: DashboardPlugin }) {
	const t = useT();
	const owner = useOwnerWindow();
	const notice = useDesignNotice();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const [retry, setRetry] = useState<(() => Promise<void>) | undefined>();
	const operations = useRef(0);
	const latestOperation = useRef(0);
	const perform = (action: () => Promise<void>): Promise<void> => {
		const sequence = ++latestOperation.current;
		operations.current++;
		setPending(true);
		setError('');
		setRetry(undefined);
		const completion = Promise.resolve()
			.then(action)
			.catch((cause: unknown) => {
				if (sequence === latestOperation.current) {
					setError(t('settings.writeFailed'));
					setRetry(() => action);
				}
				throw cause;
			})
			.finally(() => {
				operations.current--;
				if (operations.current === 0) setPending(false);
			});
		return completion;
	};
	const handle = {
		...plugin.theme,
		update: (...args: Parameters<typeof plugin.theme.update>) => perform(() => plugin.theme.update(...args)),
	};
	const settings = useSyncExternalStore(
		(listener) => handle.subscribe(listener),
		() => handle.get(),
	);
	const fail = () => setError(t('settings.writeFailed'));
	const set = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) =>
		void handle
			.update((draft) => {
				draft[key] = value;
			})
			.catch(fail);
	const mode = owner.document.body.classList.contains('theme-dark') ? 'dark' : 'light';
	const customStyles = {
		light: deriveCustomTokens(settings.custom.light, 'light') as CSSProperties,
		dark: deriveCustomTokens(settings.custom.dark, 'dark') as CSSProperties,
	};
	const sample = {
		heading: t('appearance.sample.heading'),
		subheading: t('appearance.sample.subheading'),
		bold: t('appearance.sample.bold'),
		italic: t('appearance.sample.italic'),
		code: t('appearance.sample.code'),
		link: t('appearance.sample.link'),
		quote: t('appearance.sample.quote'),
	};
	const styleOptions = (ids: readonly string[]) => ids.map((id) => [id, t(`appearance.option.${id}`)] as const);
	const notify = (key: string) => notice(t(key));
	const resolved = resolveTheme(settings);
	return (
		<div className="space-y-5 min-w-0">
			{error && (
				<div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
					<span>{error}</span>
					{retry && (
						<Button variant="outline" disabled={pending} onClick={() => void perform(retry).catch(fail)}>
							{t('workbench.retry')}
						</Button>
					)}
				</div>
			)}
			<fieldset disabled={pending} aria-busy={pending} className="min-w-0 space-y-5 border-0 p-0 m-0">
				<p className="text-sm text-muted-foreground">{t('appearance.description')}</p>

				<SettingsSection title={t('appearance.theme')} description={t('appearance.themeDesc')}>
					<Block title={t('appearance.theme')} description={t('appearance.themeDesc')}>
						<SwatchGrid label={t('appearance.theme')}>
							{CYCLE_THEME_PRESETS.map((id) => (
								<ThemeSwatch
									variant={settings.suliworldVariant}
									key={id}
									id={id}
									selected={settings.preset === id}
									label={t(`appearance.preset.${id}`)}
									hint={id === 'default' ? t('appearance.preset.default.hint') : undefined}
									onSelect={() => set('preset', id)}
									customStyles={id === 'custom' ? customStyles : undefined}
								/>
							))}
						</SwatchGrid>
					</Block>
					<SettingsRow
						label={t('appearance.additionalThemes')}
						description={t('appearance.additionalThemesDesc')}
						control={
							<Choice
								label={t('appearance.additionalThemes')}
								className="w-64 max-w-full"
								value={ADDITIONAL_THEME_PRESETS.includes(settings.preset) ? settings.preset : ''}
								options={[
									['', t('appearance.additionalPlaceholder')],
									...ADDITIONAL_THEME_PRESETS.map((id) => [id, t(`appearance.preset.${id}`)] as const),
								]}
								onChange={(value) => {
									if (value) set('preset', value as ThemeSettings['preset']);
								}}
							/>
						}
					/>
					{settings.preset === 'suliworld' && (
						<>
							<SettingsRow
								label={t('appearance.suliworldVariant')}
								description={t('appearance.suliworldVariantDesc')}
								control={
									<Choice
										label={t('appearance.suliworldVariant')}
										className="w-52 max-w-full"
										value={settings.suliworldVariant}
										options={SULIWORLD_VARIANTS.map(
											(id) => [id, t(`appearance.variant.${id}`)] as const,
										)}
										onChange={(value) =>
											set('suliworldVariant', value as ThemeSettings['suliworldVariant'])
										}
									/>
								}
							/>
							<SettingsRow
								label={t('appearance.suliworldCards')}
								description={t('appearance.suliworldCardsDesc')}
								control={
									<Choice
										label={t('appearance.suliworldCards')}
										className="w-52 max-w-full"
										value={settings.suliworldCards}
										options={SULIWORLD_CARDS.map((id) => [id, t(`appearance.cards.${id}`)] as const)}
										onChange={(value) =>
											set('suliworldCards', value as ThemeSettings['suliworldCards'])
										}
									/>
								}
							/>
						</>
					)}
					{settings.preset === 'custom' && (
						<div className="rounded-lg border border-border p-3">
							<p className="mb-2 text-xs text-muted-foreground">{t('appearance.customDesc')}</p>
							<CustomColorsEditor
								onError={fail}
								handle={handle}
								settings={settings}
								initialMode={mode}
								ownerDocument={owner.document}
							/>
						</div>
					)}
				</SettingsSection>

				<SettingsSection title={t('appearance.editor')} description={t('appearance.editorDesc')}>
					<Block title={t('appearance.editor')} description={t('appearance.editorDesc')}>
						<SwatchGrid label={t('appearance.editor')} wide>
							{FEATURED_EDITOR_SCHEMES.map((id) => (
								<SchemeSwatch
									key={id}
									id={id}
									selected={settings.editor === id}
									label={t(`appearance.scheme.${id}`)}
									hint={id === 'follow' ? t('appearance.scheme.follow.hint') : undefined}
									onSelect={() => set('editor', id)}
									sample={sample}
								/>
							))}
						</SwatchGrid>
					</Block>
					<SettingsRow
						label={t('appearance.additionalEditors')}
						description={t('appearance.additionalEditorsDesc')}
						control={
							<Choice
								label={t('appearance.additionalEditors')}
								className="w-64 max-w-full"
								value={ADDITIONAL_EDITOR_SCHEMES.includes(settings.editor) ? settings.editor : ''}
								options={[
									['', t('appearance.additionalPlaceholder')],
									...ADDITIONAL_EDITOR_SCHEMES.map((id) => [id, t(`appearance.scheme.${id}`)] as const),
								]}
								onChange={(value) => {
									if (value) set('editor', value as ThemeSettings['editor']);
								}}
							/>
						}
					/>
					<p className="text-xs text-muted-foreground" role="status">
						{settings.editor === 'follow'
							? t('appearance.effectiveFollow', { style: t(`appearance.preset.${settings.preset}`) })
							: t('appearance.effectiveIndependent', { style: t(`appearance.scheme.${settings.editor}`) })}
					</p>
					{resolved.effectiveEditor === 'suliworld' && (
						<>
							<SettingsSwitchRow
								label={t('appearance.plainQuotes')}
								description={t('appearance.plainQuotesDesc')}
								checked={settings.suliworldPlainQuotes}
								onChange={() => set('suliworldPlainQuotes', !settings.suliworldPlainQuotes)}
							/>
							<SettingsSwitchRow
								label={t('appearance.plainEmbeds')}
								description={t('appearance.plainEmbedsDesc')}
								checked={settings.suliworldPlainEmbeds}
								onChange={() => set('suliworldPlainEmbeds', !settings.suliworldPlainEmbeds)}
							/>
						</>
					)}
					<SettingsRow
						label={t('appearance.headings')}
						description={t('appearance.headingsDesc')}
						control={
							<Choice
								label={t('appearance.headings')}
								className="w-52 max-w-full"
								value={settings.headings}
								options={styleOptions(HEADING_STYLES)}
								onChange={(value) => set('headings', value as ThemeSettings['headings'])}
							/>
						}
					/>
					<SettingsRow
						label={t('appearance.emphasis')}
						description={t('appearance.emphasisDesc')}
						control={
							<Choice
								label={t('appearance.emphasis')}
								className="w-52 max-w-full"
								value={settings.emphasis}
								options={styleOptions(EMPHASIS_STYLES)}
								onChange={(value) => set('emphasis', value as ThemeSettings['emphasis'])}
							/>
						}
					/>
					<SettingsRow
						label={t('appearance.resetStyle')}
						description={t('appearance.resetStyleDesc')}
						control={
							<Button
								variant="outline"
								onClick={() =>
									void handle
										.update((draft) => resetCurrentStyle(draft), { persist: 'immediate' })
										.catch(fail)
								}
							>
								{t('appearance.resetStyle')}
							</Button>
						}
					/>
				</SettingsSection>

				<SettingsSection title={t('appearance.previewTitle')} description={t('appearance.previewIntro')}>
					<StylePreview app={plugin.app} settings={settings} />
				</SettingsSection>

				<SettingsSection title={t('appearance.fonts')} description={t('appearance.fontsDesc')}>
					<Typography handle={handle} settings={settings} onError={fail} />
				</SettingsSection>

				<SettingsSection title={t('appearance.backup')}>
					<SettingsRow
						label={t('appearance.export')}
						description={t('appearance.exportDesc')}
						control={
							<Button
								variant="outline"
								onClick={() =>
									void perform(() => owner.navigator.clipboard
										.writeText(
											JSON.stringify(
												{ kind: EXPORT_KIND, version: EXPORT_VERSION, settings: handle.get() },
												null,
												2,
											),
										)
										).then(() => notify('appearance.exported'), fail)
								}
							>
								{t('appearance.export')}
							</Button>
						}
					/>
					<SettingsRow
						label={t('appearance.import')}
						description={t('appearance.importDesc')}
						control={
							<Button
								variant="outline"
								onClick={() =>
									void perform(() => owner.navigator.clipboard
										.readText()
										.then(async (text) => {
											const imported = parseExport(text);
											if (!imported) {
												setError(t('appearance.importFailed'));
												return;
											}
											await plugin.theme.update(() => imported, { persist: 'immediate' });
											notify('appearance.imported');
										}))
										.catch(fail)
								}
							>
								{t('appearance.import')}
							</Button>
						}
					/>
					<SettingsRow
						label={t('appearance.reset')}
						description={t('appearance.resetDesc')}
						control={
							<Button
								variant="outline"
								onClick={() =>
									void handle.update(() => themeSettings.defaults(), { persist: 'immediate' }).catch(fail)
								}
							>
								{t('appearance.reset')}
							</Button>
						}
					/>
				</SettingsSection>
			</fieldset>
		</div>
	);
}
