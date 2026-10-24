import { File } from 'lucide-react';
import { useT } from '../../../../ui/react/hooks';
import { t as translate } from '../../../../shared/i18n';
import { Field, SearchChoice } from '../parts';
import type { ActionFormProps, ActionView } from './types';

function Content({ action, update, host, showErrors, onTouch }: ActionFormProps<'open-file'>) {
	const t = useT();
	return (
		<Field
			label={t('automation.open-file')}
			error={showErrors && !action.path.trim() ? t('automation.choiceRequired') : undefined}
		>
			{(id) => (
				<SearchChoice
					id={id}
					label={t('automation.open-file')}
					value={action.path}
					options={host
						.paths()
						.filter((item) => item.kind === 'file')
						.map((item) => ({ value: item.path, label: item.path }))}
					onChange={(path) => {
						onTouch();
						update((a) => {
							a.path = path;
						});
					}}
				/>
			)}
		</Field>
	);
}

export const openFileView: ActionView<'open-file'> = {
	kind: 'open-file',
	Icon: File,
	Content,
	facts: (action) => [{ label: translate('automation.open-file'), value: action.path }],
};
