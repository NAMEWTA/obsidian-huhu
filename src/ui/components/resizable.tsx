// Adapted from shadcn/ui new-york-v4 (MIT), Copyright (c) 2023 shadcn.
// Original recipe: shadcn-ui/ui, apps/v4/registry/new-york-v4/ui/resizable.tsx.
// The inherited recipe did not record an upstream revision; none is inferred here.
// HUHU adaptation uses installed react-resizable-panels 4.18.1 Group/Panel/Separator APIs.
// API source: https://github.com/bvaughn/react-resizable-panels
import type { ComponentProps } from 'react';
import { GripVerticalIcon } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { cn } from '../lib/utils';

/** v4 layout is keyed by Panel id. Numeric Panel sizes are pixels; use "50%" for percentages. */
export function ResizablePanelGroup({ className, ...props }: ComponentProps<typeof Group>) {
	return (
		<Group
			data-slot="resizable-panel-group"
			resizeTargetMinimumSize={{ fine: 32, coarse: 44 }}
			className={cn('h-full w-full', className)}
			{...props}
		/>
	);
}
export function ResizablePanel(props: ComponentProps<typeof Panel>) {
	return <Panel data-slot="resizable-panel" {...props} />;
}
export function ResizableHandle({
	withHandle,
	className,
	...props
}: ComponentProps<typeof Separator> & { withHandle?: boolean }) {
	return (
		<Separator
			data-slot="resizable-handle"
			className={cn(
				'relative flex w-[var(--hu-hit)] items-center justify-center bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-[var(--hu-line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)] aria-[orientation=horizontal]:h-[var(--hu-hit)] aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:inset-y-auto aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-px aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90',
				className,
			)}
			{...props}
		>
			{withHandle && (
				<div
					aria-hidden
					className="flex h-4 w-3 items-center justify-center rounded-[var(--hu-radius-xs)] border border-[var(--hu-line)] bg-[var(--hu-sunken)]"
				>
					<GripVerticalIcon className="size-2.5" />
				</div>
			)}
		</Separator>
	);
}
