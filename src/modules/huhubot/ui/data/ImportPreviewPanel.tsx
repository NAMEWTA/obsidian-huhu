import { useId } from 'react';
import { Button } from '../../../../ui/components/button';
import { Label } from '../../../../ui/components/label';
import { useT } from '../../../../ui/react/hooks';
import type { PortablePreview } from '../../api';

type Resolution = 'keep' | 'replace' | 'copy';
interface Props {
	preview: PortablePreview;
	resolutions: Record<string, Resolution>;
	busy: boolean;
	uncertain?: boolean;
	onResolution: (id: string, action: Resolution) => void;
	onConfirm: (resolutions: Array<{ id: string; action: Resolution }>) => void;
	onAbandon: () => void;
}
/** Preview IDs belong to this token. Copy candidates are never presented as a chosen replacement target. */
export function ImportPreviewPanel({
	preview,
	resolutions,
	busy,
	uncertain,
	onResolution,
	onConfirm,
	onAbandon,
}: Props) {
	const t = useT(),
		id = useId();
	const bySource = new Map<string, PortablePreview['conflicts']>();
	for (const conflict of preview.conflicts)
		bySource.set(conflict.id, [...(bySource.get(conflict.id) ?? []), conflict]);
	const groups = [...bySource].map(([sourceId, targets]) => ({
		sourceId,
		targets,
		ambiguous: new Set(targets.map((target) => `${target.kind}:${target.existingId}`)).size > 1,
	}));
	const kindLabel = (kind: PortablePreview['mappings'][number]['kind']) =>
		t(
			kind === 'agent'
				? 'huhubot.chat.roster'
				: kind === 'session'
					? 'huhubot.chat.sessions'
					: 'huhubot.memory.title',
		);
	const missing = groups.some(
		(group) => !resolutions[group.sourceId] || (group.ambiguous && resolutions[group.sourceId] !== 'copy'),
	);
	return (
		<div className="mt-3 rounded border border-border p-3">
			{uncertain && (
				<p role="status" className="text-xs text-status-warning">
					{t('huhubot.chat.startUncertain')}
				</p>
			)}
			<h3 className="text-sm font-semibold">{t('huhubot.data.identityMappings')}</h3>
			<p className="text-xs text-muted-foreground">{t('huhubot.data.copyCandidateDescription')}</p>
			<ul
				aria-label={t('huhubot.data.identityMappings')}
				className="m-0 mb-3 grid max-h-64 list-none gap-2 overflow-auto p-0"
			>
				{preview.mappings.map((mapping) => (
					<li key={`${mapping.kind}:${mapping.from}`} className="rounded border border-border p-2 text-xs">
						<span className="font-medium">{kindLabel(mapping.kind)}</span>
						<p className="m-0 break-all">{t('huhubot.data.importedIdentity', { id: mapping.from })}</p>
						<p className="m-0 break-all">{t('huhubot.data.copyCandidateIdentity', { id: mapping.to })}</p>
					</li>
				))}
			</ul>
			<h3 className="text-sm font-semibold">{t('huhubot.data.conflictHeading')}</h3>
			{!groups.length ? (
				<p className="text-xs">{t('huhubot.data.noConflicts')}</p>
			) : (
				groups.map((group) => (
					<div key={group.sourceId} className="mb-3 grid gap-2 rounded border border-border p-2">
						<Label htmlFor={`${id}-${group.sourceId}`} className="break-all text-xs">
							{t('huhubot.data.importedIdentity', { id: group.sourceId })}
						</Label>
						<ul className="m-0 grid list-none gap-1 p-0">
							{group.targets.map((target) => (
								<li
									key={`${target.kind}:${target.existingId}`}
									className="break-all text-xs text-muted-foreground"
								>
									{kindLabel(target.kind)} ·{' '}
									{t('huhubot.data.existingIdentity', { id: target.existingId })} ·{' '}
									{t('huhubot.data.conflictRevision', { revision: target.revision })}
								</li>
							))}
						</ul>
						{group.ambiguous && (
							<p role="status" className="m-0 text-xs text-status-warning">
								{t('huhubot.data.ambiguousTargets')}
							</p>
						)}
						<select
							aria-label={t('huhubot.data.resolutionFor', { id: group.sourceId })}
							id={`${id}-${group.sourceId}`}
							disabled={busy || uncertain}
							value={resolutions[group.sourceId] ?? ''}
							className="h-9 max-w-full rounded border border-input bg-background px-2 text-sm"
							onChange={(event) => onResolution(group.sourceId, event.currentTarget.value as Resolution)}
						>
							<option value="">{t('huhubot.data.chooseResolution')}</option>
							<option value="keep" disabled={group.ambiguous}>
								{t('huhubot.data.keep')}
							</option>
							<option value="replace" disabled={group.ambiguous}>
								{t('huhubot.data.replace')}
							</option>
							<option value="copy">{t('huhubot.data.copy')}</option>
						</select>
					</div>
				))
			)}
			<Button
				disabled={busy || (!uncertain && missing)}
				onClick={() =>
					onConfirm(groups.map((group) => ({ id: group.sourceId, action: resolutions[group.sourceId]! })))
				}
			>
				{t(uncertain ? 'huhubot.chat.retryOriginal' : 'huhubot.data.import')}
			</Button>
			{uncertain && (
				<Button variant="outline" disabled={busy} onClick={onAbandon}>
					{t('huhubot.common.abandonRequest')}
				</Button>
			)}
		</div>
	);
}
