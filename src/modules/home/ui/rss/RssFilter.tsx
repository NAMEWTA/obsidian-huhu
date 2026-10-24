// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/toolbar-dropdown.ts
import { Choice } from '../board/controls';
/** The article filter: all, unread, or one group / feed; a labelled select so the current choice is always readable. */
export function RssFilter({
	value,
	options,
	onChange,
	label,
}: {
	value: string;
	options: { value: string; label: string }[];
	onChange: (key: string) => void;
	label: string;
}) {
	return (
		<Choice
			label={label}
			className="w-48 min-w-0 data-[size=sm]:h-9"
			value={value}
			options={options}
			onChange={onChange}
		/>
	);
}
