import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ServiceAccess } from '../contracts/module';
import type { EditorContextAccess } from '../contracts/editor-context';
import { COMMENTS_PANEL } from '../../modules/comments/api';
import { NOTE_HISTORY_PANEL } from '../../modules/versioning/api';
import { registerMessages } from '../../shared/i18n';
import { ContainerProviders } from '../../ui/react/providers';
import { useT } from '../../ui/react/hooks';
import { Button } from '../../ui/components/button';
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
}: Pick<HostProps, 'services' | 'documents' | 'openSettings'> & { tab: EditorPanelTab }) {
	const t = useT(),
		container = useRef<HTMLDivElement>(null);
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
	useEffect(() => {
		const element = container.current;
		if (!element || !panel) return;
		return panel.mount(element, documents);
	}, [panel, documents, tab]);
	if (!panel)
		return (
			<div className="flex flex-col gap-3 p-4 text-sm text-muted-foreground">
				<p>{t('editorPanel.unavailable')}</p>
				<Button variant="outline" onClick={openSettings}>
					{t('editorPanel.settings')}
				</Button>
			</div>
		);
	return <div ref={container} className="h-full min-h-0 min-w-0 overflow-hidden" />;
}

function EditorPanelHost(props: HostProps) {
	const t = useT(),
		[tab, setTab] = useState(props.initialTab);
	return (
		<Tabs
			value={tab}
			onValueChange={(value) => {
				const next = value === 'history' ? 'history' : 'comments';
				setTab(next);
				props.select(next);
			}}
			className="flex h-full min-h-0 flex-col gap-0"
			aria-label={t('editorPanel.title')}
		>
			<div className="shrink-0 border-b p-2">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="comments">{t('editorPanel.comments')}</TabsTrigger>
					<TabsTrigger value="history">{t('editorPanel.history')}</TabsTrigger>
				</TabsList>
			</div>
			<TabsContent value="comments" className="m-0 min-h-0 flex-1">
				<MountedPanel {...props} tab="comments" />
			</TabsContent>
			<TabsContent value="history" className="m-0 min-h-0 flex-1">
				<MountedPanel {...props} tab="history" />
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
