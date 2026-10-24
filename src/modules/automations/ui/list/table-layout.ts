// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/automations/automations-table-layout.ts, src/renderer/src/lib/list-table-layout.ts
// HUHU replaces project/host with action/cwd. Sticky stacking uses the design system's z-10.
export const TABLE_GRID =
	'grid grid-cols-[minmax(11rem,1.8fr)_minmax(6.5rem,9.5rem)_minmax(8rem,1fr)_minmax(7.5rem,9.5rem)_minmax(7rem,9.5rem)_minmax(4.5rem,5.5rem)_2.5rem_2.5rem] @max-[880px]:grid-cols-[minmax(8rem,1.6fr)_minmax(5.5rem,8rem)_minmax(6rem,1fr)_minmax(6rem,9rem)_minmax(3.5rem,4.5rem)_2.5rem] @max-[600px]:grid-cols-[minmax(7rem,1.6fr)_minmax(5.5rem,8rem)_minmax(6rem,8rem)_minmax(3.5rem,4.5rem)_2.5rem]';
/** Dropped when the list is narrow: the next run time and the agent icon. */
export const NARROW_HIDDEN = '@max-[880px]:hidden';
/** Also dropped when the list is very narrow: the action and directory. */
export const NARROWER_HIDDEN = '@max-[600px]:hidden';
export const TABLE_ROW =
	'group/list-table-row relative w-full min-h-11 scroll-mt-8 cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent/50 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';
export const STICKY_CELL =
	'sticky left-3 z-10 flex min-w-0 self-stretch items-center bg-background before:absolute before:-left-3 before:top-0 before:bottom-0 before:w-3 before:bg-inherit after:absolute after:-right-3 after:top-0 after:bottom-0 after:w-3 after:bg-inherit group-hover/list-table-row:bg-accent group-data-[current=true]/list-table-row:bg-accent';
