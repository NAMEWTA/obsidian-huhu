import type { AutomationDefinition, NotificationChannelId } from './types';
import type { TaskDraft, TaskRecurrence } from './task';

const CHANNELS: readonly string[] = ['in-app', 'system'] satisfies NotificationChannelId[];

export function isDefinition(value: unknown): value is AutomationDefinition {
	if (!value || typeof value !== 'object') return false;
	const d = value as Partial<AutomationDefinition>;
	if (!(
		typeof d.id === 'string' &&
		!!d.id &&
		typeof d.name === 'string' &&
		typeof d.deviceId === 'string' &&
		typeof d.enabled === 'boolean' &&
		Number.isFinite(d.revision) &&
		Number.isFinite(d.graceMinutes) &&
		d.graceMinutes! >= 0 &&
		!!d.schedule &&
		!!d.action &&
		Array.isArray(d.channels) &&
		d.channels.every((c) => CHANNELS.includes(c)) &&
		['always', 'failure', 'never'].includes(d.notifyOn ?? '') &&
		Number.isFinite(d.createdAt) &&
		Number.isFinite(d.updatedAt)
	))
		return false;
	if (d.templateId !== undefined && typeof d.templateId !== 'string') return false;
	if (
		d.link !== undefined &&
		(!d.link ||
			typeof d.link.path !== 'string' ||
			!d.link.path ||
			(d.link.line !== undefined && !Number.isInteger(d.link.line)))
	)
		return false;
	if (
		d.precheck !== undefined &&
		(!d.precheck || typeof d.precheck.command !== 'string' || !['powershell', 'bash'].includes(d.precheck.shell))
	)
		return false;
	const schedule = d.schedule;
	if (!(
		schedule.kind === 'manual' ||
		(schedule.kind === 'once' && Number.isFinite(schedule.at)) ||
		(schedule.kind === 'recurring' && Number.isFinite(schedule.start) && typeof schedule.expression === 'string')
	))
		return false;
	const action = d.action;
	if (action.kind === 'script')
		return (
			typeof action.script === 'string' &&
			typeof action.cwd === 'string' &&
			['powershell', 'bash'].includes(action.shell)
		);
	if (action.kind === 'open-file') return typeof action.path === 'string' && !!action.path;
	if (action.kind === 'open-url') {
		try {
			return ['http:', 'https:'].includes(new URL(action.url).protocol);
		} catch {
			return false;
		}
	}
	if (action.kind === 'obsidian-command') return typeof action.command === 'string' && !!action.command;
	if (action.kind === 'notify') return typeof action.body === 'string';
	if (action.kind === 'create-task') {
		if (
			Object.keys(action).some((key) => !['kind', 'text', 'timezone', 'date', 'time', 'reminderAt'].includes(key))
		)
			return false;
		return (
			typeof action.text === 'string' &&
			typeof action.timezone === 'string' &&
			!!action.timezone &&
			(action.date === undefined ||
				(typeof action.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(action.date))) &&
			(action.time === undefined ||
				(typeof action.time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(action.time))) &&
			(action.reminderAt === undefined || Number.isSafeInteger(action.reminderAt))
		);
	}

	if (
		action.kind !== 'agent' ||
		typeof action.agentId !== 'string' ||
		typeof action.prompt !== 'string' ||
		typeof action.cwd !== 'string' ||
		(action.extraArgs !== undefined && typeof action.extraArgs !== 'string') ||
		!['fresh', 'reuse', 'specific'].includes(action.sessionMode)
	)
		return false;
	const session = action.session;
	return (
		action.sessionMode !== 'specific' ||
		(!!session &&
			typeof session.sessionId === 'string' &&
			typeof session.agentId === 'string' &&
			typeof session.cwd === 'string' &&
			typeof session.accountKey === 'string')
	);
}
export const TASK_META_REGEX = /\s*<!-- huhu-task:([^>]+) -->/;
export interface TaskAutomationMeta {
	deviceId?: string;
	id?: string;
	automation?: AutomationDefinition;
	runId?: string;
	/** Stable identity of one admitted delivery, retained by every task rewrite. */
	effectKey?: string;
	recurrence?: TaskRecurrence;
	seriesTemplate?: TaskDraft;
	timezone?: string;
	/** Recurrence instances share a series identity, but keep independent completion state. */
	seriesId?: string;
	occurrence?: number;
	cancelled?: boolean;
}
export function readTaskMeta(text: string): TaskAutomationMeta {
	const match = TASK_META_REGEX.exec(text);
	if (!match?.[1]) return {};
	try {
		const value: unknown = JSON.parse(decodeURIComponent(match[1]));
		if (!value || typeof value !== 'object') return {};
		const m = value as TaskAutomationMeta;
		return {
			deviceId: typeof m.deviceId === 'string' ? m.deviceId : undefined,
			id: typeof m.id === 'string' ? m.id : undefined,
			runId: typeof m.runId === 'string' ? m.runId : undefined,
			effectKey: typeof m.effectKey === 'string' ? m.effectKey : undefined,
			automation: isDefinition(m.automation) ? m.automation : undefined,
			recurrence:
				m.recurrence &&
				typeof m.recurrence.expression === 'string' &&
				Number.isFinite(m.recurrence.start) &&
				typeof m.recurrence.timezone === 'string'
					? m.recurrence
					: undefined,
			seriesTemplate:
				m.seriesTemplate && typeof m.seriesTemplate.text === 'string' ? m.seriesTemplate : undefined,
			timezone: typeof m.timezone === 'string' ? m.timezone : undefined,
			seriesId: typeof m.seriesId === 'string' ? m.seriesId : undefined,
			occurrence: Number.isFinite(m.occurrence) ? m.occurrence : undefined,
			cancelled: m.cancelled === true ? true : undefined,
		};
	} catch {
		return {};
	}
}
export function taskMetaSuffix(meta: TaskAutomationMeta): string {
	if (!meta.id && !meta.automation && !meta.runId && !meta.effectKey && !meta.recurrence && !meta.seriesId) return '';
	return ` <!-- huhu-task:${encodeURIComponent(JSON.stringify({ id: meta.id, deviceId: meta.deviceId, automation: meta.automation, runId: meta.runId, effectKey: meta.effectKey, recurrence: meta.recurrence, seriesTemplate: meta.seriesTemplate, timezone: meta.timezone, seriesId: meta.seriesId, occurrence: meta.occurrence, cancelled: meta.cancelled })).replace(/-/g, '%2D')} -->`;
}
