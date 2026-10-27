import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import type { SettingsHandle } from '../../../shared/settings/store';
import { useT } from '../../../ui/react/hooks';
import { Input } from '../../../ui/components/input';
import { SettingsRow } from '../../../ui/components/huhu/SettingsFormControls';
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import type { HuhuBotSettings } from '../settings';

/** Device-local runner settings. Credentials are deliberately absent. */
export function huhubotSettingsPage(settings: SettingsHandle<HuhuBotSettings>) {
	return function HuhuBotSettingsPage() {
		const translate = useT();
		const value = useSyncExternalStore(listener => settings.subscribe(listener), () => settings.get());
		const save = <K extends keyof HuhuBotSettings>(key: K, next: HuhuBotSettings[K]) => {
			void settings.update(draft => { draft[key] = next; }).catch(() => toast.error(translate('settings.writeFailed')));
		};
		return <div className="space-y-8">
			<SettingsSection title={translate('huhubot.settings.runner')} description={translate('huhubot.settings.runnerDesc')}>
				<SettingsRow label={translate('huhubot.settings.binaryPath')} description={translate('huhubot.settings.binaryPathDesc')} control={<Input aria-label={translate('huhubot.settings.binaryPath')} value={value.binaryPath} onChange={event => save('binaryPath', event.currentTarget.value)} />} />
				<SettingsRow label={translate('huhubot.settings.workingDirectory')} description={translate('huhubot.settings.workingDirectoryDesc')} control={<Input aria-label={translate('huhubot.settings.workingDirectory')} value={value.workingDirectory} onChange={event => save('workingDirectory', event.currentTarget.value)} />} />
				<SettingsRow label={translate('huhubot.settings.profileRoot')} description={translate('huhubot.settings.profileRootDesc')} control={<Input aria-label={translate('huhubot.settings.profileRoot')} value={value.profileRoot} onChange={event => save('profileRoot', event.currentTarget.value)} />} />
			</SettingsSection>
			<p className="text-xs text-muted-foreground">{translate('huhubot.settings.secretBoundary')}</p>
		</div>;
	};
}
