import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { ObsidianIcon } from '../../../../ui/components/huhu/ObsidianIcon';
import { useVisible } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import type { ShortcutButton } from '../../core/board/shortcut-buttons';
import type { BoardStore } from '../../services/board-store';
import { runShortcut } from '../../services/shortcut-run';
import { IconButton } from '../board/controls';
import { ShortcutsConfig } from './ShortcutsConfig';
import { WidgetActions } from '../canvas/widget-frame';

/** A configurable set of buttons: open a note, run an Obsidian command, run a saved automation or start an agent. */
export function ShortcutsWidget({ store }: { store: BoardStore }) {
	const t = useT(),
		visible = useVisible(),
		buttons = useStore(store.state, (state) => state.settings.shortcutButtons),
		[config, setConfig] = useState(false),
		[running, setRunning] = useState<ReadonlySet<string>>(new Set()),
		controller = useRef(new AbortController());
	useEffect(() => {
		const current = new AbortController();
		controller.current = current;
		return () => current.abort();
	}, []);
	const run = (button: ShortcutButton) => {
		const { signal } = controller.current;
		if (running.has(button.id)) return;
		setRunning((prev) => new Set(prev).add(button.id));
		const widgets = store.widgets,
			automation = store.host.automationHost;
		void runShortcut(button, {
			current: () => store.isCurrent(),
			hasFile: (path) => store.hasFile(path),
			openFile: (path) => store.openFile(path),
			hasCommand: (id) => store.hasCommand(id),
			runCommand: (id) => store.runCommand(id),
			automations: () =>
				automation?.actions && automation.runAction
					? { actions: () => automation.actions!(), run: (id) => automation.runAction!(id) }
					: undefined,
			quickCommands: () => widgets.quickCommands?.(),
			agents: () => widgets.agents?.() ?? [],
			dispatch: widgets.acquireDispatch ?? (async () => undefined),
			notify: (message) => toast(message),
			boardPath: store.state.getState().path + '.md',
			signal,
		}).finally(() => {
			if (signal.aborted) return;
			setRunning((prev) => {
				const next = new Set(prev);
				next.delete(button.id);
				return next;
			});
		});
	};
	const label = (button: ShortcutButton) => button.label || button.target || t('home.widget.shortcuts');
	return (
		<div className="flex h-full min-h-0 flex-col" data-shortcuts>
			<WidgetActions>
				<IconButton label={t('shortcuts.configure')} onClick={() => setConfig(true)}>
					<Settings />
				</IconButton>
			</WidgetActions>
			{buttons.length === 0 ? (
				<EmptyState
					className="h-full"
					size="sm"
					title={t('shortcuts.empty')}
					description={t('shortcuts.emptyHint')}
					descriptionClassName="hidden [@container(min-height:12.5rem)]:block"
					action={
						<Button size="xs" variant="outline" onClick={() => setConfig(true)}>
							{t('shortcuts.add')}
						</Button>
					}
				/>
			) : (
				<ul className="m-0 grid min-h-0 flex-1 list-none grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] content-start gap-2 overflow-y-auto p-0">
					{buttons.map((button) => {
						const keys = button.type === 'command' ? store.hotkeysOf(button.target) : [],
							name = label(button);
						return (
							<li key={button.id} className="min-w-0">
								<Button
									variant="secondary"
									disabled={running.has(button.id)}
									aria-label={name}
									title={keys.length > 0 ? `${name} (${keys.join('+')})` : name}
									data-shortcut={button.id}
									className="h-9 w-full justify-start gap-2 px-2.5 font-normal"
									onClick={() => run(button)}
								>
									<ObsidianIcon name={button.icon} className="size-4" />
									<span className="min-w-0 flex-1 truncate text-left">{name}</span>
								</Button>
							</li>
						);
					})}
				</ul>
			)}
			{visible && config && <ShortcutsConfig store={store} close={() => setConfig(false)} />}
		</div>
	);
}
