// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/button.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as Slot from 'radix-ui/slot';
import { LoaderCircle } from 'lucide-react';

import { cn } from '../lib/utils';

const buttonVariants = cva(
	"relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--hu-radius-md)] cursor-pointer text-sm font-medium whitespace-nowrap transition-[transform,opacity] duration-[var(--hu-dur-fast)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-[var(--hu-danger)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				primary:
					'border border-transparent bg-[var(--hu-accent)] text-[var(--hu-accent-fg)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--hu-raised)_12%,transparent),var(--hu-shadow-card)] dark:shadow-[inset_0_1px_0_color-mix(in_srgb,var(--hu-fg)_12%,transparent),var(--hu-shadow-card)] hover:opacity-90',
				secondary:
					'border border-[var(--hu-line-strong)] bg-[var(--hu-raised)] text-[var(--hu-fg)] hover:bg-[var(--hu-hover)]',
				ghost: 'border border-transparent bg-transparent text-[var(--hu-fg-2)] hover:bg-[var(--hu-hover)] hover:text-[var(--hu-fg)]',
				danger: 'border border-transparent bg-[var(--hu-danger)] text-[var(--hu-danger-fg)] hover:opacity-90',
				'danger-ghost':
					'border border-transparent bg-transparent text-[var(--hu-danger)] hover:bg-[var(--hu-danger-soft)]',
			},
			size: {
				sm: 'h-[var(--hu-ctl-h)] px-2',
				md: 'h-[var(--hu-ctl-h)] px-3',
				lg: 'h-[var(--hu-ctl-h-lg)] px-4',
				'icon-sm': 'size-[var(--hu-ctl-h)]',
				'icon-md': 'size-[var(--hu-ctl-h)]',
				'icon-lg': 'size-[var(--hu-ctl-h-lg)]',
			},
			content: { text: 'min-w-0 max-w-full', fixed: '' },
		},
		defaultVariants: { variant: 'primary', size: 'md', content: 'fixed' },
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

function busyContent(children: React.ReactNode): React.ReactNode {
	return (
		<>
			<span data-slot="button-content" className="inline-flex min-w-0 items-center gap-1.5 opacity-0">
				{children}
			</span>
			<LoaderCircle
				data-slot="button-spinner"
				aria-hidden="true"
				className="absolute size-4 animate-spin motion-reduce:animate-none"
			/>
		</>
	);
}

type ButtonChildProps = {
	children?: React.ReactNode;
	disabled?: boolean;
	'aria-disabled'?: boolean;
	onClick?: React.MouseEventHandler;
};

const Button = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<'button'> &
		VariantProps<typeof buttonVariants> & {
			asChild?: boolean;
			busy?: boolean;
		}
>(function Button(
	{
		className,
		variant = 'primary',
		size = 'md',
		asChild = false,
		busy = false,
		disabled,
		type,
		children,
		onClick,
		...props
	},
	ref,
) {
	const Comp = asChild ? Slot.Root : 'button';
	const child = asChild && React.isValidElement<ButtonChildProps>(children) ? children : null;
	const slottedChild =
		child && (disabled || busy)
			? React.cloneElement(child, {
					disabled: true,
					'aria-disabled': true,
					onClick: (event) => {
						event.preventDefault();
						event.stopPropagation();
					},
					...(busy ? { children: busyContent(child.props.children) } : {}),
				})
			: children;
	const label = asChild ? { children: slottedChild, text: false } : labelled(children);

	return (
		<Comp
			ref={ref}
			data-slot="button"
			data-hit-control
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, content: label.text ? 'text' : 'fixed', className }))}
			{...props}
			type={type}
			disabled={disabled || busy}
			aria-disabled={asChild && (disabled || busy) ? true : props['aria-disabled']}
			aria-busy={busy || props['aria-busy']}
			onClick={(event) => {
				if (disabled || busy) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				onClick?.(event);
			}}
		>
			{asChild ? label.children : busy ? busyContent(label.children) : label.children}
		</Comp>
	);
});

export { Button, buttonVariants };
