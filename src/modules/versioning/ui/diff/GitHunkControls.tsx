import { displayText } from './preferences';
import { useState } from 'react';
import type { App } from 'obsidian';
import type { FileDiffMetadata } from '@pierre/diffs';
import { t } from '../../../../shared/i18n';
import { Button } from '../../../../ui/components/button';
import type { ResolvedComparison, VersioningQueries } from '../../core/history';
import type { SyncService } from '../../services/sync-service';
import type { RestoreService } from '../../services/restore-service';
import type { RestoreReceipt } from '../../core/restore';
import { confirmAction } from '../dialogs';
import type { HunkDiff } from '../../core/hunk-restore';
import { hunkCandidate } from './hunk-proof';

export interface GitHunkActions {
	onReceipt?: (receipt: RestoreReceipt) => void;
	app: App;
	service: SyncService;
	queries: VersioningQueries;
	restores?: RestoreService;
	direction: 'stage' | 'unstage';
	head: string | null;
}
export function GitHunkControls({
	comparison,
	metadata,
	actions,
	proof,
	hunkIndex,
}: {
	comparison: ResolvedComparison;
	metadata: FileDiffMetadata;
	actions: GitHunkActions;
	proof: HunkDiff;
	hunkIndex: number;
}) {
	const [busy, setBusy] = useState(false),
		[error, setError] = useState('');
	const [receipt, setReceipt] = useState<RestoreReceipt>();
	const { left, right } = comparison;
	if (!['text', 'missing'].includes(left.status) || !['text', 'missing'].includes(right.status)) return null;
	const leftText = left.status === 'text' ? left.snapshot.text : '',
		rightText = right.status === 'text' ? right.snapshot.text : '';
	const operate = async (index: number, restore: boolean) => {
		if (busy) return;
		setBusy(true);
		setError('');
		let planId: string | undefined;
		try {
			const path = right.path;
			const candidate = hunkCandidate(
				leftText,
				rightText,
				metadata,
				index,
				restore || actions.direction === 'unstage' ? 'reject' : 'accept',
			);
			const [currentIndex, worktree] = await Promise.all([
				actions.queries.resolve({ kind: 'index', path: actions.direction === 'stage' ? left.path : path }),
				actions.queries.resolve({ kind: 'worktree', path }),
			]);
			const expectedIndex = actions.direction === 'stage' ? left : right;
			if (
				(expectedIndex.status === 'missing'
					? currentIndex.status !== 'missing'
					: currentIndex.id !== expectedIndex.id) ||
				(actions.direction === 'stage' && worktree.id !== right.id)
			)
				throw new Error('versioning.restore.changed');
			if (restore) {
				const restores = actions.restores;
				const targetPath = actions.service.snapshot.place?.toVault(path);
				if (!restores || !targetPath) throw new Error('versioning.restore.changed');
				const plan = await restores.prepare({
					source: { id: left.id, text: candidate, label: path },
					targetPath,
					mode: 'replace-current',
					gitHunks: {
						repositoryId: comparison.repositoryId,
						path,
						targetPath,
						indexId: currentIndex.id,
						worktreeId: right.id,
						indexPath: left.path,
						indexText: left.status === 'text' ? left.snapshot.text : null,
						worktreeText: right.status === 'text' ? right.snapshot.text : null,
						diff: proof,
						selected: [
							`${proof.chunks[index]!.fromA}:${proof.chunks[index]!.toA}:${proof.chunks[index]!.fromB}:${proof.chunks[index]!.toB}`,
						],
					},
				});
				planId = plan.id;
				if (
					right.status === 'missing'
						? plan.beforeText !== null
						: plan.beforeText === null || displayText(plan.beforeText) !== displayText(rightText)
				)
					throw new Error('versioning.restore.changed');
				if (
					!(await confirmAction(actions.app, {
						title: t('versioning.hunk.restore'),
						message: path,
						action: t('review.confirm'),
						danger: true,
					}))
				)
					return;
				const result = await restores.apply(plan.id);
				setReceipt(result);
				actions.onReceipt?.(result);
				planId = undefined;
			} else {
				const chunk = proof.chunks[index]!;
				await actions.service.applyIndexHunks({
					repositoryId: comparison.repositoryId,
					path,
					direction: actions.direction,
					head: actions.head,
					indexId: currentIndex.id,
					worktreeId: worktree.id,
					comparison,
					diff: proof,
					selected: [`${chunk.fromA}:${chunk.toA}:${chunk.fromB}:${chunk.toB}`],
					candidate:
						(actions.direction === 'stage' ? right : left).status === 'missing' && candidate === ''
							? null
							: candidate,
				});
			}
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			if (planId) actions.restores?.cancel(planId);
			setBusy(false);
		}
	};
	return (
		<section aria-label={t('review.hunks.title')} className="shrink-0 space-y-1 border-b p-2 text-xs">
			{error && <p role="alert">{t(error)}</p>}
			<div className="flex max-h-32 flex-wrap gap-2 overflow-auto">
				{proof.chunks.map((chunk, index) =>
					index === hunkIndex ? (
						<div
							key={`${chunk.fromA}:${chunk.fromB}`}
							className="flex flex-wrap items-center gap-1 rounded-md border p-1"
						>
							<span>{t('review.hunks.change', { number: index + 1 })}</span>
							<Button
								size="sm"
								variant="secondary"
								disabled={busy}
								onClick={() => void operate(index, false)}
							>
								{t(actions.direction === 'stage' ? 'versioning.hunk.stage' : 'versioning.hunk.unstage')}
							</Button>
							{actions.direction === 'stage' && actions.restores && (
								<Button
									size="sm"
									variant="danger-ghost"
									disabled={busy}
									onClick={() => void operate(index, true)}
								>
									{t('versioning.hunk.restore')}
								</Button>
							)}
						</div>
					) : null,
				)}
			</div>
			{receipt && !actions.onReceipt && (
				<div role="status" className="flex flex-wrap items-center gap-2">
					<span>{t('review.restored')}</span>
					<Button
						size="sm"
						disabled={busy || !!receipt.undoneBy}
						onClick={() => {
							setBusy(true);
							void actions
								.restores!.undo(receipt.id)
								.then(setReceipt, (error) => setError(String(error)))
								.finally(() => setBusy(false));
						}}
					>
						{t('review.undo')}
					</Button>
				</div>
			)}
		</section>
	);
}
