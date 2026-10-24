import { COMPLETION_EMOJI_REGEX, COMPLETION_FIELD_REGEX } from './syntax';
/** Completion goes before reminder/identity suffixes, preserving the source protocols' ordering. */
export function withTaskCompletion(line: string, checked: boolean, now = new Date()): string {
	const clean = line.replace(COMPLETION_FIELD_REGEX, '').replace(COMPLETION_EMOJI_REGEX, '');
	if (!checked) return clean;
	const pad = (n: number) => String(n).padStart(2, '0');
	const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
	return clean.replace(/^(\s*- \[[xX]\])/, `$1 [completion:: ${stamp}]`);
}
