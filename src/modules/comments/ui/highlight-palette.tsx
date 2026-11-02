import type { HighlightColorId } from '../core/model';
import { colorOptions } from '../core/highlight-colors';
import type { CommentsSettings } from '../settings';
import { useT } from '../../../ui/react/hooks';

export function HighlightPalette({ settings, selected, onSelect, disabled = false }: {
	settings: CommentsSettings;
	selected?: HighlightColorId;
	onSelect: (color: HighlightColorId, hex?: string) => void;
	disabled?: boolean;
}) {
	const t = useT();
	return <div role="group" aria-label={t('editor.highlights.colors')} className="flex flex-wrap items-center gap-1">
		{colorOptions(settings).map(color => {
			const title = color.id.startsWith('custom-') ? color.name : t(`editor.highlights.color.${color.id}`);
			return <button key={color.id} type="button" title={title} aria-label={title} aria-pressed={selected === color.id}
				disabled={disabled} onMouseDown={event => event.preventDefault()}
				onClick={event => { event.preventDefault(); onSelect(color.id, color.id.startsWith('custom-') ? color.hex : undefined); }}
				style={{ backgroundColor: color.hex }}
				className="h-8 w-8 rounded-full border-2 border-background shadow-xs outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring aria-pressed:ring-2 aria-pressed:ring-ring disabled:opacity-50" />;
		})}
	</div>;
}
