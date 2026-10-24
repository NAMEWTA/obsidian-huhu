// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/automations/AutomationEditorSettingsSidebar.tsx, AutomationExtraAgentArgsField.tsx, AutomationMissedRunGraceField.tsx
import { Checkbox } from '../../../../ui/components/checkbox';
import { Label } from '../../../../ui/components/label';
import { useT } from '../../../../ui/react/hooks';
import { availableAgents } from '../../core/actions/agent';
import { actionDefinition, actionDefinitions, switchAutomationAction } from '../../core/actions/registry';
import type { ActionKind } from '../../core/actions/definition';
import { actionView } from '../actions/registry';
import { ActionOptions } from '../actions/ActionForm';
import type { AutomationViewHost } from '../panel-contract';
import { Choice, Field, Section } from '../parts';
import { SchedulePicker, type DraftProps } from './SchedulePicker';
import { PrecheckField } from './PrecheckField';
export function SettingsSidebar({ draft, onChange, host }: DraftProps & { host: AutomationViewHost }) {
	const t = useT(),
		action = draft.action;
	const agents = availableAgents(host.service.agent()?.listAgents() ?? []);
	// A definition kept inside another product's document (a board task, an archive) can only be a reminder.
	const choices = actionDefinitions.filter((definition) => !draft.source || definition.sourceBound);
	const definition = actionDefinition(action.kind);
	return (
		<aside className="flex min-w-0 flex-col gap-5 self-start rounded-lg border border-border/60 bg-muted/20 p-4">
			<Section title={t('automation.sectionRun')}>
				<Field label={t('automation.action')}>
					{(id) => (
						<Choice
							id={id}
							label={t('automation.action')}
							value={action.kind}
							disabled={choices.length < 2}
							options={choices.map((item) => {
								const { Icon } = actionView(item.kind);
								return { value: item.kind, label: t(item.nameKey), icon: <Icon className="size-4" /> };
							})}
							onChange={(value) =>
								onChange((d) => {
									d.action = switchAutomationAction(d.action, value as ActionKind, {
										agentId: agents[0]?.id ?? '',
										cwd: host.cwd ?? '',
									});
									if (!actionDefinition(value)?.scheduled) d.schedule = { kind: 'manual' };
								})
							}
						/>
					)}
				</Field>
				<ActionOptions draft={draft} onChange={onChange} host={host} />
			</Section>
			<Section title={t('automation.sectionTiming')} className="border-t border-border/50 pt-5">
				<div className="flex flex-col gap-4">
					{draft.source?.kind === 'widget' ? (
						<p className="text-xs leading-4 text-muted-foreground">{t('automation.widgetSchedule')}</p>
					) : definition?.scheduled ? (
						<SchedulePicker draft={draft} onChange={onChange} />
					) : (
						<p className="text-xs leading-4 text-muted-foreground">{t('automation.manualOnly')}</p>
					)}
				</div>
				{draft.schedule.kind !== 'manual' && (
				<Field label={t('automation.grace')}>
					{(id) => (
						<Choice
							id={id}
							label={t('automation.grace')}
							value={String(draft.graceMinutes)}
							options={[...new Set([0, 15, 60, 720, 1440, draft.graceMinutes])].map((value) => ({
								value: String(value),
								label:
									value === 0
										? t('automation.noGrace')
										: value < 60
											? t('automation.minutes', { count: value })
											: t('automation.hours', { count: value / 60 }),
							}))}
							onChange={(value) =>
								onChange((d) => {
									d.graceMinutes = Number(value);
								})
							}
						/>
					)}
				</Field>
				)}
				{(actionView(action.kind).precheck || draft.precheck) && <PrecheckField draft={draft} onChange={onChange} />}
			</Section>
			<Section title={t('automation.sectionNotify')} className="border-t border-border/50 pt-5">
				<Field label={t('automation.notifyOn')}>
					{(id) => (
						<Choice
							id={id}
							label={t('automation.notifyOn')}
							value={draft.notifyOn}
							options={['always', 'failure', 'never'].map((value) => ({
								value,
								label: t(`automation.${value}`),
							}))}
							onChange={(value) =>
								onChange((d) => {
									d.notifyOn = value as typeof d.notifyOn;
								})
							}
						/>
					)}
				</Field>
				<Field label={t('automation.channels')}>
					{(id) => (
						<div className="flex flex-wrap items-center gap-4">
							{(['in-app', 'system'] as const).map((channel) => (
								<div key={channel} className="flex items-center gap-2">
									<Checkbox
										id={`${id}-${channel}`}
										checked={draft.channels.includes(channel)}
										onCheckedChange={(checked) =>
											onChange((d) => {
												d.channels = checked
													? [...new Set([...d.channels, channel])]
													: d.channels.filter((item) => item !== channel);
											})
										}
									/>
									<Label htmlFor={`${id}-${channel}`}>{t(`automation.${channel}`)}</Label>
								</div>
							))}
						</div>
					)}
				</Field>
			</Section>
		</aside>
	);
}
