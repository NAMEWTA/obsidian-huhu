// Layout adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/SettingsFormControls.tsx
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import type { SettingsHandle } from '../../../shared/settings/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/components/select';
import { NumberField, SettingsRow, SettingsSwitchRow } from '../../../ui/components/huhu/SettingsFormControls';
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import { useT } from '../../../ui/react/hooks';
import { IDLE_PRESETS, MAX_IDLE_MINUTES, MIN_IDLE_MINUTES, type IdlePreset } from '../core/policy';
import type { SafeSettings } from '../settings';

const presetLabels: Record<IdlePreset, string> = {
	'5': 'safe.settings.idle5',
	'20': 'safe.settings.idle20',
	'60': 'safe.settings.idle60',
	custom: 'safe.settings.idleCustom',
	never: 'safe.settings.idleNever',
};

/** The lock rules of the safe. Changes apply to a running session at once. */
export function safeSettingsPage(settings: SettingsHandle<SafeSettings>) {
	return function SafeSettingsPage() {
		const t = useT();
		const value = useSyncExternalStore(listener => settings.subscribe(listener), () => settings.get());
		const save = <K extends keyof SafeSettings>(key: K, next: SafeSettings[K]) => {
			void settings.update(draft => { draft[key] = next; }).catch(() => toast.error(t('settings.writeFailed')));
		};
		return <div className="space-y-8">
			<SettingsSection title={t('safe.settings.lockHeading')} description={t('safe.settings.lockDescription')}>
				<SettingsRow
					label={t('safe.settings.idle')}
					description={t('safe.settings.idleDesc')}
					control={<Select value={value.idlePreset} onValueChange={next => save('idlePreset', next as IdlePreset)}>
						<SelectTrigger className="w-40" aria-label={t('safe.settings.idle')}><SelectValue /></SelectTrigger>
						<SelectContent>
							{IDLE_PRESETS.map(preset => <SelectItem key={preset} value={preset}>{t(presetLabels[preset])}</SelectItem>)}
						</SelectContent>
					</Select>}
				/>
				{value.idlePreset === 'custom' && <NumberField
					label={t('safe.settings.idleMinutes')}
					description={t('safe.settings.idleMinutesDesc')}
					value={value.idleCustomMinutes}
					min={MIN_IDLE_MINUTES}
					max={MAX_IDLE_MINUTES}
					integer
					suffix={t('safe.settings.minutes')}
					onChange={minutes => save('idleCustomMinutes', minutes)}
				/>}
				<SettingsSwitchRow label={t('safe.settings.lockOnSwitch')} description={t('safe.settings.lockOnSwitchDesc')} checked={value.lockOnSwitch} onChange={() => save('lockOnSwitch', !value.lockOnSwitch)} />
				<SettingsSwitchRow label={t('safe.settings.lockOnClose')} description={t('safe.settings.lockOnCloseDesc')} checked={value.lockOnClose} onChange={() => save('lockOnClose', !value.lockOnClose)} />
				<SettingsSwitchRow label={t('safe.settings.lockOnQuit')} description={t('safe.settings.lockOnQuitDesc')} checked disabled onChange={() => {}} />
			</SettingsSection>
		</div>;
	};
}
