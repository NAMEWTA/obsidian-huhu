import { KeyRound } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import { entryLabel } from '../core/model';

/**
 * Entries have no favicon: fetching one would tell the network which sites are in the safe. An entry shows its own
 * uploaded icon, or a tile with its first letter on one of the theme's chart colours (stable per entry).
 */
const TONES = [
	'bg-chart-1/15 text-chart-1',
	'bg-chart-2/15 text-chart-2',
	'bg-chart-3/15 text-chart-3',
	'bg-chart-4/15 text-chart-4',
	'bg-chart-5/15 text-chart-5',
] as const;

const SIZES = { sm: 'size-7 rounded-md text-xs', md: 'size-8 rounded-md text-sm', lg: 'size-10 rounded-lg text-base' } as const;

export function toneOf(id: string): number {
	let hash = 0;
	for (const character of id) hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
	return hash % TONES.length;
}

type Labelled = { title: string; url: string; credentials: readonly { username: string }[] };

export function entryInitial(entry: Labelled): string {
	const first = Array.from(entryLabel(entry).trim().replace(/^[a-z][a-z0-9+.-]*:\/\/(www\.)?/i, ''))[0];
	return first ? first.toUpperCase() : '';
}

export function EntryIcon({ entry, size = 'md', className }: { entry: Labelled & { id: string; icon: string | null }; size?: keyof typeof SIZES; className?: string }) {
	if (entry.icon) return <img src={entry.icon} alt="" aria-hidden draggable={false} className={cn('shrink-0 bg-muted object-cover', SIZES[size], className)} />;
	const initial = entryInitial(entry);
	return <span aria-hidden className={cn('flex shrink-0 items-center justify-center font-semibold select-none', SIZES[size], TONES[toneOf(entry.id)], className)}>
		{initial || <KeyRound className="size-1/2" />}
	</span>;
}
