// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/automations/AutomationEditorPromptSection.tsx, AutomationEditorSettingsSidebar.tsx, AutomationExtraAgentArgsField.tsx
import { Bot } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { AgentIcon } from '../../../../ui/components/huhu/AgentIcon';
import { useT } from '../../../../ui/react/hooks';
import { validatedExtraArgs } from '../../../../shared/automation/extra-args';
import { t as translate } from '../../../../shared/i18n';
import { availableAgents } from '../../core/actions/agent';
import { Field, SearchChoice } from '../parts';
import { SessionField } from '../editor/SessionField';
import { WorkingDirectory } from './working-directory';
import { TextContent } from './text-form';
import type { ActionFormProps, ActionView } from './types';

function Content({ action, update, host, showErrors, onTouch }: ActionFormProps<'agent'>) {
	const t = useT();
	const missing = showErrors && !action.prompt.trim() ? t('automation.contentRequired') : undefined;
	const setPrompt = (prompt: string) => {
		onTouch();
		update((a) => {
			a.prompt = prompt;
		});
	};
	return (
		<>
			<TextContent
				label={t('automation.prompt')}
				value={action.prompt}
				error={missing}
				mono
				onChange={setPrompt}
				onTouch={onTouch}
			/>
			<div className="flex flex-col gap-3">
				<p className="text-xs font-medium text-foreground">{t('automation.variables')}</p>
				<div className="flex flex-wrap gap-2">
					{['date', 'time', 'vault', 'folder'].map((variable) => (
						<Button
							key={variable}
							variant="outline"
							size="xs"
							className="font-mono"
							onClick={() => setPrompt(action.prompt + `{{${variable}}}`)}
						>{`{{${variable}}}`}</Button>
					))}
				</div>
				<SearchChoice
					label={t('automation.insertNote')}
					value=""
					options={host
						.paths()
						.filter((item) => item.kind === 'file')
						.map((item) => ({ value: item.path, label: item.path }))}
					onChange={(path) =>
						setPrompt(
							`${action.prompt}\n[[${path.replace(/\.md$/, '')}]] ${host.cwd ? `${host.cwd}/` : ''}${path}`,
						)
					}
				/>
			</div>
		</>
	);
}

function Options(props: ActionFormProps<'agent'>) {
	const t = useT(),
		{ action, update, host, draft, onChange } = props;
	const agents = availableAgents(host.service.agent()?.listAgents() ?? []);
	let extraError = '';
	try {
		validatedExtraArgs(action.agentId, action.extraArgs ?? '');
	} catch (error) {
		extraError = error instanceof Error ? error.message : String(error);
	}
	return (
		<>
			<Field label={t('automation.agent')} help={agents.length ? undefined : t('automation.noAvailableAgents')}>
				{(id) => (
					<SearchChoice
						id={id}
						label={t('automation.agent')}
						value={action.agentId}
						options={agents.map((agent) => ({
							value: agent.id,
							label: agent.title,
							icon: <AgentIcon agent={agent.id} />,
						}))}
						onChange={(value) =>
							update((a) => {
								a.agentId = value;
								a.session = undefined;
							})
						}
					/>
				)}
			</Field>
			<Field label={t('automation.extraArgs')} help={t('automation.extraArgsHelp')} error={extraError}>
				{(id) => (
					<Input
						id={id}
						className="font-mono text-xs"
						value={action.extraArgs ?? ''}
						aria-invalid={!!extraError}
						aria-describedby={extraError ? `${id}-error` : undefined}
						disabled={action.sessionMode === 'reuse'}
						placeholder={t('automation.extraArgsPlaceholder')}
						onChange={(e) =>
							update((a) => {
								a.extraArgs = e.target.value;
							})
						}
					/>
				)}
			</Field>
			<WorkingDirectory
				cwd={action.cwd}
				host={host}
				onChange={(cwd) =>
					update((a) => {
						a.cwd = cwd;
						a.session = undefined;
					})
				}
			/>
			<SessionField draft={draft} onChange={onChange} service={host.service} />
		</>
	);
}

export const agentView: ActionView<'agent'> = {
	kind: 'agent',
	Icon: Bot,
	precheck: true,
	Content,
	Options,
	facts: (action) => [
		{ label: translate('automation.agent'), value: `${action.agentId}${action.extraArgs ? ` ${action.extraArgs}` : ''}` },
		{ label: translate('automation.cwd'), value: action.cwd },
		{ label: translate('automation.sessionMode'), value: translate(`automation.${action.sessionMode}`) },
	],
	hint: (action) => action.cwd,
	badge: (action) => ({ icon: <AgentIcon agent={action.agentId} />, label: action.agentId }),
};
