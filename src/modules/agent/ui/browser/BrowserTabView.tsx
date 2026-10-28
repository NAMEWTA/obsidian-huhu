import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Globe } from 'lucide-react';
import type { BrowserTabData } from '../../core/workspace/model';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { HuhuProviders } from '../../../../ui/react/providers';
import { useOwnerDocument } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import { useWorkspaceUI } from '../workspace/workspace-context';
export function BrowserTabView({ tab, active }: { tab: BrowserTabData; active: boolean }) {
	const { controller } = useWorkspaceUI(),
		t = useT(),
		inheritedDocument = useOwnerDocument(),
		host = controller.browserWorkspace();
	const ref = useRef<HTMLDivElement>(null),
		[viewer, setViewer] = useState<ReactNode>(null);
	const [error, setError] = useState('');
	// A popout can close before its MutationObserver delivers the adoption. Watch
	// the stable workspace document as well, and keep browser portals on the new owner.
	const snapshotDocument = useCallback(() => ref.current?.ownerDocument ?? inheritedDocument, [inheritedDocument]);
	const ownerDocument = useSyncExternalStore(
		useCallback(
			(notify) => {
				const workspace = controller.app.workspace,
					win = workspace.containerEl.win;
				let frame: number | undefined;
				const sync = () => {
					notify();
					if (frame === undefined)
						frame = win.requestAnimationFrame(() => {
							frame = undefined;
							notify();
						});
				};
				const observer = new (win as Window & { MutationObserver: typeof MutationObserver }).MutationObserver(
					sync,
				);
				observer.observe(workspace.containerEl.ownerDocument.body, { childList: true, subtree: true });
				const changed = workspace.on('layout-change', sync);
				const closed = workspace.on('window-close', sync);
				return () => {
					observer.disconnect();
					workspace.offref(changed);
					workspace.offref(closed);
					if (frame !== undefined) win.cancelAnimationFrame(frame);
				};
			},
			[controller],
		),
		snapshotDocument,
		snapshotDocument,
	);

	const state = useSyncExternalStore(
		useCallback((listener) => host?.subscribe(listener) ?? (() => undefined), [host]),
		useCallback(() => host?.getState(), [host]),
	);
	const page = state?.spaces.find((space) => space.id === tab.spaceId)?.pages.find((page) => page.id === tab.pageId);
	useEffect(() => {
		let live = true;
		void Promise.resolve().then(async () => {
			if (!live) return;
			setViewer(null);
			setError('');
			if (!host) return;
			try {
				const node = await host.renderViewer({ spaceId: tab.spaceId, pageId: tab.pageId });
				if (live) setViewer(node as ReactNode);
			} catch {
				if (live) setError('unavailable');
			}
		});
		return () => {
			live = false;
		};
	}, [host, tab.spaceId, tab.pageId]);
	useEffect(() => {
		if (page) controller.workspace.updateBrowser(tab.id, { title: page.title });
	}, [controller, tab.id, page]);
	return (
		<div ref={ref} data-browser-viewer={tab.pageId} className="huhu-browser-tab flex h-full min-h-0 flex-col">
			<HuhuProviders ownerDocument={ownerDocument} visible={active}>
				{!host ? (
					<EmptyState
						className="h-full"
						icon={<Globe />}
						title={t('agent.workspace.browserDisabled')}
						action={
							<Button
								onClick={() => {
									void controller
										.configureBrowser()
										.catch((error) => controller.workspace.report(error));
								}}
							>
								{t('agent.workspace.menu.settings')}
							</Button>
						}
					/>
				) : !page || error ? (
					<EmptyState
						className="h-full"
						icon={<Globe />}
						title={t('agent.workspace.browserTargetMissing')}
						action={
							<Button
								onClick={() => {
									void controller
										.openBrowserWorkspace()
										.catch((error) => controller.workspace.report(error));
								}}
							>
								{t('agent.workspace.openBrowser')}
							</Button>
						}
					/>
				) : (
					viewer
				)}
			</HuhuProviders>
		</div>
	);
}
