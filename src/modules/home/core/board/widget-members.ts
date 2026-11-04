import type { BoardWidgetMember } from './types/model';

/** Existing CSS/data refresh hooks retain their presentation keys; membership uses memberId. */
export function widgetPresentationKey(member: Pick<BoardWidgetMember, 'provider' | 'kind' | 'instanceId'>): string {
	if (member.provider !== 'home') return `${member.provider}:${member.kind}:${member.instanceId}`;
	if (member.kind === 'quick-actions') return 'quickActions';
	if (member.kind === 'year-progress') return 'yearProgress';
	// The default clock keeps the plain grid id; other clock instances need independent geometry.
	if (member.kind === 'clock' && member.instanceId !== 'default')
		return `${member.kind}-${member.instanceId}`;
	return ['album', 'anniversary', 'countdown'].includes(member.kind)
		? `${member.kind}-${member.instanceId}`
		: member.kind;
}
