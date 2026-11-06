import '../i18n';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Badge } from '../../../../ui/components/badge';
import { useVisible } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import { getLanguage } from '../../../../shared/i18n';
import type { CalendarSnapshot } from '../../../task/api';
import type { BoardStore } from '../../services/board-store';
import { homeServices } from '../../services/instances';
import { useClock } from '../board/hooks';

const unavailable: CalendarSnapshot = {
	status: 'unavailable',
	tasks: [],
	byDay: new Map(),
	unfilteredCount: 0,
	filter: 'overdue',
	revision: 0,
};
/** Read only public task, session and automation projections; their producers own counting/filtering/schedules. */
export function HomeGreetingSummary({ store }: { store: BoardStore }) {
	const t = useT(),
		visible = useVisible(),
		clock = useClock(),
		calendar = homeServices.calendar,
		automation = store.host.automationHost;
	const [agentRevision, refreshAgents] = useState(0),
		[, refreshAutomation] = useState(0);
	const subscribe = useCallback(
		(notify: () => void) => (visible ? (calendar?.subscribe(notify) ?? (() => {})) : () => {}),
		[calendar, visible],
	);
	const read = useCallback(() => calendar?.snapshot({ filter: 'overdue' }) ?? unavailable, [calendar]);
	const tasks = useSyncExternalStore(subscribe, read, () => unavailable);
	useEffect(() => {
		if (visible && calendar) void calendar.refresh({ filter: 'overdue' }).catch(() => {});
	}, [calendar, visible]);
	useEffect(
		() => (visible ? homeServices.watchAgents?.(() => refreshAgents((value) => value + 1)) : undefined),
		[visible],
	);
	useEffect(
		() => (visible ? automation?.subscribe?.(() => refreshAutomation((value) => value + 1)) : undefined),
		[automation, visible],
	);
	const port = homeServices.sessions?.();
	const request = useMemo(() => ({ port, visible, clock, agentRevision }), [port, visible, clock, agentRevision]);
	const [sessionState, setSessionState] = useState<
		| { request: typeof request; status: 'ready'; count: number }
		| { request: typeof request; status: 'unavailable' }
		| null
	>(null);
	useEffect(() => {
		if (!request.visible || !request.port) return;
		let active = true;
		void request.port.list().then(
			(rows) => {
				if (active) setSessionState({ request, status: 'ready', count: rows.length });
			},
			() => {
				if (active) setSessionState({ request, status: 'unavailable' });
			},
		);
		return () => {
			active = false;
		};
	}, [request]);
	const currentSession = sessionState?.request === request ? sessionState : null;
	const sessions = !port ? 'unavailable' : (currentSession?.status ?? 'loading');
	const next = automation?.nextScheduled?.();
	const nextTime =
		next && Number.isFinite(next.at) && Number.isFinite(new Date(next.at).getTime())
			? new Intl.DateTimeFormat(getLanguage() === 'zh' ? 'zh-CN' : 'en', {
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
				}).format(next.at)
			: undefined;
	return (
		<div
			data-home-summary
			className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--hu-fg-2)]"
		>
			<span data-home-overdue>
				{tasks.status === 'ready' ? (
					<Badge variant={tasks.tasks.length ? 'warning' : 'neutral'}>
						{t('home.greeting.overdue', { count: tasks.tasks.length })}
					</Badge>
				) : (
					t(
						tasks.status === 'loading' || tasks.status === 'idle'
							? 'home.greeting.tasksLoading'
							: 'home.greeting.tasksUnavailable',
					)
				)}
			</span>
			<span data-home-sessions>
				{currentSession?.status === 'ready'
					? t('home.greeting.sessions', { count: currentSession.count })
					: t(sessions === 'loading' ? 'home.greeting.sessionsLoading' : 'home.greeting.sessionsUnavailable')}
			</span>
			<span data-home-next-automation className="min-w-0 [overflow-wrap:anywhere]">
				{next && nextTime
					? t('home.greeting.nextAutomation', { name: next.name, time: nextTime })
					: t(next === null ? 'home.greeting.noAutomation' : 'home.greeting.automationsUnavailable')}
			</span>
		</div>
	);
}
