import type { ReactNode } from 'react';
// Layout adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/SettingsFormControls.tsx
import { Button } from '../../../ui/components/button';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import {
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	Pencil,
	Ellipsis,
	TriangleAlert,
	Plus,
	Trash2,
	Search,
	X,
	ContactRound,
	Building2,
	ArrowLeft,
	ListFilter,
	ArrowDownWideNarrow,
	Phone,
	MapPin,
	SearchX,
	FileText,
	Image,
	FilePenLine,
	File,
	FolderOpen,
	BellPlus,
	Mail,
	Globe,
} from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import { ct } from './labels';
const icons: Record<string, typeof File> = {
	mail: Mail,
	globe: Globe,
	'folder-open': FolderOpen,
	'bell-plus': BellPlus,
	'chevron-left': ChevronLeft,
	'chevron-right': ChevronRight,
	'chevron-down': ChevronDown,
	pencil: Pencil,
	'more-horizontal': Ellipsis,
	'alert-triangle': TriangleAlert,
	plus: Plus,
	'trash-2': Trash2,
	search: Search,
	x: X,
	'contact-round': ContactRound,
	'building-2': Building2,
	'arrow-left': ArrowLeft,
	'list-filter': ListFilter,
	'arrow-down-wide-narrow': ArrowDownWideNarrow,
	phone: Phone,
	'map-pin': MapPin,
	'search-x': SearchX,
	'file-text': FileText,
	image: Image,
	'file-pen-line': FilePenLine,
	file: File,
};
export function Icon({ name, className }: { name: string; className?: string }) {
	const Component = icons[name] ?? File;
	return <Component aria-hidden className={cn('size-4 shrink-0', className)} />;
}
export function Pager({
	page,
	pages,
	count,
	go,
	live = false,
	footer = false,
}: {
	page: number;
	pages: number;
	count: number;
	go: (page: number) => void;
	live?: boolean;
	footer?: boolean;
}) {
	const body = (
		<>
			<Button variant="ghost" className="" disabled={page === 0} onClick={() => go(page - 1)}>
				<Icon name="chevron-left" />
				{ct('previous')}
			</Button>
			<span aria-live={live ? 'polite' : undefined}>{ct('page', { page: page + 1, total: pages, count })}</span>
			<Button variant="ghost" className="" disabled={page + 1 >= pages} onClick={() => go(page + 1)}>
				{ct('next')}
				<Icon name="chevron-right" />
			</Button>
		</>
	);
	return footer ? (
		<footer className="flex items-center justify-center gap-3 py-3 text-xs text-muted-foreground">{body}</footer>
	) : (
		<div className="flex items-center justify-center gap-3 py-3 text-xs text-muted-foreground">{body}</div>
	);
}

/**
 * Round initial avatar. `decorative` draws the initial from a data attribute so
 * the surrounding button's text content stays just the name.
 */
export function Monogram({
	name,
	size = 'md',
	decorative = false,
}: {
	name: string;
	size?: 'sm' | 'md' | 'lg';
	decorative?: boolean;
}) {
	const initial = [...name][0] || '?';
	const sizing = size === 'lg' ? 'size-12 text-lg' : size === 'sm' ? 'size-7 text-xs' : 'size-9 text-sm';
	const className = cn(
		'inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground before:content-[attr(data-initial)]',
		sizing,
	);
	return decorative ? (
		<span className={className} data-initial={initial} aria-hidden="true" />
	) : (
		<span className={className} aria-hidden="true">
			{initial}
		</span>
	);
}
export function Action({
	icon,
	label,
	action,
	disabled = false,
	primary = false,
}: {
	icon: string;
	label: string;
	action: () => void;
	disabled?: boolean;
	primary?: boolean;
}) {
	return (
		<ActionButton label={label} variant={primary ? 'default' : 'ghost'} disabled={disabled} onClick={action}>
			<Icon name={icon} />
		</ActionButton>
	);
}
/** Small rounded label used for kinds, statuses and tags. */
export function Chip({
	children,
	tone = 'default',
	title,
}: {
	children: ReactNode;
	tone?: 'default' | 'primary' | 'info';
	title?: string;
}) {
	return (
		<span
			title={title}
			className={cn(
				'inline-flex max-w-full items-center truncate rounded-full bg-secondary px-2 py-0.5 text-xs',
				tone === 'primary'
					? 'text-primary'
					: tone === 'info'
						? 'text-status-info'
						: 'text-secondary-foreground',
			)}
		>
			{children}
		</span>
	);
}
