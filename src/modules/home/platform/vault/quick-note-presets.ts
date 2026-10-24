import { nowMoment, type MomentLike } from '../../../../host/obsidian/datetime';
import { huhuName } from '../../../../shared/storage/vault-layout';
import { substituteTemplateVars } from '../calendar/daily-notes';

/** The file name format a quick-note button uses when none is typed. */
export const DEFAULT_QUICK_NOTE_FORMAT = 'YYYY-MM-DD-HHmm';

/**
 * The file name (without extension) for a new quick note: the button's format with the date and time of `now`
 * filled in, e.g. `YYYY-MM-DD HHmm` -> `2026-10-19 1405`. `{{date:…}}` / `{{time:…}}` written the template way work too.
 */
export function presetNoteName(format: string | undefined, now: MomentLike = nowMoment()): string {
	const pattern = format?.trim() || DEFAULT_QUICK_NOTE_FORMAT;
	const name = pattern.includes('{{') ? substituteTemplateVars(pattern, { now }) : now.format(pattern);
	return huhuName(name, '') || now.format(DEFAULT_QUICK_NOTE_FORMAT);
}
