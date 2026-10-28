import { agentWorkbenchPath } from '../../../../shared/storage/vault-layout';
import {
	AUTOMATION_DEFINITIONS_OWNER,
	AUTOMATION_RUNTIME_OWNER,
	automationRuntimePath,
	isAutomationDefinitionPath,
} from '../../../automations/api';
import { NOTIFICATIONS_RECOVERY_OWNER, notificationInboxPath } from '../../../notifications/api';
import { DEVICE_ID, type SectionKind } from './format';

/** Owner ids registered by this module and the others (see each module's api). */
export const OWNER = {
	settings: 'settings',
	records: 'agent-workbench-records',
	history: 'agent-history',
	stats: 'agent-workspace-stats',
	registry: 'agent-automation-sessions',
	runtime: AUTOMATION_RUNTIME_OWNER,
	definitions: AUTOMATION_DEFINITIONS_OWNER,
	inbox: NOTIFICATIONS_RECOVERY_OWNER,
} as const;

export const SECTION_OWNER: Record<SectionKind, string> = {
	'settings-agent': OWNER.settings,
	'workbench-records': OWNER.records,
	'history-annotations': OWNER.history,
	'workspace-stats': OWNER.stats,
	'automation-sessions': OWNER.registry,
	'automation-runtime': OWNER.runtime,
	'notifications-inbox': OWNER.inbox,
	'automation-definition': OWNER.definitions,
};

export function assertDevice(device: string): string {
	if (!DEVICE_ID.test(device)) throw new Error('huhu-storage.invalid-device');
	return device;
}

/** The only place section kinds meet file paths. A package never supplies one. */
export function sectionPath(section: Exclude<SectionKind, 'automation-definition'>, device: string): string {
	assertDevice(device);
	const agentDir = `.huhu/terminal-agent/${device}`;
	switch (section) {
		case 'settings-agent':
			return `.huhu/config/devices/${device}.json`;
		case 'workbench-records':
			return agentWorkbenchPath(device);
		case 'history-annotations':
			return `${agentDir}/history.json`;
		case 'workspace-stats':
			return `${agentDir}/workspace-stats.json`;
		case 'automation-sessions':
			return `${agentDir}/automation-sessions.json`;
		case 'automation-runtime':
			return automationRuntimePath(device);
		case 'notifications-inbox':
			return notificationInboxPath(device);
	}
}

/** Directories whose children name devices. Used only to enumerate what exists. */
export const DEVICE_DIRECTORIES = ['.huhu/terminal-agent', '.huhu/automation', '.huhu/notifications'] as const;
export const DEVICE_SETTINGS_DIRECTORY = '.huhu/config/devices';
export { isAutomationDefinitionPath };

/** Where exported packages and the last import report are kept inside the vault. */
export const EXPORT_DIRECTORY = '.huhu/exports';
export const IMPORT_REPORT_PATH = '.huhu/recovery/backup-import/last.json';
export const IMPORT_PROGRESS_PATH = '.huhu/recovery/backup-import/progress.json';
