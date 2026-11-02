import { TaskError, type Task, type TaskPage, type TaskQuery, type TaskView } from './model';
import { effectiveDate, isOverdue, overdueDays, validDate, zonedStamp } from './time';
import { normalizeResources, resourceMatches } from './resources';

export function taskView(task: Task, now: number): TaskView {
	return {
		...structuredClone(task),
		overdue: isOverdue(task, now),
		overdueDays: overdueDays(task, now),
		effectiveDate: effectiveDate(task, now),
	};
}
export function queryTasks(tasks: readonly Task[], query: TaskQuery = {}, now: number): TaskPage {
	const filter = query.filter ?? 'open',
		offset = query.offset ?? 0,
		limit = query.limit ?? 100;
	if (
		!['all', 'open', 'completed', 'overdue'].includes(filter) ||
		!Number.isSafeInteger(offset) ||
		offset < 0 ||
		!Number.isSafeInteger(limit) ||
		limit < 1 ||
		limit > 500 ||
		(query.from && !validDate(query.from)) ||
		(query.to && !validDate(query.to)) ||
		(query.from && query.to && query.from > query.to) ||
		(query.text !== undefined && (typeof query.text !== 'string' || query.text.length > 1000)) ||
		(query.order && !['asc', 'desc'].includes(query.order)) ||
		(query.timeField &&
			!['effectiveDate', 'due', 'createdAt', 'reminderAt', 'completedAt'].includes(query.timeField))
	)
		throw new TaskError('invalid-input', 'Invalid task query');
	if (query.related) normalizeResources([query.related]);
	const counts = { all: 0, open: 0, completed: 0, overdue: 0 };
	const text = query.text?.trim().toLocaleLowerCase();
	const field = query.timeField ?? 'effectiveDate';
	const dayOf = (task: TaskView): string | undefined => {
		if (field === 'effectiveDate') return task.effectiveDate;
		if (field === 'due') return task.due?.date;
		const at = task[field];
		return at === undefined ? undefined : zonedStamp(at, task.timezone).slice(0, 10);
	};
	const rows = tasks
		.filter((task) => query.includeCancelled || task.status !== 'cancelled')
		.map((task) => taskView(task, now))
		.filter(
			(task) =>
				(!text || `${task.title}\n${task.description}`.toLocaleLowerCase().includes(text)) &&
				(!query.related ||
					task.relations.some((resource) => resourceMatches(resource, query.related!, query.recursive))) &&
				(!query.from || (!!dayOf(task) && dayOf(task)! >= query.from)) &&
				(!query.to || (!!dayOf(task) && dayOf(task)! <= query.to)),
		);
	for (const task of rows) {
		counts.all++;
		if (task.status === 'open') counts.open++;
		if (task.status === 'completed') counts.completed++;
		if (task.overdue) counts.overdue++;
	}
	const selected = rows.filter(
		(task) =>
			filter === 'all' ||
			(filter === 'open'
				? task.status === 'open'
				: filter === 'completed'
					? task.status === 'completed'
					: task.overdue),
	);
	const key = (task: TaskView): string | number | undefined =>
		field === 'due'
			? task.due
				? `${task.due.date} ${task.due.time ?? '23:59'}`
				: undefined
			: field === 'effectiveDate'
				? task.effectiveDate
				: task[field];
	selected.sort((a, b) => {
		const x = key(a),
			y = key(b);
		if (x === undefined || y === undefined) return x === y ? a.id.localeCompare(b.id) : x === undefined ? 1 : -1;
		const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
		return (query.order === 'desc' ? -order : order) || a.id.localeCompare(b.id);
	});
	return {
		items: selected.slice(offset, offset + limit),
		total: selected.length,
		counts,
		offset,
		limit,
		...(offset + limit < selected.length ? { nextOffset: offset + limit } : {}),
	};
}
