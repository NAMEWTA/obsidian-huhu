import { Command } from 'lucide-react';
import { useT } from '../../../../ui/react/hooks';
import { t as translate } from '../../../../shared/i18n';
import { Field, SearchChoice } from '../parts';
import type { ActionFormProps, ActionView } from './types';

function Content({ action, update, host, showErrors, onTouch }: ActionFormProps<'obsidian-command'>) {
	const t = useT();
	return (
		<Field
			label={t('automation.obsidian-command')}
			error={showErrors && !action.command.trim() ? t('automation.choiceRequired') : undefined}
		>
			{(id) => (
				<SearchChoice
					id={id}
					label={t('automation.obsidian-command')}
					value={action.command}
					options={host.commands().map((command) => ({ value: command.id, label: command.name }))}
					onChange={(command) => {
						onTouch();
						update((a) => {
							a.command = command;
						});
					}}
				/>
			)}
		</Field>
	);
}

export const obsidianCommandView: ActionView<'obsidian-command'> = {
	kind: 'obsidian-command',
	Icon: Command,
	Content,
	facts: (action) => [{ label: translate('automation.obsidian-command'), value: action.command }],
};
