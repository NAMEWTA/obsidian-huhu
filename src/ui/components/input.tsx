// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.; shadcn/ui (MIT).
// Original: src/renderer/src/components/ui/input.tsx
import * as React from 'react';

import { cn } from '../lib/utils';
import { useImeTextFieldProps } from '../react/ime';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
	({ className, type, ...props }, ref) => {
		const imeProps = useImeTextFieldProps<HTMLInputElement>(props);
		return (
			<input
				ref={ref}
				type={type}
				data-slot="input"
				className={cn(
					'h-[var(--hu-ctl-h)] w-full min-w-0 appearance-none rounded-md border border-[var(--hu-control-line)] bg-[var(--hu-raised)] px-3 py-1 text-base transition-[transform,opacity] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
					'hover:border-[var(--hu-fg-2)] focus-visible:border-[var(--hu-accent)] focus-visible:ring-[3px] focus-visible:ring-[var(--hu-accent-soft)]',
					'aria-invalid:border-[var(--hu-danger)] aria-invalid:ring-[3px] aria-invalid:ring-[var(--hu-danger-soft)]',
					className,
				)}
				{...props}
				{...imeProps}
			/>
		);
	},
);

Input.displayName = 'Input';

export { Input };
