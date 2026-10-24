import type { ComponentType } from 'react';
import type { BoardStore } from '../../services/board-store';
import type { WidgetChrome } from './WidgetCard';
import { AlbumWidget } from '../widgets/AlbumWidget';
import { AnniversaryWidget } from '../widgets/AnniversaryWidget';
import { CalendarWidget } from '../widgets/CalendarWidget';
import { CountdownWidget } from '../widgets/CountdownWidget';
import { ExpenseWidget } from '../widgets/ExpenseWidget';
import { HabitWidget } from '../widgets/HabitWidget';
import { FileSearchWidget } from '../widgets/InputWidgets';
import { LunarWidget } from '../widgets/LunarWidget';
import { MusicWidget } from '../widgets/MusicWidget';
import { PomodoroWidget } from '../widgets/PomodoroWidget';
import { QuickActionsWidget } from '../widgets/QuickActionsWidget';
import { ReadingWidget } from '../widgets/ReadingWidget';
import { SkillWidget } from '../widgets/SkillWidget';
import { NavigatorRecentWidget, NavigatorShortcutsWidget } from '../widgets/NavigatorListWidget';
import { UsageWidget } from '../widgets/UsageWidget';

import { YearProgressWidget } from '../widgets/YearProgressWidget';
import { ClockWidget } from './ClockWidget';
import { RecentWidget } from './RecentWidget';

export type WidgetComponent = ComponentType<{ store: BoardStore; entryId?: string }>;

/** The in-process views of the home provider's own kinds, keyed by member kind. Other providers mount through `render`. */
export const WIDGET_COMPONENTS: Readonly<Record<string, WidgetComponent>> = {
	clock: ClockWidget,
	calendar: CalendarWidget,
	lunar: LunarWidget,
	'year-progress': YearProgressWidget,
	countdown: CountdownWidget,
	anniversary: AnniversaryWidget,
	pomodoro: PomodoroWidget,
	habit: HabitWidget,
	expense: ExpenseWidget,
	reading: ReadingWidget,
	weather: ClockWidget,
	'quick-actions': QuickActionsWidget,
	'quick-notes': QuickActionsWidget,
	skills: SkillWidget,
	fileSearch: FileSearchWidget,
	recent: RecentWidget,
	music: MusicWidget,
	album: AlbumWidget,
	usage: UsageWidget,
	'nav-recent': NavigatorRecentWidget,
	'nav-shortcuts': NavigatorShortcutsWidget,
	shortcuts: QuickActionsWidget,
};

/**
 * How a kind sits in its card. Every view is drawn under the card's title bar; `minimal` kinds read as a picture
 * and keep the bar hidden until the tile is hovered or focused (it still drags), `bleed` kinds fill the whole card.
 */
export const WIDGET_FRAME: Readonly<Record<string, { chrome?: WidgetChrome; bleed?: boolean }>> = {
	clock: { chrome: 'minimal' },
	album: { chrome: 'minimal', bleed: true },
};
