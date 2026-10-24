import { Bell } from 'lucide-react';
import { useT } from '../../../../ui/react/hooks';
import { TextContent } from './text-form';
import type { ActionFormProps, ActionView } from './types';

function Content({ action, draft, update, showErrors, onTouch }: ActionFormProps<'notify'>) {
	const t = useT();
	return (
		<TextContent
			label={t('automation.notifyText')}
			value={action.body}
			error={showErrors && !action.body.trim() ? t('automation.contentRequired') : undefined}
			// A reminder that lives in a widget follows the widget's text.
			disabled={draft.source?.kind === 'widget'}
			className="min-h-28"
			onChange={(body) => {
				onTouch();
				update((a) => {
					a.body = body;
				});
			}}
			onTouch={onTouch}
		/>
	);
}

export const notifyView: ActionView<'notify'> = { kind: 'notify', Icon: Bell, Content };
