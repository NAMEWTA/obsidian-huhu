import type { RevisionFileChange } from '../../core/history';
import { ArrowLeftRight } from 'lucide-react';
import { t } from '../../../../shared/i18n';
import { Badge } from '../../../../ui/components/badge';
import { Input } from '../../../../ui/components/input';
import { Button } from '../../../../ui/components/button';
import { ActionButton } from '../../../../ui/components/huhu/ActionButton';

/** Domain references remain explicit; browsing never checks out a branch. */
export function CompareEndpoints({
	a,
	b,
	onChange,
	onSwap,
	files,
	error,
	fixedA,
	fixedB,
}: {
	a: string;
	b: string;
	onChange: (a: string, b: string) => void;
	onSwap?: () => void;
	files?: readonly RevisionFileChange[];
	error?: string;
	fixedA?: string;
	fixedB?: string;
}) {
	return (
		<div className="flex flex-wrap items-end gap-2 border-b border-border p-3">
			<label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
				<span className="flex items-center gap-2">
					<Badge variant="error" className="rounded-full">
						A · {fixedA ?? a}
					</Badge>
					{t('versioning.compare.base')}
				</span>
				<Input
					value={a}
					onChange={(event) => onChange(event.currentTarget.value, b)}
					aria-label={t('versioning.compare.base')}
				/>
			</label>
			<ActionButton
				size="icon-md"
				label={t('versioning.diff.swap')}
				onClick={() => (onSwap ? onSwap() : onChange(b, a))}
			>
				<ArrowLeftRight />
			</ActionButton>
			<label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
				<span className="flex items-center gap-2">
					<Badge variant="success" className="rounded-full">
						B · {fixedB ?? b}
					</Badge>
					{t('versioning.compare.target')}
				</span>
				<Input
					value={b}
					onChange={(event) => onChange(a, event.currentTarget.value)}
					aria-label={t('versioning.compare.target')}
				/>
			</label>
			<Button size="sm" variant="secondary" onClick={() => onChange(a, 'WORKTREE')}>
				{t('versioning.diff.worktree')}
			</Button>
			<div role="status" className="w-full text-xs text-muted-foreground">
				{error
					? error
					: !files
						? t('versioning.files.loading')
						: t('versioning.compare.summary', {
								files: files.length,
								additions: files.some((file) => file.additions == null)
									? '?'
									: files.reduce((sum, file) => sum + file.additions!, 0),
								deletions: files.some((file) => file.deletions == null)
									? '?'
									: files.reduce((sum, file) => sum + file.deletions!, 0),
							})}
				{files?.some((file) => file.additions == null || file.deletions == null) && (
					<> · {t('versioning.compare.unknownStats')}</>
				)}
			</div>
		</div>
	);
}
