import { DesignScope } from '../../../ui/react/design-scope';
// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/Settings.tsx
import { useContext, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Platform } from 'obsidian';
import type DashboardPlugin from '../../main';
import { t } from '../../../shared/i18n';
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import {
	SettingsRow,
	SettingsSwitchRow,
	SettingsBadge,
	SegmentedControl,
} from '../../../ui/components/huhu/SettingsFormControls';
import { SettingsSearchContext, SearchableSetting, SearchHighlight } from './SearchableSetting';
import type { AppSettings } from '../app-schema';
import { STATUS_ITEMS, itemShown, withItemShown } from '../../workbench/status-segments';
import { Button } from '../../../ui/components/button';
import type { WorkbenchTarget } from '../../contracts/workbench';
export function GeneralSettings({
	plugin,
	navigate,
}: {
	plugin: DashboardPlugin;
	navigate: (target: WorkbenchTarget) => void;
}) {
	const query = useContext(SettingsSearchContext);
	const sectionClass = query ? 'hidden has-[[data-searchable-setting]]:block' : undefined;
	const settings = useSyncExternalStore(
		useCallback((listener) => plugin.appSettings.subscribe(listener), [plugin]),
		() => plugin.appSettings.get(),
	);
	const alive = useRef(true);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);
	const [pending, setPending] = useState('');
	const [error, setError] = useState('');
	const [retry, setRetry] = useState<{ key: string; action: () => Promise<unknown> }>();
	const operations = useRef(0);
	const latest = useRef(0);
	const run = useCallback(
		(key: string, action: () => Promise<unknown>, retryAction = action) => {
			const sequence = ++latest.current;
			operations.current++;
			setPending(key);
			setError('');
			setRetry(undefined);
			void Promise.resolve().then(() => alive.current ? action() : undefined)
				.catch(() => {
					if (alive.current && sequence === latest.current) {
						setError(t('settings.writeFailed'));
						setRetry({ key, action: retryAction });
					}
				})
				.finally(() => {
					operations.current--;
					if (alive.current && operations.current === 0) setPending('');
				});
		},
		[],
	);
	const save = (key: string, recipe: (draft: AppSettings) => void) =>
		// update publishes before persistence; Retry saves current memory rather than replaying a toggle.
		run(key, () => plugin.appSettings.update(recipe), () => plugin.appSettings.update(() => {}));
	const row = (key: string, control: React.ReactNode, description?: string) => (
		<SearchableSetting title={t(key)} description={description} keywords={[key]}>
			<SettingsRow
				label={<SearchHighlight text={t(key)} />}
				description={description}
				control={control}
				className="flex-wrap"
			/>
		</SearchableSetting>
	);

	return (
		<div className="contents">
			{error && (
				<div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
					<span>{error}</span>
					{retry && <Button variant="secondary" disabled={!!pending} onClick={() => run(retry.key, retry.action)}>
						{t('workbench.retry')}
					</Button>}
				</div>
			)}
			<DesignScope className="space-y-3 min-w-0 px-1 break-words [&_[data-slot=label]]:break-all [&_[data-slot=settings-row]>div]:max-w-full [&_[data-slot=settings-row]>div]:min-w-0 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:break-all">
				<SettingsSection className={sectionClass} title={t('settings.homeGeneral')}>
					{row(
						'settings.language',
						<SegmentedControl
							value={settings.language}
							ariaLabel={t('settings.language')}
							onChange={(language) => run('language', () => plugin.changeLanguage(language))}
							options={[
								{ value: 'zh', label: t('settings.languageZh') },
								{ value: 'en', label: t('settings.languageEn') },
							]}
						/>,
						t('settings.languageDesc'),
					)}
					{settings.devGallery &&
						row(
							'settings.componentGallery',
							<Button
								variant="secondary"
								size="sm"
								onClick={() => navigate({ feature: 'settings', section: 'components' })}
							>
								{t('ui.open')}
							</Button>,
							t('shell.developmentMode'),
						)}
					{row(
						'content.title',
						<Button variant="secondary" size="sm" onClick={() => navigate({ feature: 'content' })}>
							{t('content.browse')}
						</Button>,
						t('content.settingsHint'),
					)}
				</SettingsSection>
			</DesignScope>
			<DesignScope className="space-y-3 min-w-0 px-1 break-words [&_[data-slot=label]]:break-all [&_[data-slot=settings-row]>div]:max-w-full [&_[data-slot=settings-row]>div]:min-w-0 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:break-all">
				<SettingsSection className={sectionClass} title={t('shell.statusBar')}>
					{STATUS_ITEMS.map((item) => (
						<SearchableSetting
							key={item.id}
							title={t('shell.showStatusItem', { item: t(item.labelKey) })}
							keywords={[item.labelKey]}
						>
							<SettingsSwitchRow
								label={t('shell.showStatusItem', { item: t(item.labelKey) })}
								ariaLabel={t('shell.showStatusItem', { item: t(item.labelKey) })}
								checked={itemShown(settings.statusBar, item.id)}
								disabled={!!pending}
								onChange={() =>
									save(`status-${item.id}`, (draft) => {
										draft.statusBar = withItemShown(
											draft.statusBar,
											item.id,
											!itemShown(draft.statusBar, item.id),
										);
									})
								}
							/>
						</SearchableSetting>
					))}
					{row(
						'shell.usageDisplay',
						<SegmentedControl
							value={settings.statusBar.usageDisplay}
							ariaLabel={t('shell.usageDisplay')}
							onChange={(value) =>
								save('display', (draft) => {
									draft.statusBar.usageDisplay = value;
								})
							}
							options={[
								{ value: 'used', label: t('shell.used') },
								{ value: 'remaining', label: t('shell.remaining') },
							]}
						/>,
					)}
					{row(
						'shell.usageMode',
						<SegmentedControl
							value={settings.statusBar.usageMode}
							ariaLabel={t('shell.usageMode')}
							onChange={(value) =>
								save('mode', (draft) => {
									draft.statusBar.usageMode = value;
								})
							}
							options={[
								{ value: 'verbose', label: t('shell.verbose') },
								{ value: 'compact', label: t('shell.compact') },
							]}
						/>,
					)}
				</SettingsSection>
			</DesignScope>
			<SettingsSection className={sectionClass} title={t('settings.homeModules')}>
				{plugin.moduleManifests().map((manifest) => (
					<SearchableSetting
						key={manifest.id}
						title={t(manifest.titleKey)}
						description={t(manifest.descriptionKey)}
						keywords={[manifest.id]}
					>
						<SettingsSwitchRow
							label={
								<>
									<SearchHighlight text={t(manifest.titleKey)} />
									{!manifest.platforms.mobile && (
										<SettingsBadge className="ml-2">{t('shell.desktopRequired')}</SettingsBadge>
									)}
								</>
							}
							ariaLabel={t(manifest.titleKey)}
							description={t(manifest.descriptionKey)}
							checked={settings.modules[manifest.id]}
							disabled={!!pending || (Platform.isMobile && !manifest.platforms.mobile)}
							onChange={() =>
								run(manifest.id, () =>
									plugin.setModuleEnabled(manifest.id, !settings.modules[manifest.id]),
								)
							}
						/>
					</SearchableSetting>
				))}
			</SettingsSection>
		</div>
	);
}
