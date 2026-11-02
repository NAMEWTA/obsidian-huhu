import { Terminal } from 'lucide-react';
import { useT } from '../../../../ui/react/hooks';
import { t as translate } from '../../../../shared/i18n';
import { Choice, Field } from '../parts';
import { WorkingDirectory } from './working-directory';
import { SpaceField, assertSpaceAvailable, spaceFact } from './agent';
import { TextContent } from './text-form';
import type { ActionFormProps, ActionView } from './types';

function Content({ action, update, showErrors, onTouch }: ActionFormProps<'script'>) {
	const t = useT();
	return (
		<TextContent
			label={t('automation.script')}
			value={action.script}
			error={showErrors && !action.script.trim() ? t('automation.contentRequired') : undefined}
			mono
			tabIndents
			onChange={(script) => {
				onTouch();
				update((a) => {
					a.script = script;
				});
			}}
			onTouch={onTouch}
		/>
	);
}

function Options({ action, update, host, showErrors }: ActionFormProps<'script'>) {
	const t = useT();
	return (
		<>
			<SpaceField
				spaceId={action.spaceId}
				host={host}
				showErrors={showErrors}
				onChange={(spaceId) =>
					update((a) => {
						a.spaceId = spaceId;
					})
				}
			/>
			<WorkingDirectory
				cwd={action.cwd}
				host={host}
				onChange={(cwd) =>
					update((a) => {
						a.cwd = cwd;
					})
				}
			/>
			<Field label={t('automation.shell')}>
				{(id) => (
					<Choice
						id={id}
						label={t('automation.shell')}
						value={action.shell}
						options={[
							{ value: 'bash', label: 'Bash' },
							{ value: 'powershell', label: 'PowerShell' },
						]}
						onChange={(value) =>
							update((a) => {
								a.shell = value as 'bash' | 'powershell';
							})
						}
					/>
				)}
			</Field>
		</>
	);
}

export const scriptView: ActionView<'script'> = {
	kind: 'script',
	Icon: Terminal,
	precheck: true,
	Content,
	Options,
	beforeSave: (action, host) => assertSpaceAvailable(action.spaceId, host),
	facts: (action) => [
		{
			label: translate('automation.space'),
			value: spaceFact(action.spaceId),
		},
		{ label: translate('automation.cwd'), value: action.cwd },
		{ label: translate('automation.shell'), value: action.shell === 'bash' ? 'Bash' : 'PowerShell' },
	],
	hint: (action) => action.cwd,
};
