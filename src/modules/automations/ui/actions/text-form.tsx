import { Textarea } from '../../../../ui/components/textarea';
import { cn } from '../../../../ui/lib/utils';
import { Field } from '../parts';

/** The text area most actions use for their content (a prompt, a script, a reminder message). */
export function TextContent({
	label,
	value,
	error,
	mono = false,
	disabled,
	className,
	onChange,
	onTouch,
	tabIndents,
}: {
	label: string;
	value: string;
	error?: string;
	mono?: boolean;
	disabled?: boolean;
	className?: string;
	onChange: (value: string) => void;
	onTouch: () => void;
	/** Insert two spaces for Tab instead of leaving the field (scripts). */
	tabIndents?: boolean;
}) {
	return (
		<Field label={label} error={error}>
			{(id) => (
				<Textarea
					id={id}
					data-content-editor
					disabled={disabled}
					value={value}
					aria-invalid={!!error}
					aria-describedby={error ? `${id}-error` : undefined}
					onBlur={onTouch}
					onChange={(e) => onChange(e.target.value)}
					className={cn('w-full min-w-0 resize-y bg-background text-sm', mono && 'font-mono', className ?? 'min-h-56')}
					onKeyDown={(event) => {
						if (tabIndents && event.key === 'Tab' && !event.shiftKey) {
							event.preventDefault();
							const input = event.currentTarget,
								start = input.selectionStart;
							onChange(input.value.slice(0, start) + '  ' + input.value.slice(input.selectionEnd));
							input.ownerDocument.defaultView?.requestAnimationFrame(() =>
								input.setSelectionRange(start + 2, start + 2),
							);
						}
					}}
				/>
			)}
		</Field>
	);
}
