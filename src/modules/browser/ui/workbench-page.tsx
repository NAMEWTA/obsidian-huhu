import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Notice } from 'obsidian';
import type { WorkbenchPageBinding } from '../../../app/contracts/workbench-host';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { ReactSurface } from '../../../ui/react/surface';
import { HuhuProviders } from '../../../ui/react/providers';
import type { BrowserEngine } from '../services/host';
import type { BrowserPageHandle } from '../api';
import type { SharedBrowserPort } from '../../../app/contracts/shared-workspace';
import { EmptyState } from '../../../ui/components/huhu/EmptyState';
import { Button } from '../../../ui/components/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '../../../ui/components/alert-dialog';
import { t as translate } from '../../../shared/i18n';
import { Globe } from 'lucide-react';
import { useT } from '../../../ui/react/hooks';

/** Late-bound in-page confirmation shared between a page binding and its mounted canvas. */
export interface CloseConfirmer {
	ask?: (message: string) => Promise<boolean>;
	/** Installs the canvas dialog; the returned function removes it. */
	bind(ask: (message: string) => Promise<boolean>): () => void;
}
const reportError = (error: unknown): void => {
	new Notice(error instanceof Error ? error.message : String(error));
};

export function BrowserCanvas({
	host,
	shared,
	pageId,
	confirmer,
}: {
	host: BrowserEngine;
	shared: SharedBrowserPort;
	pageId?: string;
	/** Receives the in-page confirmation while this canvas is mounted; explicit close asks through it. */
	confirmer?: CloseConfirmer;
}) {
	const t = useT();
	const [confirmation, setConfirmation] = useState<{ message: string; resolve: (yes: boolean) => void }>();
	const [opening, setOpening] = useState(false);
	const confirmationRef = useRef(confirmation);
	const finish = (yes: boolean) => {
		confirmationRef.current?.resolve(yes);
		confirmationRef.current = undefined;
		setConfirmation(undefined);
	};
	useEffect(() => {
		if (!confirmer) return;
		const unbind = confirmer.bind(
			(message) =>
				new Promise<boolean>((resolve) => {
					confirmationRef.current?.resolve(false);
					const next = { message, resolve };
					confirmationRef.current = next;
					setConfirmation(next);
				}),
		);
		return () => {
			unbind();
			confirmationRef.current?.resolve(false);
			confirmationRef.current = undefined;
		};
	}, [confirmer]);
	const placeholder = useRef<HTMLDivElement>(null);
	const [chrome, setChrome] = useState<ReactNode>();
	const [ownerDocument, setOwnerDocument] = useState<Document>(() => host.app.workspace.containerEl.ownerDocument);
	const subscribe = useCallback((listener: () => void) => shared.subscribe(listener), [shared]);
	useSyncExternalStore(
		subscribe,
		() => JSON.stringify(shared.list()),
		() => JSON.stringify(shared.list()),
	);
	const tabs = shared.list();
	// A page id without a record (closed or never created) shows the empty state; it must never take over another tab's webview.
	const tab = pageId ? tabs.find((item) => item.pageId === pageId) : tabs[0];
	const page: BrowserPageHandle | undefined = tab
		? (host.getPage(tab.pageId) ??
			host.createPage({ restoreId: tab.pageId, url: tab.url, profileId: tab.profileId, zoom: tab.zoom }))
		: undefined;
	useLayoutEffect(() => {
		if (!page || !placeholder.current) return;
		setOwnerDocument(placeholder.current.ownerDocument);
		page.mount(placeholder.current);
		let live = true;
		void host.renderChrome(page).then((node) => {
			if (live) setChrome(node as ReactNode);
		});
		const sync = () => {
			const state = page.store.getState();
			shared.update(page.id, { ...state, profileId: state.profileId ?? 'default' });
		};
		const off = page.store.subscribe(sync);
		sync();
		return () => {
			live = false;
			off();
			page.unmount();
		};
	}, [host, shared, page]);
	if (!page)
		return (
			<EmptyState
				className="h-full"
				icon={<Globe />}
				title={t('browser.title')}
				description={pageId ? undefined : t('browser.newTab')}
				action={
					pageId ? (
						<Button
							variant="outline"
							disabled={opening}
							onClick={() => {
								// Opening is explicit so a page whose record was removed elsewhere is never silently recreated.
								if (opening) return;
								setOpening(true);
								let created: BrowserPageHandle;
								try {
									created = host.createPage({ restoreId: pageId });
								} catch (error) {
									setOpening(false);
									reportError(error);
									return;
								}
								void shared
									.open({
										id: `tab-${crypto.randomUUID()}`,
										pageId: created.id,
										title: created.title,
										url: created.url,
										profileId: created.profileId,
										zoom: 1,
										createdAt: Date.now(),
									})
									.catch((error: unknown) => {
										host.disposePage(created.id);
										reportError(error);
									})
									.finally(() => setOpening(false));
							}}
						>
							{t('browser.newTab')}
						</Button>
					) : undefined
				}
			/>
		);
	return (
		<HuhuProviders ownerDocument={ownerDocument} visible>
			<div className="huhu-browser-tab flex h-full min-h-0 flex-col">
				{chrome}
				<div ref={placeholder} className="relative min-h-0 flex-1" />
			</div>
			<AlertDialog
				open={!!confirmation}
				onOpenChange={(open) => {
					if (!open) finish(false);
				}}
			>
				<AlertDialogContent>
					<AlertDialogTitle>{t('browser.close')}</AlertDialogTitle>
					<AlertDialogDescription className="whitespace-pre-line break-words">
						{confirmation?.message}
					</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => finish(false)}>{t('ui.cancel')}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => finish(true)}
						>
							{t('browser.close')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</HuhuProviders>
	);
}

export function createBrowserPage(
	host: BrowserEngine,
	shared: SharedBrowserPort,
	context: NativeSurfaceContext,
	target: WorkbenchTarget,
): WorkbenchPageBinding {
	class BrowserSurface extends ReactSurface {
		getViewType() {
			return 'huhu-browser-workbench';
		}
		getDisplayText() {
			return 'Browser';
		}
		getIcon() {
			return 'globe';
		}
		protected renderContent() {
			return <BrowserCanvas host={host} shared={shared} pageId={target.resourceId} confirmer={confirmer} />;
		}
	}
	const surface = new BrowserSurface(context);
	const confirmer: CloseConfirmer = {
		bind(ask) {
			confirmer.ask = ask;
			return () => {
				if (confirmer.ask === ask) confirmer.ask = undefined;
			};
		},
	};
	return {
		surface,
		getTarget: () => target,
		closeResource: async () => {
			if (!target.resourceId) return true;
			// Same guard as closing the tab from the Agent workspace: running downloads are cancelled with the page.
			const count =
				host
					.getPage(target.resourceId)
					?.store.getState()
					.downloads.filter((d) => d.state === 'progressing').length ?? 0;
			if (count && !(await (confirmer.ask?.(translate('browser.closeDownloads', { count })) ?? false)))
				return false;
			await host.closePage(target.resourceId);
			return true;
		},
		navigate: async (next) => {
			if (next.resourceId) shared.activate(next.resourceId);
		},
	};
}
