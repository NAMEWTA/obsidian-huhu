// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/automations/automation-draft-model.ts
import type { AutomationDefinition, AgentDescription } from '../../../../shared/automation/types';
import type { AutomationEditRequest } from '../../core/api';
import type { AutomationTemplate } from '../../core/templates';
import { systemTimeZone, validateSchedule } from '../../core/schedule';
import { agentAction, availableAgents } from '../../core/actions/agent';
import { actionDefinition } from '../../core/actions/registry';
import { AutomationError } from '../../../../shared/automation/errors';
import { t } from '../../../../shared/i18n';

export function newDraft(
	request: AutomationEditRequest,
	deviceId: string,
	cwd: string,
	agents: readonly AgentDescription[],
	template?: AutomationTemplate,
): AutomationDefinition {
	if (request.existing) return structuredClone(request.existing);
	const prefill = request.prefill ?? {};
	const name = template ? t(`automation.template.${template.id}.name`) : (prefill.name ?? '');
	const text = template ? t(`automation.template.${template.id}.prompt`) : (prefill.text ?? prefill.name ?? '');
	// Reminders are the default of anything made from a document; everything else starts as an agent run.
	const kind = request.action ?? template?.kind ?? (request.source ? 'notify' : 'agent');
	const definition = actionDefinition(kind) ?? agentAction;
	const hour = Date.now() + 60 * 60 * 1000;
	return {
		id: crypto.randomUUID(),
		name,
		enabled: true,
		deviceId,
		revision: 1,
		schedule: !definition.scheduled
			? { kind: 'manual' }
			: template
				? { kind: 'recurring', expression: template.expression, timezone: systemTimeZone(), start: Date.now() }
				: prefill.at !== undefined
					? { kind: 'once', at: prefill.at }
					: request.source || definition.kind === 'notify'
						? { kind: 'once', at: hour }
						: { kind: 'manual' },
		action: definition.create({ agentId: availableAgents(agents)[0]?.id ?? '', cwd, text }),
		channels: ['in-app'],
		notifyOn: 'always',
		graceMinutes: 720,
		source: request.source,
		link: prefill.link,
		templateId: template?.id,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}
/** The text a draft shows inside its own fields; the footer does not repeat these. */
export function contentError(action: AutomationDefinition['action']): string | undefined {
	return actionDefinition(action.kind)?.contentError(action);
}
export function draftError(
	draft: AutomationDefinition,
	agents: readonly AgentDescription[],
	cwd: string,
	original?: AutomationDefinition,
): string | undefined {
	if (!draft.name.trim()) return t('automation.nameRequired');
	const definition = actionDefinition(draft.action.kind);
	if (!definition) return t('automation.invalid');
	const problem =
		definition.contentError(draft.action) ??
		definition.settingsError?.(draft.action, { cwd, agents, channels: draft.channels });
	if (problem) return problem;
	try {
		validateSchedule(draft.schedule);
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	if (
		draft.schedule.kind === 'once' &&
		draft.schedule.at <= Date.now() &&
		JSON.stringify(original?.schedule) !== JSON.stringify(draft.schedule)
	)
		return t('automation.pastTime');
	if (draft.graceMinutes < 0 || !Number.isFinite(draft.graceMinutes))
		return new AutomationError('graceInvalid').message;
	return undefined;
}
