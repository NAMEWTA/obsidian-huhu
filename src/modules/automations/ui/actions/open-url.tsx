import { Globe } from 'lucide-react';
import { Input } from '../../../../ui/components/input';
import { useT } from '../../../../ui/react/hooks';
import { t as translate } from '../../../../shared/i18n';
import { urlError } from '../../core/actions/open-url';
import { Field } from '../parts';
import type { ActionFormProps, ActionView } from './types';

function Content({ action, update, showErrors, onTouch }: ActionFormProps<'open-url'>) {
	const t = useT();
	const missing = showErrors ? urlError(action.url) : undefined;
	return (
		<Field label={t('automation.url')} help={t('automation.urlHelp')} error={missing}>
			{(id) => (
				<Input
					id={id}
					type="url"
					inputMode="url"
					autoComplete="off"
					spellCheck={false}
					data-content-editor
					aria-label={t('automation.url')}
					aria-invalid={!!missing}
					aria-describedby={missing ? `${id}-error` : undefined}
					placeholder={t('automation.urlPlaceholder')}
					value={action.url}
					onBlur={onTouch}
					onChange={(e) => {
						onTouch();
						update((a) => {
							a.url = e.target.value;
						});
					}}
				/>
			)}
		</Field>
	);
}

export const openUrlView: ActionView<'open-url'> = {
	kind: 'open-url',
	Icon: Globe,
	Content,
	facts: (action) => [{ label: translate('automation.url'), value: action.url }],
};
