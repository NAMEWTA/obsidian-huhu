import type { BoardWidgetMember } from './types/model';
import { readWeatherLocation } from './weather-locations';

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Availability never affects persistence: unknown providers and removed instances retain their references. */
export function readBoardMembers(value: unknown): BoardWidgetMember[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const seen = new Set<string>();
	const members: BoardWidgetMember[] = [];
	for (const entry of value) {
		if (!record(entry)) continue;
		const memberId = text(entry.memberId), provider = text(entry.provider), kind = text(entry.kind), instanceId = text(entry.instanceId);
		if (!memberId || !provider || !kind || !instanceId || seen.has(memberId)) continue;
		seen.add(memberId);
		members.push({ memberId, provider, kind, instanceId, ...(text(entry.label) ? { label: text(entry.label) } : {}), ...(text(entry.icon) ? { icon: text(entry.icon) } : {}),
			...(provider === 'home' && kind === 'clock' && 'weather' in entry ? { weather: readWeatherLocation(entry.weather) } : {}),
		});
	}
	return members;
}
