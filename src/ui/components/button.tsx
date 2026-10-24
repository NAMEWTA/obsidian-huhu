// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/button.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as Slot from 'radix-ui/slot';

import { cn } from '../lib/utils';

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 rounded-md cursor-pointer text-sm font-medium whitespace-nowrap transition-[transform,opacity] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:text-white dark:focus-visible:ring-destructive/40',
				outline:
					'border border-border bg-background text-foreground shadow-xs hover:border-muted-foreground/35 hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
				link: 'text-primary underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-9 px-4 py-2 has-[>svg]:px-3',
				xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
				lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
				icon: 'size-9',
				'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
				'icon-sm': 'size-8',
				'icon-lg': 'size-10',
			},
			// A text button never outgrows its container: the label gets the ellipsis, not the border. It keeps its
			// natural width in a row (a shrinking button would truncate next to a `w-full` input); a button without
			// text (an icon or a slotted element) keeps its exact box.
			content: {
				text: 'min-w-0 max-w-full',
				fixed: '',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
			content: 'fixed',
		},
	},
);

const isText = (node: React.ReactNode): node is string | number => typeof node === 'string' || typeof node === 'number';

/**
 * Bare text children become one ellipsising span (whitespace and wrapping are inherited from the button, so
 * a `whitespace-normal` button still wraps). Element children, icons and slotted content stay untouched.
 */
function labelled(children: React.ReactNode): { children: React.ReactNode; text: boolean } {
	const nodes = React.Children.toArray(children);
	if (!nodes.some(isText)) return { children, text: false };
	const out: React.ReactNode[] = [];
	let run = '';
	let runs = 0;
	const flush = () => {
		if (run.trim() !== '')
			out.push(
				<span key={`label-${runs++}`} className="min-w-0 overflow-hidden text-ellipsis">
					{run}
				</span>,
			);
		run = '';
	};
	for (const node of nodes) {
		if (isText(node)) run += String(node);
		else {
			flush();
			out.push(node);
		}
	}
	flush();
	return { children: out, text: runs > 0 };
}

const Button = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<'button'> &
		VariantProps<typeof buttonVariants> & {
			asChild?: boolean;
		}
>(function Button({ className, variant = 'default', size = 'default', asChild = false, children, ...props }, ref) {
	const Comp = asChild ? Slot.Root : 'button';
	const compact = size === 'xs' || size === 'icon-xs';
	const label = asChild ? { children, text: false } : labelled(children);

	return (
		<Comp
			ref={ref}
			data-slot="button"
			data-hit-control={compact || undefined}
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, content: label.text ? 'text' : 'fixed', className }))}
			{...props}
		>
			{label.children}
		</Comp>
	);
});

export { Button, buttonVariants };
