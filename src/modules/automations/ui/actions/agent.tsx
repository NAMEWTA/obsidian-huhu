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
import type { AutomationViewHost } from '../panel-contract';
import { SessionField } from '../editor/SessionField';
import { WorkingDirectory } from './working-directory';
import { TextContent } from './text-form';
import type { ActionFormProps, ActionView } from './types';

type SpaceList = () => ReadonlyArray<{ id: string; name: string }> | undefined;
let spaceLookup: SpaceList = () => undefined;
/**
 * The detail rows (`facts`) are plain functions without the host, so the page that owns the host hands them the
 * Space list here. Assigning the same lookup again is harmless.
 */
export function bindSpaceLookup(lookup: SpaceList): void {
	spaceLookup = lookup;
}
/** "Space: Name" for a bound action, the unset hint for an old one, and "unavailable" for a gone Space. */
export function spaceFact(spaceId?: string): string {
	if (!spaceId) return translate('automation.spaceRequired');
	const list = spaceLookup();
	// Without the agent module the list is unknown, which is not the same as the Space being gone.
	if (!list) return translate('automation.spaceTarget', { name: spaceId });
	const found = list.find((space) => space.id === spaceId);
	return found
		? translate('automation.spaceTarget', { name: found.name })
		: translate('automation.spaceUnavailableOption');
}

/** Spaces the agent module lists right now; empty while it is off or has none. */
export const activeSpaces = (host: AutomationViewHost) => host.service.agent()?.listSpaces?.() ?? [];

/**
 * The Space a terminal action belongs to. The choice is explicit and saved with the definition; an old definition
 * shows as unset and a deleted or archived Space as unavailable. Nothing here picks a Space for the user.
 */
export function SpaceField({
	spaceId,
	host,
	showErrors,
	onChange,
}: {
	spaceId?: string;
	host: AutomationViewHost;
	showErrors: boolean;
	onChange: (spaceId: string) => void;
}) {
	const t = useT();
	const spaces = activeSpaces(host);
	const known = spaces.some((space) => space.id === spaceId);
	const options = spaces.map((space) => ({ value: space.id, label: `${space.name} · ${space.directoryLabel}` }));
	if (spaceId && !known && host.service.agent()?.listSpaces)
		options.unshift({ value: spaceId, label: t('automation.spaceUnavailableOption') });
	const error = !spaceId
		? showErrors
			? t('automation.spaceRequired')
			: undefined
		: !known && host.service.agent()?.listSpaces
			? t('automation.spaceUnavailable')
			: undefined;
	return (
		<Field
			label={t('automation.space')}
			help={spaces.length ? t('automation.spaceHelp') : t('automation.noSpaces')}
			error={error}
		>
			{(id) => (
				<SearchChoice
					id={id}
					label={t('automation.space')}
					value={spaceId ?? ''}
					options={options}
					disabled={!spaces.length && !spaceId}
					onChange={onChange}
				/>
			)}
		</Field>
	);
}

/** Save only against a Space that is active now; the stored id may have been archived since it was chosen. */
export async function assertSpaceAvailable(spaceId: string | undefined, host: AutomationViewHost): Promise<void> {
	if (!spaceId) throw new Error(translate('automation.spaceRequired'));
	const spaces = host.service.agent()?.listSpaces?.();
	if (spaces && !spaces.some((space) => space.id === spaceId))
		throw new Error(translate('automation.spaceUnavailable'));
}

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
		{ action, update, host, draft, onChange, showErrors } = props;
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
		{
			label: translate('automation.agent'),
			value: `${action.agentId}${action.extraArgs ? ` ${action.extraArgs}` : ''}`,
		},
		{
			label: translate('automation.space'),
			value: spaceFact(action.spaceId),
		},
		{ label: translate('automation.cwd'), value: action.cwd },
		{ label: translate('automation.sessionMode'), value: translate(`automation.${action.sessionMode}`) },
	],
	hint: (action) => action.cwd,
	beforeSave: (action, host) => assertSpaceAvailable(action.spaceId, host),
	badge: (action) => ({ icon: <AgentIcon agent={action.agentId} />, label: action.agentId }),
};
