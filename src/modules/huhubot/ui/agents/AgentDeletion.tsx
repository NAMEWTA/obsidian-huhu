import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '../../../../ui/components/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '../../../../ui/components/alert-dialog';
import { useT } from '../../../../ui/react/hooks';
import { useVisible } from '../../../../ui/react/contexts';
import type { Agent, BotClient } from '../../api';
import { AgentDeletionClient, agentDeletionBlocked } from '../../services/workbench/agent-deletion';

export function AgentDeletion({
	client,
	agent,
	disabled,
	onDeleted,
}: {
	client: BotClient;
	agent: Agent;
	disabled?: boolean;
	onDeleted?: (id: string) => void;
}) {
	const t = useT(),
		visible = useVisible();
	const deletion = useMemo(
		() =>
			new AgentDeletionClient(() => client, { id: agent.id, enabled: agent.enabled, isDefault: agent.isDefault }),
		[client, agent.id, agent.enabled, agent.isDefault],
	);
	const view = useStore(deletion.store);
	const [open, setOpen] = useState(false);
	useEffect(() => () => deletion.dispose(), [deletion]);
	if (agent.enabled || agent.isDefault || view.deleted) return null;
	const blocked = !!view.preview && agentDeletionBlocked(view.preview);
	return (
		<>
			<Button
				variant="destructive"
				size="sm"
				disabled={disabled || !!view.busy}
				onClick={() => {
					setOpen(true);
					void deletion.review();
				}}
			>
				{t('huhubot.agent.deletePreview')}
			</Button>
			<AlertDialog open={visible && open} onOpenChange={setOpen}>
				<AlertDialogContent
					onCloseAutoFocus={(event) => {
						if (!visible) event.preventDefault();
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('huhubot.agent.delete')}</AlertDialogTitle>
						<AlertDialogDescription>{t('huhubot.agent.deleteDescription')}</AlertDialogDescription>
					</AlertDialogHeader>
					<p className="m-0 break-words text-sm font-semibold">{agent.name}</p>
					{view.busy === 'preview' && (
						<p role="status" className="text-xs">
							{t('huhubot.chat.loading')}
						</p>
					)}
					{view.preview && (
						<>
							<p className="break-all text-xs text-muted-foreground">
								{t('huhubot.common.revision')} {view.preview.revision} · {t('huhubot.tasks.expires')}{' '}
								{view.preview.expiresAt}
							</p>
							<ul className="m-0 grid list-none gap-1 p-0">
								{view.preview.categories.map((category) => (
									<li key={category.kind} className="rounded border border-border p-2 text-xs">
										{t(
											category.kind === 'related-sessions'
												? 'huhubot.chat.sessions'
												: category.kind === 'active-runs'
													? 'huhubot.tasks.title'
													: category.kind === 'group-memberships'
														? 'huhubot.group.edit'
														: category.kind === 'private-memory'
															? 'huhubot.memory.agentScope'
															: 'huhubot.common.unknown',
										)}
										: {category.count}
										{category.reason === 'HISTORY_RETAINED'
											? ` · ${t('huhubot.data.retained')}`
											: ''}
									</li>
								))}
							</ul>
						</>
					)}
					{blocked && (
						<p role="alert" className="text-xs text-status-warning">
							{t('huhubot.agent.deleteBlocked')}
						</p>
					)}
					{view.error && (
						<p role="alert" className="text-xs text-destructive">
							{t(view.error === 'unknown' ? 'huhubot.chat.startUncertain' : 'huhubot.agent.error')}
						</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={!!view.busy}>{t('huhubot.common.cancel')}</AlertDialogCancel>
						{view.error === 'unknown' && (
							<Button
								variant="outline"
								disabled={!!view.busy}
								onClick={() => {
									deletion.abandon();
									setOpen(false);
								}}
							>
								{t('huhubot.common.abandonRequest')}
							</Button>
						)}
						{!view.preview && view.error === 'failed' && (
							<Button variant="outline" onClick={() => void deletion.review()}>
								{t('huhubot.chat.retry')}
							</Button>
						)}
						<AlertDialogAction
							disabled={!!view.busy || !view.preview || blocked}
							onClick={(event) => {
								event.preventDefault();
								void deletion.remove().then((deleted) => {
									if (deleted) {
										setOpen(false);
										onDeleted?.(agent.id);
									}
								});
							}}
						>
							{t(view.error === 'unknown' ? 'huhubot.chat.retryOriginal' : 'huhubot.agent.confirmDelete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
