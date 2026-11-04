import type { NavigatorPeriodic, PeriodicNoteListEntry } from '../api';
import { startOfPeriod, type Period } from '../core/periodic';
import { startOfDay, type WeekStart } from '../../../shared/periodic-paths';

function previousPeriodStart(period: Period, date: Date, weekStart: WeekStart): Date {
	// A missing local day can normalize "minus one day" back to itself (Apia, 2011-12-30).
	// The instant before this period starts belongs to the previous existing period.
	const previous = startOfPeriod(period, new Date(date.getTime() - 1), weekStart);
	if (previous >= date) throw new RangeError('Periodic date cursor did not advance');
	return previous;
}

export async function listPeriodicNotes(
	source: () => NavigatorPeriodic | undefined,
	period: Period,
	from: Date,
	to: Date,
): Promise<PeriodicNoteListEntry[]> {
	if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) throw new RangeError('Invalid periodic date range');
	const firstDay = startOfDay(from), lastDay = startOfDay(to);
	if (firstDay > lastDay) return [];
	const journal = source();
	if (!journal) return [];
	const root = journal.root(), weekStart = journal.weekStart();
	const current = () => source() === journal && journal.root() === root && journal.weekStart() === weekStart;
	const first = startOfPeriod(period, firstDay, weekStart);
	const entries: PeriodicNoteListEntry[] = [];
	for (let date = startOfPeriod(period, lastDay, weekStart); date >= first; date = previousPeriodStart(period, date, weekStart)) {
		if (!current()) return [];
		const info = journal.inspect(period, date);
		if (info.status === 'disabled' || info.status === 'unavailable') return [];
		if (info.status !== 'existing') continue;
		const preview = await journal.preview(period, date);
		if (!current() || preview.status === 'disabled' || preview.status === 'unavailable') return [];
		if (preview.status === 'existing' && preview.path === info.path) entries.push({
			...preview, status: 'existing', summaryStatus: typeof preview.summary === 'string' ? 'ready' : 'unavailable',
		});
	}
	return entries;
}
