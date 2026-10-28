import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { Badge } from '../../../../ui/components/badge';
import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';
import { TaskClient } from '../../services/workbench/task-client';
import type { BotTaskHost } from './TasksPage';
export function TaskSummary({ host, runId }: { host: BotTaskHost; runId: string }) {
	const t = useT(),
		[tasks] = useState(() => new TaskClient(host.client, host.workspace)),
		state = useStore(tasks.store);
	useEffect(() => {
		void tasks.load(runId);
		return () => tasks.dispose();
	}, [tasks, runId]);
	return (
		<div className="grid gap-2 pt-2">
			<div className="flex flex-wrap items-center gap-2">
				{state.run && <Badge variant="outline">{t(`huhubot.status.${state.run.status}`)}</Badge>}
				<Button variant="link" size="sm" onClick={() => host.openTarget?.('tasks', runId)}>
					{t('huhubot.chat.openTask')}
				</Button>
			</div>
			{state.children.length > 0 && (
				<ul className="m-0 grid list-none gap-2 p-0">
					{state.children.slice(0, 8).map((child) => (
						<li key={child.id} className="rounded border border-border p-2 text-xs">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="min-w-0 break-all">
									{child.targetAgentId ?? child.executorAgentId}
								</span>
								<Badge variant="outline">{t(`huhubot.status.${child.status}`)}</Badge>
							</div>
							{child.result && (
								<p className="m-0 mt-1 whitespace-pre-wrap break-words">
									{child.result.partial ? `${t('huhubot.tasks.partial')}: ` : ''}
									{child.result.text}
								</p>
							)}
						</li>
					))}
				</ul>
			)}
			{state.error && (
				<p role="alert" className="text-xs text-destructive">
					{t('huhubot.tasks.error')}
				</p>
			)}
		</div>
	);
}
