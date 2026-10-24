import type { App } from 'obsidian';
import type { ModuleContext } from '../../../app/contracts/module';
import type { AppWithCommands } from '../../../host/obsidian/obsidian-internal';
import { AutomationError } from '../../../shared/automation/errors';
import type { AutomationTaskDelivery } from '../../../shared/automation/types';
import { locateTaskLine } from '../../../shared/automation/task-line';
import { openNoteAt } from '../../../host/obsidian/open-note';
import { t } from '../../../shared/i18n/index';
import { BROWSER_OPEN } from '../../browser/api';
import type { ActionHost } from '../core/actions/definition';

/** Open a note of the vault in a tab of Obsidian's own editor, at a line when one is given (0-based). */
export async function openNote(app: App, path: string, line?: number): Promise<void> {
	const file = app.vault.getFileByPath(path);
	if (!file) throw new AutomationError('sourceMissing');
	await app.workspace.getLeaf('tab').openFile(file, line === undefined ? undefined : { eState: { line } });
}

/** Receipts outlive their original line positions and the home module's activation. */
export async function openCalendarSource(
	app: App,
	delivery: AutomationTaskDelivery,
	owner?: Window,
): Promise<void> {
	const receipt = delivery.receipt;
	if (!receipt || typeof receipt.id !== 'string' || !receipt.id ||
		typeof delivery.effectKey !== 'string' || !delivery.effectKey ||
		(receipt.effectKey !== undefined && receipt.effectKey !== delivery.effectKey))
		throw new AutomationError('calendarSourceChanged');
	const file = app.vault.getFileByPath(receipt.path);
	if (!file) throw new AutomationError('sourceMissing');
	for (let attempt = 0; attempt < 2; attempt++) {
		if (owner?.closed) throw new AutomationError('cancelled');
		const { mtime, size } = file.stat;
		const content = await app.vault.read(file);
		if (owner?.closed) throw new AutomationError('cancelled');
		if (file.path !== receipt.path || app.vault.getFileByPath(receipt.path) !== file)
			throw new AutomationError('sourceMissing');
		if (file.stat.mtime !== mtime || file.stat.size !== size) continue;
		const line = locateTaskLine(content, { ...receipt, effectKey: delivery.effectKey }, mtime);
		if (line === undefined) throw new AutomationError('calendarSourceChanged');
		await openNoteAt(app, file, { owner, line });
		return;
	}
	throw new AutomationError('calendarSourceChanged');
}

/** What in-process actions do to Obsidian: the host the run service hands to them. */
export function createActionHost(context: ModuleContext): ActionHost {
	const { app } = context;
	return {
		openFile: (path) => openNote(app, path),
		openUrl: async (url) => {
			const browser = await context.services.acquire(BROWSER_OPEN);
			if (browser) await browser.value.open({ url, target: 'tab' });
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
