// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/settings-page-renderer.tsx
import { useCallback, useRef, useSyncExternalStore } from 'react';
import type DashboardPlugin from '../../main';
import type { WorkbenchTarget } from '../../contracts/workbench';
import { settingsCategories } from '../../workbench/settings-categories';
import { CategoryContent } from './CategoryContent';
import { useSettingFocus } from './use-setting-focus';

/**
 * One settings category at a time. Searching lives in the side panel (it covers every setting of every category);
 * choosing a result opens its category with `focusId`, and the matching row is scrolled into view and highlighted.
 */
export function SettingsPage({
	plugin,
	category,
	resourceId,
	focusId,
	focusToken,
	navigate,
}: {
	plugin: DashboardPlugin;
	category: string;
	resourceId?: string;
	focusId?: string;
	/** Changes when the same setting is chosen again. */
	focusToken?: number;
	navigate: (target: WorkbenchTarget) => void;
}) {
	const scroll = useRef<HTMLDivElement>(null);
	useSyncExternalStore(
		useCallback((listener) => plugin.onModuleChanged(listener), [plugin]),
		() =>
			plugin
				.moduleManifests()
				.map((m) => plugin.moduleState(m.id))
				.join(),
	);
	useSyncExternalStore(
		useCallback((listener) => plugin.appSettings.subscribe(listener), [plugin]),
		() => plugin.appSettings.get(),
	);
	useSettingFocus(scroll, focusId, focusToken);
	const section = settingsCategories(plugin).find((c) => c.id === category);
	return (
		<div className="huhu-settings-page settings-view-shell flex h-full min-h-0 flex-1 overflow-hidden bg-background">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<div ref={scroll} className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek" data-settings-scroll>
					<div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-8 pt-10 pb-24">
						{section && (
							<CategoryContent plugin={plugin} section={section} resourceId={resourceId} navigate={navigate} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
