import type { ShellAccess } from '../../../app/contracts/module';
import type { AutomationDefinition } from '../../../shared/automation/types';
import type { AutomationSource } from '../../automations/api';
/** Structural port: the contributor neither imports services nor owns a second index. */
export function genericRemindersSource(
	source: {
		reminders(): Promise<AutomationDefinition[]>;
		saveReminder(definition: AutomationDefinition, remove?: boolean): Promise<void>;
	},
	shell: ShellAccess,
): AutomationSource {
	return {
		kinds: ['contacts'],
		list: () => source.reminders(),
		save: (definition, remove) => source.saveReminder(definition, remove),
		open: (reference, ownerWindow) =>
			shell.open({ feature: 'contacts', resourceId: reference.id || reference.path }, ownerWindow),
	};
}
