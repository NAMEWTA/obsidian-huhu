/**
 * One button of the Shortcuts widget: open a note, run a command, run a saved automation, start an agent with a prompt
 * or run one of the agent module's saved terminal quick commands (`quick`, by id).
 */
export type ShortcutType = 'file' | 'command' | 'automation' | 'agent' | 'quick';
export const SHORTCUT_TYPES: readonly ShortcutType[] = ['file', 'command', 'automation', 'quick', 'agent'];

export interface ShortcutButton {
	id: string;
	label: string;
	/** Lucide icon name. */
	icon: string;
	type: ShortcutType;
	/** Note path, command id, automation action id or quick command id; unused for `agent`. */
	target: string;
	/** `agent` only: the agent to start and the prompt it receives. */
	agentId?: string;
	prompt?: string;
	/**
	 * `agent` only: the Space the agent starts in. Absent means the Space chooser opens when the button is pressed;
	 * it is never taken from the visible page or from a lone Space. A stale id is reported, not replaced.
	 */
	spaceId?: string;
}

export const isStr = (value: unknown): value is string => typeof value === 'string';
export const text = (value: unknown) => (isStr(value) ? value : '');

/** A stored Space id, or nothing: an old or malformed entry stays unbound and is never given a guess. */
export const spaceField = (value: unknown) => (value && isStr(value) ? { spaceId: value } : {});

/** Keep well-formed buttons in order; entries with a missing id, an unknown type or a repeated id are dropped. */
export function readShortcutButtons(value: unknown): ShortcutButton[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>(),
		result: ShortcutButton[] = [];
	for (const item of value) {
		if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
		const row = item as Record<string, unknown>,
			id = text(row.id).trim(),
			type = SHORTCUT_TYPES.find((candidate) => candidate === row.type);
		if (!id || !type || seen.has(id)) continue;
		seen.add(id);
		result.push({
			id,
			label: text(row.label),
			icon: text(row.icon) || 'zap',
			type,
			target: text(row.target),
			...(type === 'agent'
				? { agentId: text(row.agentId), prompt: text(row.prompt), ...spaceField(row.spaceId) }
				: {}),
		});
	}
	return result;
}

/** Whether a button has what it needs to run. */
export function shortcutRunnable(button: ShortcutButton): boolean {
	return button.type === 'agent' ? !!button.agentId?.trim() && !!button.prompt?.trim() : !!button.target.trim();
}

/** An Obsidian hotkey as the key names `ShortcutKeyCombo` renders. */
export function hotkeyKeys(hotkey: { modifiers: readonly string[]; key: string }): string[] {
	const order = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'],
		modifiers = order.filter((name) => hotkey.modifiers.includes(name));
	return [...modifiers, hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key];
}
