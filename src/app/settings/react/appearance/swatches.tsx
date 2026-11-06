import type { ReactNode } from 'react';
import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '../../../../ui/lib/utils';
import type { EditorScheme, ThemePreset } from '../../../../theme/settings';

function Tile({
	selected,
	label,
	hint,
	onSelect,
	children,
}: {
	selected: boolean;
	label: string;
	hint?: string;
	onSelect: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			aria-label={label}
			onClick={onSelect}
			className={cn(
				'flex min-w-0 flex-col gap-3 rounded-[var(--hu-radius-md)] border border-[var(--hu-line)] bg-[var(--hu-surface)] p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-[var(--hu-accent)]',
				selected && 'border-[var(--hu-accent)]',
			)}
		>
			<div aria-hidden="true" className="flex min-w-0 overflow-hidden rounded-[var(--hu-radius-sm)]">
				{children}
			</div>
			<span className="flex items-center gap-2">
				<span className="min-w-0 flex-1 break-words">{label}</span>
				{selected && <Check className="size-4 shrink-0 text-[var(--hu-accent-text)]" />}
			</span>
			{hint && <span className="text-sm text-[var(--hu-fg-2)]">{hint}</span>}
		</button>
	);
}
export function SwatchGrid({ label, children }: { label: string; wide?: boolean; children: ReactNode }) {
	return (
		<div
			role="group"
			aria-label={label}
			className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3"
		>
			{children}
		</div>
	);
}
export function ThemeSwatch({
	id,
	selected,
	label,
	hint,
	onSelect,
}: {
	id: ThemePreset;
	variant?: string;
	selected: boolean;
	label: string;
	hint?: string;
	onSelect: () => void;
}) {
	const Glyph = id === 'paper' ? Sun : id === 'ink' ? Moon : Monitor;
	return (
		<Tile {...{ selected, label, hint, onSelect }}>
			<Glyph className="size-5 text-[var(--hu-accent-text)]" />
		</Tile>
	);
}
export function SchemeSwatch({
	id,
	selected,
	label,
	hint,
	onSelect,
	sample,
}: {
	id: EditorScheme;
	selected: boolean;
	label: string;
	hint?: string;
	onSelect: () => void;
	sample: Record<'heading' | 'subheading' | 'bold' | 'italic' | 'code' | 'link' | 'quote', string>;
}) {
	return (
		<Tile {...{ selected, label, hint, onSelect }}>
			<div
				className={cn('w-full min-w-0 space-y-2 p-2 text-sm', id !== 'follow' && `huhu-editor--${id}`)}
				style={{
					background: 'var(--ne-preview-bg, var(--hu-surface))',
					color: 'var(--ne-preview-fg, var(--hu-fg))',
				}}
			>
				<p className="m-0 break-words font-semibold" style={{ color: 'var(--ne-h1, var(--hu-fg))' }}>
					{sample.heading}
				</p>
				<p className="m-0 break-words">
					<b style={{ color: 'var(--ne-bold, var(--hu-fg))' }}>{sample.bold}</b> · <i>{sample.italic}</i>
				</p>
				<p className="m-0 break-words font-mono">{sample.code}</p>
			</div>
		</Tile>
	);
}
