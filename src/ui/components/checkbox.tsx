// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/checkbox.tsx
'use client';

import * as React from 'react';
import { CheckIcon, MinusIcon } from 'lucide-react';
import * as CheckboxPrimitive from 'radix-ui/checkbox';

import { cn } from '../lib/utils';

function Checkbox({
	className,
	checked,
	ref,
	busy = false,
	disabled,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { busy?: boolean }) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			ref={ref}
			data-hit-control
			checked={checked}
			disabled={disabled || busy}
			className={cn(
				'peer size-[18px] shrink-0 rounded-[4px] border border-[var(--hu-control-line)] bg-[var(--hu-raised)] outline-none transition-[transform,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hu-accent)] disabled:cursor-not-allowed disabled:opacity-50 aria-busy:border-dashed data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
				className,
			)}
			{...props}
			aria-busy={busy || props['aria-busy']}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="flex items-center justify-center text-current"
			>
				<MinusIcon aria-hidden="true" className="size-3.5 [[data-state=checked]>&]:hidden" />
				<CheckIcon aria-hidden="true" className="size-3.5 [[data-state=indeterminate]>&]:hidden" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
