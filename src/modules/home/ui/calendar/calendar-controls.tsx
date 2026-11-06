import type { ComponentProps } from 'react';
import { Button } from '../../../../ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../ui/components/tooltip';
/** Calendar toolbar composition; all behavior and hit geometry remain in the canonical Button. */
export function IconButton({ label, ...props }: Omit<ComponentProps<typeof Button>, 'aria-label'> & { label: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button type="button" variant="ghost" size="icon-sm" aria-label={label} {...props} />
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
