import type { App } from 'obsidian';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ContainerProviders } from '../../../../ui/react/providers';
import { restoreFocus } from '../../../../ui/react/modal-layer';
import { t } from '../../../../shared/i18n';
import type { AutomationDefinition } from '../../../../shared/automation/types';
import type { AutomationComposeRequest } from '../../api';
import type { AutomationViewHost } from '../panel-contract';
import { EditorView } from '../editor/EditorView';
import { RetainedEditorDialog } from '../editor/RetainedEditorDialog';
import { DiscardDialog } from '../dialogs/DiscardDialog';

/** The public composer owns one retained form root; canonical Dialog owns its modal/focus behavior. */
export function openComposer(
	app: App,
	host: AutomationViewHost,
	request: AutomationComposeRequest,
	signal?: AbortSignal,
): Promise<AutomationDefinition | undefined> {
	return new Promise((resolve) => {
		if (signal?.aborted) return resolve(undefined);
		const win =
				request.ownerWindow ??
				app.workspace.getMostRecentLeaf()?.view.containerEl.win ??
				app.workspace.containerEl.win,
			doc = win.document;
		const recent = app.workspace?.getMostRecentLeaf?.()?.view.containerEl;
		const owner =
			doc.activeElement?.closest<HTMLElement>('[role="dialog"], .huhu-ui') ??
			(recent?.ownerDocument === doc ? recent : doc.body);
		const previous = doc.activeElement as HTMLElement | null;
		const logicalLeaf =
			owner.closest<HTMLElement>('[data-huhu-leaf]') ??
			(recent?.ownerDocument === doc
				? (recent.querySelector<HTMLElement>('[data-huhu-leaf]') ??
					recent.closest<HTMLElement>('.workspace-leaf-content'))
				: null);
		const container = doc.createElement('div');
		container.className = 'huhu-ui';
		doc.body.append(container);
		const root = createRoot(container),
			controller = new AbortController();
		let closed = false,
			dirty = false,
			currentDoc = doc,
			shown = true;
		let observer: MutationObserver | undefined;
		const visibleOwner = () => {
			for (let node: HTMLElement | null = owner; node; node = node.parentElement) {
				const style = node.ownerDocument.defaultView?.getComputedStyle(node);
				if (node.hidden || style?.display === 'none' || style?.visibility === 'hidden') return false;
			}
			return true;
		};
		const finish = (saved?: AutomationDefinition) => {
			if (closed) return;
			closed = true;
			controller.abort();
			observer?.disconnect();
			currentDoc.defaultView?.removeEventListener('unload', stop);
			signal?.removeEventListener('abort', stop);
			queueMicrotask(() => {
				const physicalDoc = container.ownerDocument;
				root.unmount();
				container.remove();
				if (owner.isConnected && visibleOwner()) restoreFocus(physicalDoc, previous, owner);
				resolve(saved);
			});
		};
		const stop = () => finish();
		function Body({ visible }: { visible: boolean }) {
			const [discarding, setDiscarding] = useState(false);
			if (!visible && discarding) setDiscarding(false);
			const close = () => {
				if (dirty) setDiscarding(true);
				else finish();
			};
			return (
				<ContainerProviders container={container} visible={visible}>
					<RetainedEditorDialog visible={visible} title={t('automation.new')} onClose={close}>
						<EditorView
							dialog
							request={{ action: request.action, source: request.source, prefill: request.prefill }}
							host={host}
							signal={controller.signal}
							logicalLeaf={logicalLeaf}
							onDirty={(value) => {
								dirty = value;
							}}
							onSaved={(definition) => {
								if (closed || controller.signal.aborted) return;
								dirty = false;
								finish(definition);
							}}
							onClose={close}
						/>
						{discarding && visible && (
							<DiscardDialog
								name={t('automation.new')}
								onCancel={() => setDiscarding(false)}
								onConfirm={() => {
									dirty = false;
									finish();
								}}
							/>
						)}
					</RetainedEditorDialog>
				</ContainerProviders>
			);
		}
		const render = () => root.render(<Body visible={shown} />);
		const follow = () => {
			if (closed) return;
			if (!owner.isConnected) return finish();
			const nextDoc = owner.ownerDocument,
				nextVisible = visibleOwner();
			let changed = nextVisible !== shown;
			if (nextDoc !== currentDoc) {
				currentDoc.defaultView?.removeEventListener('unload', stop);
				currentDoc = nextDoc;
				currentDoc.body.append(container);
				watch();
				changed = true;
			}
			shown = nextVisible;
			if (changed) render();
		};
		const watch = () => {
			observer?.disconnect();
			const Observer = currentDoc.defaultView!.MutationObserver;
			observer = new Observer(follow);
			observer.observe(currentDoc.body, {
				subtree: true,
				childList: true,
				attributes: true,
				attributeFilter: ['hidden', 'inert', 'style', 'class'],
			});
			currentDoc.defaultView?.addEventListener('unload', stop, { once: true });
		};
		shown = visibleOwner();
		watch();
		signal?.addEventListener('abort', stop, { once: true });
		render();
		if (signal?.aborted) stop();
	});
}
