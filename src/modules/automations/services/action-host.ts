import type { App } from 'obsidian';
import type { ModuleContext } from '../../../app/contracts/module';
import type { AppWithCommands } from '../../../host/obsidian/obsidian-internal';
import { AutomationError } from '../../../shared/automation/errors';
import type { AutomationTaskDelivery } from '../../../shared/automation/types';
import type { TaskViews } from '../../task/api';
import { t } from '../../../shared/i18n/index';
import { BROWSER_OPEN } from '../../browser/api';
import type { ActionHost } from '../core/actions/definition';

/** Open a note of the vault in a tab of Obsidian's own editor, at a line when one is given (0-based). */
export async function openNote(app: App, path: string, line?: number): Promise<void> {
	const file = app.vault.getFileByPath(path);
	if (!file) throw new AutomationError('sourceMissing');
	await app.workspace.getLeaf('tab').openFile(file, line === undefined ? undefined : { eState: { line } });
}

/** A task receipt opens its stable domain identity, never a stale file offset. */
export async function openCalendarSource(
	views: TaskViews | undefined,
	delivery: AutomationTaskDelivery,
	owner?: Window,
): Promise<void> {
	if (owner?.closed) throw new AutomationError('cancelled');
	if (!views) throw new AutomationError('calendarUnavailable');
	if (!delivery.receipt?.taskId) throw new AutomationError('calendarSourceChanged');
	await views.open(delivery.receipt.taskId, owner);
}

/** What in-process actions do to Obsidian: the host the run service hands to them. */
export function createActionHost(context: ModuleContext): ActionHost {
	const { app } = context;
	return {
		openFile: (path) => openNote(app, path),
		openUrl: async (url) => {
			const browser = await context.services.acquire(BROWSER_OPEN);
			if (browser) await browser.value.open({ url });
			else app.workspace.containerEl.win.open(url, '_blank');
		},
		runCommand: (id) => {
			const commands = (app as AppWithCommands).commands;
			if (!commands.commands[id]) throw new AutomationError('invalid');
			commands.executeCommandById(id);
			return t('automation.invoked');
		},
	};
}
