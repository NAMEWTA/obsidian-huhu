import type { CSSProperties, ReactNode } from 'react';
import { t } from '../../../../shared/i18n';
import { Check } from 'lucide-react';
import { cn } from '../../../../ui/lib/utils';
import type { EditorScheme, ThemePreset } from '../../../../theme/settings';

/** Selection tile shared by the theme and editor-scheme grids: a preview on top, the name below. */
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
				'group flex min-w-0 flex-col items-stretch gap-1.5 rounded-lg border border-border bg-card p-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				selected && 'border-primary ring-1 ring-primary',
			)}
		>
			<div className="flex w-full overflow-hidden rounded-md border border-border" aria-hidden>
				{children}
			</div>
			<span className="flex min-w-0 items-center gap-1 px-0.5 text-xs font-medium">
				<span className="min-w-0 flex-1 truncate" title={hint ? `${label} · ${hint}` : label}>
					{label}
				</span>
				{selected && <Check aria-hidden className="size-3.5 shrink-0 text-primary" />}
			</span>
		</button>
	);
}

/** One half of a theme preview: a miniature sidebar and page drawn from the palette's `--nt-*` tokens. */
function ThemeHalf({
	id,
	mode,
	style,
	variant,
}: {
	id: string;
	mode: 'light' | 'dark';
	style?: CSSProperties;
	variant?: string;
}) {
	return (
		<div
			className={cn(
				`huhu-theme--${id}`,
				`theme-${mode}`,
				id === 'suliworld' && `huhu-theme-variant--${variant ?? 'cream'}`,
				'relative flex h-20 min-w-0 flex-1',
			)}
			style={style}
		>
			<div
				className="flex w-[28%] flex-col gap-1 p-1.5"
				style={{ background: 'var(--nt-sidebar)', borderRight: '1px solid var(--nt-border)' }}
			>
				<span className="h-1 w-3/4 rounded-full" style={{ background: 'var(--nt-muted-foreground)' }} />
				<span className="h-1 w-1/2 rounded-full" style={{ background: 'var(--nt-faint)' }} />
				<span className="h-1 w-2/3 rounded-full" style={{ background: 'var(--nt-faint)' }} />
			</div>
			<div
				className="flex min-w-0 flex-1 flex-col gap-1 p-1.5 pb-5"
				style={{ background: 'var(--nt-background)' }}
			>
				<span
					className="mb-1 h-2 w-4/5 rounded-full"
					style={{
						background:
							id === 'suliworld'
								? mode === 'light' && variant === 'forest'
									? 'var(--nsw-orange)'
									: 'var(--nsw-tab)'
								: 'var(--nt-primary)',
					}}
				/>
				<span className="h-1.5 w-3/4 rounded-full" style={{ background: 'var(--nt-foreground)' }} />
				<span className="h-1 w-full rounded-full" style={{ background: 'var(--nt-muted-foreground)' }} />
				<span className="mt-auto h-2 w-7 rounded-sm" style={{ background: 'var(--nt-primary)' }} />
			</div>
			<span
				className="absolute bottom-1 right-1 text-[8px] leading-none"
				style={{ color: 'var(--nt-muted-foreground)' }}
			>
				{t(`appearance.previewMode.${mode}`)}
			</span>
		</div>
	);
}

/** One half of a scheme preview: heading, bold, italic, code, link and a quote in the scheme's colours. */
function SchemeHalf({
	id,
	mode,
	sample,
}: {
	id: string;
	mode: 'light' | 'dark' | 'current';
	sample: Record<'heading' | 'subheading' | 'bold' | 'italic' | 'code' | 'link' | 'quote', string>;
}) {
	const follow = id === 'follow';
	const ink = (token: string, fallback: string) => `var(--ne-${token}, var(--${fallback}))`;
	return (
		<div
			className={cn(
				!follow && `huhu-editor--${id}`,
				!follow && `theme-${mode}`,
				follow && 'huhu-ne-follow',
				'min-w-0 flex-1 space-y-0.5 overflow-hidden px-2 py-1.5 text-3xs leading-snug',
			)}
			style={
				follow
					? { background: 'var(--background-primary)', color: 'var(--text-normal)' }
					: { background: 'var(--ne-preview-bg)', color: 'var(--ne-preview-fg)' }
			}
		>
			<div className="truncate text-xs font-bold" style={{ color: ink('h1', 'text-normal') }}>
				{sample.heading}
			</div>
			<div className="truncate text-2xs font-semibold" style={{ color: ink('h2', 'text-normal') }}>
				{sample.subheading}
			</div>
			<div className="truncate">
				<b style={{ color: ink('bold', 'text-normal') }}>{sample.bold}</b>{' '}
				<i style={{ color: ink('italic', 'text-normal') }}>{sample.italic}</i>{' '}
				<code
					className="rounded-sm px-0.5 font-mono"
					style={{ color: ink('code', 'text-normal'), background: ink('code-bg', 'background-secondary') }}
				>
					{sample.code}
				</code>{' '}
				<span className="underline" style={{ color: ink('link', 'text-accent') }}>
					{sample.link}
				</span>
			</div>
			<div
				className="truncate border-l-2 pl-1"
				style={{ borderColor: ink('quote', 'text-faint'), color: ink('quote-text', 'text-muted') }}
			>
				{sample.quote}
			</div>
		</div>
	);
}

export function SwatchGrid({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
	return (
		<div
			role="group"
			aria-label={label}
			className={cn(
				'grid gap-2',
				wide
					? 'grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]'
					: 'grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]',
			)}
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
	customStyles,
	variant,
}: {
	id: ThemePreset | 'obsidian';
	variant?: string;
	selected: boolean;
	label: string;
	hint?: string;
	onSelect: () => void;
	/** Inline `--nt-*` tokens of the custom palette, per mode. */
	customStyles?: { light: CSSProperties; dark: CSSProperties };
}) {
	// The Default theme is previewed with a fixed Obsidian look, since the live variables may be overridden by another theme.
	const palette = id === 'default' ? 'obsidian' : id;
	return (
		<Tile selected={selected} label={label} hint={hint} onSelect={onSelect}>
			<ThemeHalf variant={variant} id={palette} mode="light" style={customStyles?.light} />
			<ThemeHalf variant={variant} id={palette} mode="dark" style={customStyles?.dark} />
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
		<Tile selected={selected} label={label} hint={hint} onSelect={onSelect}>
			{id === 'follow' ? (
				<SchemeHalf id={id} mode="current" sample={sample} />
			) : (
				<>
					<SchemeHalf id={id} mode="light" sample={sample} />
					<SchemeHalf id={id} mode="dark" sample={sample} />
				</>
			)}
		</Tile>
	);
}
