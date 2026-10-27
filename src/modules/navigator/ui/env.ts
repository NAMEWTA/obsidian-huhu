// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import type { App } from 'obsidian';
import type { IconTarget, ResolvedIcon } from '../../icons/api';
import type { HostMenuNode } from '../core/host-menu';
import type { NavContext } from '../core/types';
import type { PreviewStore } from '../platform/preview-store';
import type { NavigatorService } from '../services/navigator';
import type { ProductivityActions } from './actions';
import type { TaskCalendarService, CalendarTask } from '../../task/api';
import type { NavigatorPeriodic } from '../api';

/** What the navigator's React tree needs from its host. */
export interface NavigatorEnv {
	app: App;
	service: NavigatorService;
	previews: PreviewStore;
	isMac: boolean;
	/** Rule-book icon for a target, or an empty result when the icons module is off. */
	resolveIcon: (target: IconTarget) => ResolvedIcon;
	/** Runs when icons change; returns the unsubscribe function. */
	subscribeIcons: (listener: () => void) => () => void;
	/** `src` for an image file of the vault. */
	imageUrl: (path: string) => string;
	openSettings: () => void;
	/** Edit the list appearance overrides of a folder, tag or property. */
	openAppearance: (context: NavContext) => void;
	/** Ask for one line of text; undefined when dismissed. */
	askName: (titleKey: string, value: string) => Promise<string | undefined>;
	/** Notes from templates, periodic notes, merging and tag edits; absent in hosts that only browse. */
	actions?: ProductivityActions;
	periodic?: NavigatorPeriodic;
	calendar?: () => TaskCalendarService | undefined;
	watchCalendar?: (listener: () => void) => () => void;
	remindCalendarTask?: (task: CalendarTask, date: string, owner?: Window) => void;
	copyPath: (path: string) => void;
	/** Show a vault path (`'/'` is the vault folder) in the system file manager; absent where there is none (mobile). */
	showInFolder?: (path: string) => Promise<void>;
	/** Open a vault file with the system's default application; absent where there is none (mobile). */
	openInDefaultApp?: (path: string) => Promise<void>;
	/** What Obsidian and other plugins add to the context menu of these vault entries (`file-menu`); absent in hosts without one. */
	hostMenu?: (paths: readonly string[]) => HostMenuNode[];
	/** Whether a note can open in a pane split to the right of the current one (not on phones). */
	canSplit?: boolean;
	report: (error: unknown) => void;
}
