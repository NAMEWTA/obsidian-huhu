import type { SettingsPageHost } from '../../../app/contracts/module';
import type IconicController from '../platform/host/controller';
import { useT } from '../../../ui/react/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/components/tabs';
import { IconicSettings, ICONIC_SETTINGS_PAGES } from './settings/sections';

const labels = [
	'settings.tabGeneral',
	'iconic.settings.headingSidebarsAndTabs',
	'iconic.settings.headingEditor',
	'iconic.settings.headingMenusAndDialogs',
	'iconic.settings.headingIconPicker',
	'iconic.settings.headingAdvanced',
] as const;

/** The existing preferences and rule dialogs have one home, under Settings → Icons. */
export function iconsSettingsPage(getController: () => IconicController | undefined) {
	return function IconsSettingsPage({ resourceId }: SettingsPageHost) {
		const t = useT(), controller = getController();
		if (!controller?.isActive()) return <p role="status">{t('workbench.notReady')}</p>;
		const selected = ICONIC_SETTINGS_PAGES.find((id) => id === resourceId) ?? 'iconic-general';
		return (
			<Tabs defaultValue={selected} className="space-y-5">
				<TabsList className="flex h-auto w-full flex-wrap">
					{ICONIC_SETTINGS_PAGES.map((id, index) => (
						<TabsTrigger key={id} value={id} className="flex-auto">{t(labels[index]!)}</TabsTrigger>
					))}
				</TabsList>
				{ICONIC_SETTINGS_PAGES.map((id) => (
					<TabsContent key={id} value={id}><IconicSettings plugin={controller} section={id} /></TabsContent>
				))}
			</Tabs>
		);
	};
}
