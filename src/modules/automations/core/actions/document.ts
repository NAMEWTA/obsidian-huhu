import type { ActionDefaults, ActionDocument, ActionKind, ActionOf } from './definition';

/**
 * The usual way to store an action: every field except the text field becomes a frontmatter property, and the
 * text goes into the `prompt` or `script` section. `omit` names the text field (it is not repeated as a
 * property); `read` names the properties that are read back onto a fresh action.
 */
export function propertiesCodec<K extends ActionKind>(options: {
	section: 'prompt' | 'script';
	omit: readonly string[];
	read: readonly string[];
	create(defaults: ActionDefaults): ActionOf<K>;
	setText(action: ActionOf<K>, value: string): void;
}): ActionDocument<K> {
	return {
		section: options.section,
		encode: (action) => {
			const { kind: _kind, ...parameters } = action as Record<string, unknown>;
			for (const key of options.omit) delete parameters[key];
			return parameters;
		},
		decode: (properties, text) => {
			const action = options.create({
				agentId: typeof properties.agentId === 'string' ? properties.agentId : '',
				cwd: typeof properties.cwd === 'string' ? properties.cwd : '.',
				text: '',
			});
			for (const key of options.read) if (properties[key] !== undefined) Object.assign(action, { [key]: properties[key] });
			options.setText(action, text);
			return action;
		},
	};
}

/** The working directory must be an existing path inside the vault folder `root` (checked again at run time). */
export function insideVault(cwd: string, root: string): boolean {
	const base = root.replace(/\\/g, '/').replace(/\/$/, '');
	const target = cwd.replace(/\\/g, '/');
	return !!target && !target.split('/').includes('..') && (target === base || target.startsWith(base + '/'));
}
