import { cn } from '../../../../ui/lib/utils';
/** Calendar-only HU recipes. Stable DOM markers are retained for host integration and tests; no legacy board skin is imported. */
const recipes: Record<string, string> = {
	'dashboard-modal': 'min-h-0 min-w-0 bg-[var(--hu-raised)] text-[var(--hu-fg)]',
	'dashboard-modal-body': 'min-h-0 min-w-0',
	'dashboard-calendar-fullscreen-inner': 'flex min-h-0 min-w-0 flex-col gap-4',
	'dashboard-calendar-fullscreen-body': 'min-h-0 min-w-0 flex-1',
	'dashboard-calendar-section-body': 'min-h-0 min-w-0 overflow-y-auto',
	'dashboard-calendar-event': 'flex min-w-0 items-start gap-1 rounded-md bg-[var(--hu-sunken)] p-1 text-sm',
	'dashboard-calendar-event-text': 'min-w-0 break-words',
	'dashboard-calendar-event-time': 'text-xs tabular-nums text-[var(--hu-fg-3)]',
	'dashboard-calendar-check': 'shrink-0',
	'dashboard-calendar-mark': 'flex size-4 shrink-0 items-center justify-center text-[var(--hu-fg-3)]',
	'dashboard-calendar-multi-mark': 'shrink-0 text-[var(--hu-fg-3)]',
	'dashboard-calendar-bar':
		'flex min-h-[var(--hu-hit)] min-w-0 items-center gap-1 rounded-md bg-[var(--hu-accent-soft)] px-2 py-1 text-[var(--hu-fg)]',
	'dashboard-calendar-bar-time': 'shrink-0 text-xs tabular-nums text-[var(--hu-fg-3)]',
	'dashboard-calendar-bar-text': 'min-w-0 flex-1 break-words',
	'dashboard-calgrid':
		'flex min-h-[320px] max-h-[70vh] min-w-0 max-w-full flex-col overflow-x-auto rounded-lg border border-[var(--hu-line)] bg-[var(--hu-surface)]',
	'dashboard-calgrid-head':
		'grid min-w-[660px] shrink-0 grid-cols-[44px_repeat(7,minmax(88px,1fr))] border-b border-[var(--hu-line)]',
	'dashboard-calgrid-corner': 'w-11',
	'dashboard-calgrid-dayhead':
		'flex min-h-[var(--hu-hit)] min-w-0 flex-col items-center justify-center gap-1 border-l border-[var(--hu-line)] bg-[var(--hu-raised)] p-1 text-xs',
	'dashboard-calgrid-dayhead-wd': 'text-[var(--hu-fg-3)]',
	'dashboard-calgrid-dayhead-date': 'font-medium tabular-nums',
	'dashboard-calgrid-allday':
		'grid min-w-[660px] shrink-0 grid-cols-[44px_repeat(7,minmax(88px,1fr))] border-b border-[var(--hu-line)]',
	'dashboard-calgrid-allday-corner': 'p-1 text-xs text-[var(--hu-fg-3)]',
	'dashboard-calgrid-allday-cell': 'min-w-0 space-y-1 border-l border-[var(--hu-line)] p-1',
	'dashboard-calgrid-allday-chip':
		'flex min-h-[var(--hu-hit)] min-w-0 w-full items-center rounded-md bg-[var(--hu-sunken)] px-1 text-left text-sm',
	'dashboard-calgrid-allday-more': 'text-xs text-[var(--hu-fg-3)]',
	'dashboard-calgrid-scroll': 'min-h-0 min-w-[660px] flex-1 overflow-y-auto',
	'dashboard-calgrid-body': 'relative grid h-[1152px] grid-cols-[44px_repeat(7,minmax(88px,1fr))]',
	'dashboard-calgrid-hours': 'text-right text-xs tabular-nums text-[var(--hu-fg-3)]',
	'dashboard-calgrid-hour': 'h-12 border-b border-[var(--hu-line)] px-1',
	'dashboard-calgrid-daycol':
		'relative min-w-0 border-l border-[var(--hu-line)] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_47px,var(--hu-line)_47px,var(--hu-line)_48px)]',
	'dashboard-calgrid-event':
		'absolute inset-x-0 flex min-w-0 items-start gap-1 rounded-md border border-[var(--hu-line)] bg-[var(--hu-raised)] p-1 text-sm shadow-[var(--hu-shadow-card)]',
	'dashboard-calgrid-event-time': 'text-xs tabular-nums text-[var(--hu-fg-3)]',
	'dashboard-calgrid-event-title': 'min-w-0 break-words',
	'dashboard-calgrid-event-check': 'mt-1',
	'dashboard-calgrid-nowline': 'pointer-events-none absolute inset-x-0 h-px bg-[var(--hu-accent)]',
	'dashboard-wikilink':
		'inline-flex min-h-[var(--hu-hit)] max-w-full items-center break-all text-[var(--hu-accent-text)] underline underline-offset-2',
	'dashboard-external-link':
		'inline-flex min-h-[var(--hu-hit)] max-w-full items-center break-all text-[var(--hu-accent-text)] underline underline-offset-2',
};
export function calendarClasses(value: string) {
	return cn(value, ...value.split(/\s+/).map((token) => recipes[token]));
}
