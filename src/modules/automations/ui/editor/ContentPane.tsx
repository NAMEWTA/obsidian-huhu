// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/automations/AutomationEditorPromptSection.tsx
import { useT } from '../../../../ui/react/hooks';
import type { AutomationViewHost } from '../panel-contract';
import { ActionContent } from '../actions/ActionForm';
import { Section } from '../parts';
import type { DraftProps } from './SchedulePicker';
/** The content of the draft's action; the form is the one its action brings (`ui/actions`). */
export function ContentPane({
	draft,
	onChange,
	host,
	showErrors,
	onTouch,
}: DraftProps & { host: AutomationViewHost; showErrors: boolean; onTouch: () => void }) {
	const t = useT();
	return (
		<Section title={t('automation.content')}>
			<ActionContent draft={draft} onChange={onChange} host={host} showErrors={showErrors} onTouch={onTouch} />
		</Section>
	);
}
