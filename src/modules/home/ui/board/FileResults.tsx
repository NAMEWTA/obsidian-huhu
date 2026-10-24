import { Button } from '../../../../ui/components/button';
import { cn } from '../../../../ui/lib/utils';
import { RelativeTime } from '../../../../ui/components/huhu/RelativeTime';
import { FileGlyph } from './rows';

export interface FileResult {
	path: string;
	basename: string;
	stat: { mtime: number };
}

/**
 * Notes as list rows: type icon, name over folder, and (for recent notes) how long ago. The row under the keyboard is
 * highlighted; the same rows serve the capture box, the file search and the recent list.
 */
export function FileResults({
	rows,
	index = -1,
	showTime = false,
	onPick,
	empty,
	className,
}: {
	rows: readonly FileResult[];
	index?: number;
	showTime?: boolean;
	onPick(this: void, file: FileResult): void;
	empty: string;
	className?: string;
}) {
	if (!rows.length) return <p className={cn('m-0 p-4 text-center text-sm text-muted-foreground', className)}>{empty}</p>;
	return (
		<ul data-file-results className={cn('m-0 flex list-none flex-col gap-0.5 p-0', className)}>
			{rows.map((file, i) => (
				<li key={file.path} className="min-w-0">
					<Button
						type="button"
						variant="ghost"
						title={file.path}
						className={cn('h-10 w-full min-w-0 justify-start gap-2 px-2 font-normal', i === index && 'bg-accent')}
						onClick={() => onPick(file)}
					>
						<FileGlyph path={file.path} />
						<span className="min-w-0 flex-1 text-left">
							<span className="block truncate text-sm leading-4">{file.basename}</span>
							<span className="block truncate text-xs leading-4 text-muted-foreground">
								{file.path.split('/').slice(0, -1).join('/') || '/'}
							</span>
						</span>
						{showTime && (
							<RelativeTime value={file.stat.mtime} className="shrink-0 text-xs text-muted-foreground" />
						)}
					</Button>
				</li>
			))}
		</ul>
	);
}
