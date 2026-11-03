import type { ComponentProps, ReactNode } from 'react';
import { Button } from '../../../../ui/components/button';
import { ObsidianIcon } from '../../../../ui/components/huhu/ObsidianIcon';
import { cn } from '../../../../ui/lib/utils';
import { defaultFileIcon, lucideIconId } from '../../../../shared/file-type-icons';

/** The default icon of a file type (`.md`, `.pdf`, `.pptx` ...), the same one the navigator and the file list show. */
export function FileGlyph({ path, className }: { path: string; className?: string }) {
	const { icon, color } = defaultFileIcon(path);
	return (
		<span
			aria-hidden
			className={cn('inline-flex shrink-0', !color && 'text-muted-foreground', className)}
			style={color ? { color } : undefined}
		>
			<ObsidianIcon name={lucideIconId(icon)} />
		</span>
	);
}

/**
 * One list row: a 36px button with an icon, a title that truncates and a quiet value at the right. Every list of the
 * board (recent notes, project documents, library rows) uses this, so rows have one height and one rhythm.
 */
export function RowButton({
	icon,
	trailing,
	wrap,
	className,
	children,
	...props
}: Omit<ComponentProps<typeof Button>, 'variant' | 'size'> & {
	icon?: ReactNode;
	trailing?: ReactNode;
	/** Long names wrap to two lines instead of hiding behind a hover hint. */
	wrap?: boolean;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			className={cn('h-9 w-full min-w-0 justify-start gap-2 px-2 font-normal', wrap && 'h-auto min-h-9 whitespace-normal py-1', className)}
			{...props}
		>
			{icon}
			<span className={cn('min-w-0 flex-1 text-left', wrap ? 'line-clamp-2 [overflow-wrap:anywhere]' : 'truncate')}>{children}</span>
			{trailing !== undefined && trailing !== null && (
				<span className="shrink-0 text-xs text-muted-foreground tabular-nums">{trailing}</span>
			)}
		</Button>
	);
}
