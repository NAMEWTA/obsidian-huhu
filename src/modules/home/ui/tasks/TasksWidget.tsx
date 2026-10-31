import { useEffect, useRef } from 'react';
import type { BoardStore } from '../../services/board-store';
import { homeServices } from '../../services/instances';
import { t } from '../../../../shared/i18n';
/** Dashboard presentation only; all task state, editing and mutations belong to task. */
export function TasksWidget({ store: _store }: { store: BoardStore }) {
	const host = useRef<HTMLDivElement>(null),
		views = homeServices.taskViews;
	useEffect(() => (host.current && views ? views.mount(host.current, { compact: true }) : undefined), [views]);
	return (
		<div ref={host} className="h-full min-h-0">
			{!views && <p role="status">{t('task.unavailable')}</p>}
		</div>
	);
}
