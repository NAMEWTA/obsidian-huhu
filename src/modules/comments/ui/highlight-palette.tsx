import { Button } from '../../../ui/components/button';
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
			return <Button variant="ghost" size="icon-sm" key={color.id} type="button" title={title} aria-label={title} aria-pressed={selected === color.id}
				disabled={disabled} onMouseDown={event => event.preventDefault()}
				onClick={event => { event.preventDefault(); onSelect(color.id, color.id.startsWith('custom-') ? color.hex : undefined); }}
				className="rounded-full aria-pressed:outline-2 aria-pressed:outline-[var(--hu-accent)] min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]"><span aria-hidden className="size-5 rounded-full border border-[var(--hu-control-line)]" style={{ backgroundColor: color.hex }} /></Button>;
		})}
	</div>;
}
