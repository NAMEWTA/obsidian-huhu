import { ArrowDown, ArrowUp, ArrowLeftRight, ChevronsDownUp, WrapText, X } from 'lucide-react';
import { t } from '../../../../shared/i18n';
import { ActionButton } from '../../../../ui/components/huhu/ActionButton';
import { SegmentedControl } from '../../../../ui/components/huhu/SettingsFormControls';
import type { DiffLayout, DiffPreferences } from './preferences';

export function DiffToolbar({
	preferences: p,
	update,
	layout,
	narrow,
	count,
	onMove,
	onClose,
}: {
	preferences: DiffPreferences;
	update: (patch: Partial<DiffPreferences>) => void;
	layout: DiffLayout;
	narrow: boolean;
	count: number;
	onMove: (direction: -1 | 1) => void;
	onClose?: () => void;
}) {
	return (
		<div
			className="flex min-h-11 shrink-0 flex-wrap items-center gap-1 border-b border-border px-2 py-1"
			role="toolbar"
			aria-label={t('versioning.diff.controls')}
		>
			<SegmentedControl<DiffLayout>
				size="sm"
				ariaLabel={t('versioning.diff.layout')}
				value={layout}
				onChange={(layout) => update({ layout })}
				options={[
					{ value: 'side-by-side', label: t('versioning.diff.sideBySide'), disabled: narrow },
					{ value: 'stacked', label: t('versioning.diff.stacked') },
				]}
			/>
			<span className="ml-auto flex flex-wrap items-center gap-1">
				<ActionButton
					size="icon-sm"
					label={t('versioning.diff.swap')}
					aria-pressed={p.swapped}
					onClick={() => update({ swapped: !p.swapped })}
				>
					<ArrowLeftRight />
				</ActionButton>
				<ActionButton
					size="icon-sm"
					label={t('versioning.diff.wrap')}
					aria-pressed={p.wrap ?? true}
					onClick={() => update({ wrap: !(p.wrap ?? true) })}
				>
					<WrapText />
				</ActionButton>
				<ActionButton
					size="icon-sm"
					label={t('versioning.diff.word')}
					aria-pressed={p.wordDiff ?? true}
					onClick={() => update({ wordDiff: !(p.wordDiff ?? true) })}
				>
					<span>±</span>
				</ActionButton>
				<ActionButton
					size="icon-sm"
					label={t('versioning.diff.collapse')}
					aria-pressed={p.collapse ?? true}
					onClick={() => update({ collapse: !(p.collapse ?? true) })}
				>
					<ChevronsDownUp />
				</ActionButton>
				<ActionButton
					size="icon-sm"
					label={t('versioning.diff.previous')}
					disabled={!count}
					onClick={() => onMove(-1)}
				>
					<ArrowUp />
				</ActionButton>
				<ActionButton
					size="icon-sm"
					label={t('versioning.diff.next')}
					disabled={!count}
					onClick={() => onMove(1)}
				>
					<ArrowDown />
				</ActionButton>
				{onClose && (
					<ActionButton size="icon-sm" label={t('versioning.diff.close')} onClick={onClose}>
						<X />
					</ActionButton>
				)}
			</span>
		</div>
	);
}
