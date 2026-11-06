import { createRoot } from 'react-dom/client';
import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ServiceAccess } from '../contracts/module';
import type { EditorContextAccess, EditorPanelHandle } from '../contracts/editor-context';
import { COMMENTS_PANEL } from '../../modules/comments/api';
import { NOTE_HISTORY_PANEL } from '../../modules/versioning/api';
import { registerMessages } from '../../shared/i18n';
import { ContainerProviders } from '../../ui/react/providers';
import { useT } from '../../ui/react/hooks';
import { Button } from '../../ui/components/button';
import { VisibilityContext } from '../../ui/react/contexts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/components/tabs';

registerMessages({
	en: {
		'editorPanel.comments': 'Comments',
		'editorPanel.history': 'History',
		'editorPanel.title': 'Note tools',
		'editorPanel.unavailable': 'Enable this feature in HUHU settings to use this panel.',
		'editorPanel.settings': 'Open settings',
	},
	zh: {
		'editorPanel.comments': '批注',
		'editorPanel.history': '历史',
		'editorPanel.title': '笔记工具',
		'editorPanel.unavailable': '在 HUHU 设置中开启对应功能后，即可使用此面板。',
		'editorPanel.settings': '打开设置',
	},
});

export type EditorPanelTab = 'comments' | 'history';
interface HostProps {
	container: HTMLElement;
	services: ServiceAccess;
	documents: EditorContextAccess;
	initialTab: EditorPanelTab;
	select(tab: EditorPanelTab): void;
	openSettings(): void;
}

function MountedPanel({
	tab,
	services,
	documents,
	openSettings,
	visible,
}: Pick<HostProps, 'services' | 'documents' | 'openSettings'> & { tab: EditorPanelTab; visible: boolean }) {
	const t = useT(),
		container = useRef<HTMLDivElement>(null);
	const handle = useRef<EditorPanelHandle | undefined>(undefined), currentVisible = useRef(visible);
	useLayoutEffect(() => { currentVisible.current = visible; }, [visible]);
	const panel = useSyncExternalStore(
		useCallback(
			(listener) =>
				tab === 'comments'
					? services.watch(COMMENTS_PANEL, listener)
					: services.watch(NOTE_HISTORY_PANEL, listener),
			[services, tab],
		),
		useCallback(
			() => (tab === 'comments' ? services.peek(COMMENTS_PANEL) : services.peek(NOTE_HISTORY_PANEL)),
			[services, tab],
		),
	);
	useLayoutEffect(() => {
		const element = container.current;
		if (!element || !panel) return;
		const mounted = panel.mount(element, documents, currentVisible.current);
		handle.current = mounted;
		return () => { if (handle.current === mounted) handle.current = undefined; mounted.dispose(); };
	}, [panel, documents, tab]);
	useLayoutEffect(() => handle.current?.setVisible(visible), [visible, panel]);
	if (!panel)
		return (
			<div className="flex flex-col gap-3 p-4 text-sm text-[var(--hu-fg-3)]">
				<p>{t('editorPanel.unavailable')}</p>
				<Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" variant="secondary" onClick={openSettings}>
					{t('editorPanel.settings')}
				</Button>
			</div>
		);
	return <div ref={container} className="h-full min-h-0 min-w-0 overflow-hidden" />;
}

function EditorPanelHost(props: HostProps) {
	const t = useT(),
		[tab, setTab] = useState(props.initialTab);
	const [visited, setVisited] = useState<Set<EditorPanelTab>>(() => new Set([props.initialTab]));
	return (
		<Tabs
			value={tab}
			onValueChange={(value) => {
				const next = value === 'history' ? 'history' : 'comments';
				setTab(next);
				setVisited(previous => new Set([...previous, next]));
				props.select(next);
			}}
			className="flex h-full min-h-0 flex-col gap-0 bg-[var(--hu-surface)] text-[var(--hu-fg)]"
			aria-label={t('editorPanel.title')}
		>
			<div className="shrink-0 border-b p-2">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="comments">{t('editorPanel.comments')}</TabsTrigger>
					<TabsTrigger value="history">{t('editorPanel.history')}</TabsTrigger>
				</TabsList>
			</div>
			<TabsContent value="comments" forceMount hidden={tab !== 'comments'} inert={tab !== 'comments'} className="m-0 min-h-0 flex-1 data-[state=inactive]:hidden">
				{visited.has('comments') && <VisibilityContext.Provider value={tab === 'comments'}><MountedPanel {...props} tab="comments" visible={tab === 'comments'} /></VisibilityContext.Provider>}
			</TabsContent>
			<TabsContent value="history" forceMount hidden={tab !== 'history'} inert={tab !== 'history'} className="m-0 min-h-0 flex-1 data-[state=inactive]:hidden">
				{visited.has('history') && <VisibilityContext.Provider value={tab === 'history'}><MountedPanel {...props} tab="history" visible={tab === 'history'} /></VisibilityContext.Provider>}
			</TabsContent>
		</Tabs>
	);
}

export function mountEditorPanelHost(props: HostProps): () => void {
	props.container.addClass('huhu-ui');
	const root = createRoot(props.container);
	root.render(
		<ContainerProviders container={props.container}>
			<EditorPanelHost {...props} />
		</ContainerProviders>,
	);
	return () => {
		root.unmount();
		props.container.removeClass('huhu-ui');
	};
}
