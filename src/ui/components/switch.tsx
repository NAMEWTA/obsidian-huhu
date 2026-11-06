// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/switch.tsx
import * as React from 'react';
import * as SwitchPrimitive from 'radix-ui/switch';

import { cn } from '../lib/utils';

const trackClassName =
	'relative inline-flex h-5 w-[34px] shrink-0 items-center justify-start rounded-full border border-transparent p-[2px] transition-[transform,opacity] data-[state=checked]:bg-[var(--hu-accent)] data-[state=unchecked]:bg-[var(--hu-control-line)]';
const thumbClassName =
	'pointer-events-none block size-3.5 translate-x-0 rounded-full bg-[var(--hu-raised)] shadow-[var(--hu-shadow-card)] transition-transform data-[state=checked]:translate-x-[14px]';
const compactTrackClassName = 'h-3.5 w-6 border-0 p-0.5';
const compactThumbClassName = 'size-2.5 data-[state=checked]:translate-x-2.5';

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
	thumbClassName?: string;
	busy?: boolean;
};

function Switch({
	className,
	thumbClassName: thumbClasses,
	ref,
	busy = false,
	disabled,
	onClick,
	...props
}: SwitchProps) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			ref={ref}
			data-hit-control
			className={cn(
				trackClassName,
				'cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)] disabled:cursor-not-allowed disabled:opacity-50',
				className,
			)}
			{...props}
			aria-busy={busy || props['aria-busy']}
			disabled={disabled || busy}
			onClick={(event) => {
				event.stopPropagation();
				onClick?.(event);
			}}
		>
			<SwitchPrimitive.Thumb data-slot="switch-thumb" className={cn(thumbClassName, thumbClasses)} />
		</SwitchPrimitive.Root>
	);
}

type SwitchIndicatorProps = Omit<React.ComponentProps<'span'>, 'children'> & {
	checked: boolean;
	size?: 'default' | 'compact';
	thumbClassName?: string;
};

function SwitchIndicator({
	checked,
	className,
	size = 'default',
	thumbClassName: thumbClasses,
	...props
}: SwitchIndicatorProps) {
	const state = checked ? 'checked' : 'unchecked';
	return (
		<span
			aria-hidden="true"
			data-slot="switch-indicator"
			data-state={state}
			className={cn(trackClassName, size === 'compact' && compactTrackClassName, className)}
			{...props}
		>
			<span
				data-slot="switch-thumb"
				data-state={state}
				className={cn(thumbClassName, size === 'compact' && compactThumbClassName, thumbClasses)}
			/>
		</span>
	);
}

export { Switch, SwitchIndicator };
