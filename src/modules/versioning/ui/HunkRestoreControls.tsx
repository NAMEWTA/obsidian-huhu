import type { HunkDiff, RestoreHunk } from '../core/hunk-restore';
import { restoreHunks } from '../core/hunk-restore';
import { useMemo, useState } from 'react';
import { Button } from '../../../ui/components/button';
import { Checkbox } from '../../../ui/components/checkbox';
import { useT } from '../../../ui/react/hooks';

export interface HunkRestoreAction {
	readonly reason?: string;
	readonly busy?: boolean;
	readonly prepare: (draft: { diff: HunkDiff; selected: readonly string[] }) => void;
}
export function HunkRestoreControls({ identity, source, target, diff, action, reveal }: {
	identity: string; source: string; target: string; diff?: HunkDiff; action: HunkRestoreAction; reveal: (hunk: RestoreHunk) => void;
}) {
	const t = useT();
	const [selection, setSelection] = useState<{ identity: string; ids: readonly string[] }>({ identity, ids: [] });
	const hunks = useMemo(() => {
		try { return diff ? restoreHunks(source, target, diff) : []; } catch { return []; }
	}, [source, target, diff]);
	const selected = selection.identity === identity ? selection.ids : [];
	const reason = action.reason ?? (!hunks.length ? 'versioning.restore.hunks-unavailable' : undefined);
	return <section className="shrink-0 space-y-2 border-b px-3 py-2 text-xs" aria-label={t('review.hunks.title')}>
		<div className="flex flex-wrap items-center gap-2">
			<span className="min-w-0 flex-1" role="status">{t(reason ?? 'review.hunks.help')}</span>
			<Button size="sm" variant="outline" disabled={action.busy || !!reason || !selected.length || selected.some(id => !hunks.some(hunk => hunk.id === id))}
				onClick={() => { if (diff) action.prepare({ diff, selected }); }}>
				{t('review.hunks.restore', { count: selected.length })}
			</Button>
		</div>
		{!!hunks.length && <div className="flex max-h-32 flex-wrap gap-2 overflow-auto">
			{hunks.map((hunk, index) => <label key={hunk.id} className="flex min-h-8 items-center gap-2 rounded-md border px-2 py-1">
				<Checkbox aria-label={t('review.hunks.change', { number: index + 1 })} checked={selected.includes(hunk.id)} disabled={action.busy || !!reason}
					onCheckedChange={checked => {
						setSelection({ identity, ids: checked ? [...selected, hunk.id] : selected.filter(id => id !== hunk.id) });
						reveal(hunk);
					}} />
				{t('review.hunks.change', { number: index + 1 })}
			</label>)}
		</div>}
	</section>;
}
