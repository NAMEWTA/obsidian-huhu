import type { AutomationDefinition } from '../../../../shared/automation/types';
import type { AutomationViewHost } from '../panel-contract';
import { actionView } from './registry';
import type { ActionFormProps } from './types';

interface Props {
	draft: AutomationDefinition;
	onChange: (change: (draft: AutomationDefinition) => void) => void;
	host: AutomationViewHost;
}

/** The props every form of the draft's action gets; `update` only touches the action while it is still of this kind. */
function formProps(props: Props & { showErrors: boolean; onTouch: () => void }): ActionFormProps<AutomationDefinition['action']['kind']> {
	const { draft, onChange } = props;
	const kind = draft.action.kind;
	return {
		...props,
		action: draft.action,
		update: (change) =>
			onChange((next) => {
				if (next.action.kind === kind) change(next.action);
			}),
	};
}

/** The main form of the draft's action (what it does). */
export function ActionContent(props: Props & { showErrors: boolean; onTouch: () => void }) {
	const { Content } = actionView(props.draft.action.kind);
	return <Content {...formProps(props)} />;
}

/** The execution options of the draft's action, or nothing for an action that has none. */
export function ActionOptions(props: Props) {
	const { Options } = actionView(props.draft.action.kind);
	return Options ? <Options {...formProps({ ...props, showErrors: false, onTouch: () => undefined })} /> : null;
}
