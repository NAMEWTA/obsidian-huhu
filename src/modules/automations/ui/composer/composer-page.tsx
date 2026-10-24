import type { App } from 'obsidian';
import { openReactDialog } from '../../../../ui/react/dialog';
import { t } from '../../../../shared/i18n';
import type { AutomationDefinition } from '../../../../shared/automation/types';
import type { AutomationComposeRequest } from '../../api';
import type { AutomationViewHost } from '../panel-contract';
import { EditorView } from '../editor/EditorView';

/**
 * Show the "New automation" dialog in the window the request names (the one of the most recent leaf by
 * default). It holds the same form as the automation board's editor, so the form follows the chosen action.
 * Resolves when the dialog closes: to the saved definition, or to `undefined` when nothing was saved.
 */
export function openComposer(
	app: App,
	host: AutomationViewHost,
	request: AutomationComposeRequest,
	signal?: AbortSignal,
): Promise<AutomationDefinition | undefined> {
	return new Promise((resolve) => {
		let saved: AutomationDefinition | undefined;
		const win = request.ownerWindow ?? app.workspace.getMostRecentLeaf()?.view.containerEl.win ?? app.workspace.containerEl.win;
		const doc = win.document;
		// Follow the surface that asked, so the dialog stays with it when that surface moves or closes.
		const owner = doc.activeElement?.closest<HTMLElement>('[role="dialog"], .huhu-ui') ?? doc.body;
		if (signal?.aborted) return resolve(undefined);
		const dialog = openReactDialog(owner, {
			title: t('automation.new'),
			className:
				'flex h-[min(46rem,calc(100vh-2rem))] w-[min(62rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[62rem]',
			headerClassName: 'shrink-0 border-b border-border/50 px-6 py-4',
			content: (close) => (
				<EditorView
					dialog
					request={{ action: request.action, source: request.source, prefill: request.prefill }}
					host={host}
					onSaved={(definition) => {
						saved = definition;
						close();
					}}
					onClose={close}
				/>
			),
			onClose: () => {
				signal?.removeEventListener('abort', stop);
				resolve(saved);
			},
		});
		const stop = () => dialog.close();
		signal?.addEventListener('abort', stop, { once: true });
	});
}
