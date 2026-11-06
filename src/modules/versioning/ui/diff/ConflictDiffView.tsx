import { displayText } from './preferences';
import { useEffect, useRef, useState } from 'react';
import { UnresolvedFile } from '@pierre/diffs/react';
import type { MergeConflictResolution, UnresolvedFile as UnresolvedInstance } from '@pierre/diffs';
import type { App } from 'obsidian';
import { t } from '../../../../shared/i18n';
import { Button } from '../../../../ui/components/button';
import type { VersioningQueries, ResolvedEndpoint } from '../../core/history';
import type { RestoreReceipt } from '../../core/restore';
import type { RestoreService } from '../../services/restore-service';
import type { SyncService } from '../../services/sync-service';
import { confirmAction } from '../dialogs';
import { DiffMessage } from '../DiffSurface';
import { languageForFilename } from './endpoint';
import { DiffOwner } from './owner-pool';

/** The beta React input is uncontrolled: actual source identity remounts it after a successful write only. */
export function ConflictDiffView({
	app,
	path,
	revision,
	queries,
	service,
	restores,
	onReceipt,
}: {
	onReceipt?: (receipt: RestoreReceipt) => void;
	app: App;
	path: string;
	revision: number;
	queries: VersioningQueries;
	service: SyncService;
	restores: RestoreService;
}) {
	const [state, setState] = useState<{ key: string; endpoint?: ResolvedEndpoint; error?: string }>();
	const [refresh, setRefresh] = useState(0),
		[busy, setBusy] = useState(false),
		[error, setError] = useState('');
	const [receipt, setReceipt] = useState<RestoreReceipt>();
	const active = useRef('');
	const key = `${path}:${revision}:${refresh}`;
	useEffect(() => {
		active.current = key;
		const abort = new AbortController();
		void queries.resolve({ kind: 'worktree', path }, abort.signal).then(
			(endpoint) => {
				if (!abort.signal.aborted) setState({ key, endpoint });
			},
			(error) => {
				if (!abort.signal.aborted) setState({ key, error: String(error) });
			},
		);
		return () => {
			active.current = '';
			abort.abort();
		};
	}, [key, path, queries]);
	const endpoint = state?.key === key ? state.endpoint : undefined;
	const resolve = async (
		index: number,
		resolution: MergeConflictResolution,
		instance: UnresolvedInstance | undefined,
	) => {
		if (busy || !instance || endpoint?.status !== 'text') return;
		setBusy(true);
		setError('');
		let planId: string | undefined;
		try {
			// The React beta hydrates metadata without its original file. Seed that public input before deriving a candidate.
			instance.render({
				file: {
					name: path,
					contents: endpoint.snapshot.text.replace(/^\uFEFF/, ''),
					cacheKey: endpoint.id,
					lang: languageForFilename(path),
				},
				preventEmit: true,
			});
			const resolved = instance.resolveConflict(index, resolution);
			if (!resolved) throw new Error('versioning.restore.changed');
			const candidate = (endpoint.snapshot.hasBom ? '\uFEFF' : '') + resolved.file.contents;
			const conflict = await service.conflictAdmission(path);
			if (conflict.worktreeId !== endpoint.id) throw new Error('versioning.restore.changed');
			const plan = await restores.prepare({
				source: { id: endpoint.id, text: candidate, label: path },
				targetPath: conflict.targetPath,
				mode: 'replace-current',
				conflict,
			});
			planId = plan.id;
			if (plan.beforeText === null || displayText(plan.beforeText) !== displayText(endpoint.snapshot.text))
				throw new Error('versioning.restore.changed');
			if (
				active.current !== key ||
				!(await confirmAction(app, {
					title: t('versioning.conflict.confirm'),
					message: path,
					action: t(`versioning.conflict.${resolution}`),
					danger: true,
				}))
			)
				return;
			const result = await restores.apply(plan.id);
			planId = undefined;
			onReceipt?.(result);
			if (active.current === key) {
				setReceipt(result);
				setRefresh((value) => value + 1);
			}
		} catch (error) {
			if (active.current === key) setError(error instanceof Error ? error.message : String(error));
		} finally {
			if (planId) restores.cancel(planId);
			setBusy(false);
		}
	};
	return (
		<section className="huhu-versioning-diff flex min-h-0 flex-1 flex-col">
			{error && (
				<p role="alert" className="p-3 text-sm text-destructive">
					{t(error)}
				</p>
			)}
			{receipt && !onReceipt && (
				<div className="flex flex-wrap gap-2 border-b p-2" role="status">
					<span>{t('review.restored')}</span>
					<Button
						size="sm"
						variant="secondary"
						disabled={busy || !!receipt.undoneBy}
						onClick={() => {
							setBusy(true);
							setError('');
							void service
								.conflictAdmission(path)
								.then((admission) => restores.undo(receipt.id, admission))
								.then(
									(result) => {
										setReceipt(result);
										setRefresh((value) => value + 1);
									},
									(error) => setError(String(error)),
								)
								.finally(() => setBusy(false));
						}}
					>
						{t('review.undo')}
					</Button>
				</div>
			)}
			{state?.key === key && state.error ? (
				<DiffMessage message={state.error} />
			) : !endpoint ? (
				<DiffMessage busy message={t('versioning.diff.computing')} />
			) : endpoint.status !== 'text' ? (
				<DiffMessage message={t(`versioning.diff.status.${endpoint.status}`)} />
			) : (
				<div className="min-h-0 flex-1 overflow-auto">
					<DiffOwner>
						<UnresolvedFile
							key={endpoint.id}
							file={{
								name: path,
								contents: endpoint.snapshot.text.replace(/^\uFEFF/, ''),
								cacheKey: endpoint.id,
								lang: languageForFilename(path),
							}}
							options={{
								theme: 'huhu',
								preferredHighlighter: 'shiki-js',
								mergeConflictActionsType: 'none',
							}}
							renderMergeConflictUtility={(action, getInstance) => (
								<div className="flex flex-wrap gap-1 p-1">
									{(['current', 'incoming', 'both'] as const).map((resolution) => (
										<Button
											key={resolution}
											size="sm"
											variant="secondary"
											disabled={busy}
											onClick={() =>
												void resolve(action.conflictIndex, resolution, getInstance())
											}
										>
											{t(`versioning.conflict.${resolution}`)}
										</Button>
									))}
								</div>
							)}
						/>
					</DiffOwner>
				</div>
			)}
		</section>
	);
}
