// Pi editor argument gate: kept dependency-free and static so activation stays small;
// native-extensions embeds this exact function text into the Pi extension.
export function piEditorArgumentGate(
	args: readonly string[],
	extension: string,
	cwd: string,
	paths: Pick<typeof import('node:path'), 'isAbsolute' | 'resolve'>,
): boolean {
	if (!Array.isArray(args) || args.length > 256 || !paths.isAbsolute(extension) || !paths.isAbsolute(cwd))
		return false;
	const values = new Set([
		'--provider',
		'--model',
		'--api-key',
		'--system-prompt',
		'--append-system-prompt',
		'--name',
		'-n',
		'--session',
		'--session-id',
		'--session-dir',
		'--models',
		'--tools',
		'-t',
		'--exclude-tools',
		'-xt',
		'--thinking',
		'--skill',
		'--prompt-template',
		'--theme',
		'--use-theme',
		'--tui-mode',
	]);
	const switches = new Set([
		'--continue',
		'-c',
		'--resume',
		'-r',
		'--no-session',
		'--no-tools',
		'-nt',
		'--no-builtin-tools',
		'-nbt',
		'--no-mcp',
		'--no-skills',
		'-ns',
		'--no-prompt-templates',
		'-np',
		'--no-themes',
		'--no-context-files',
		'-nc',
		'--verbose',
		'--approve',
		'-a',
		'--no-approve',
		'-na',
		'--offline',
	]);
	let disabled = false,
		extensions = 0,
		bytes = 0;
	const read = (index: number): string | undefined => {
		const descriptor = Object.getOwnPropertyDescriptor(args, String(index));
		if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'string') return;
		const value = descriptor.value;
		if (
			value.includes('\0') ||
			value.length > 4096 ||
			Buffer.byteLength(value) > 4096 ||
			(bytes += Buffer.byteLength(value)) > 65536
		)
			return;
		return value;
	};
	for (let i = 0; i < args.length; i++) {
		const arg = read(i);
		if (!arg) return false;
		if (arg === '--') return disabled && extensions === 1 && i === args.length - 1;
		if (arg === '-ne' || arg === '--no-extensions') disabled = true;
		else if (arg === '-e' || arg === '--extension') {
			const value = read(++i);
			if (
				!value ||
				++extensions !== 1 ||
				value.startsWith('~') ||
				// No URL/package specifier (npm:, git:, https:). The only colon allowed is the drive of
				// a Windows absolute path, and only where this platform itself treats it as absolute.
				(value.includes(':') &&
					!(/^[A-Za-z]:[\\/]/.test(value) && !value.includes(':', 2) && paths.isAbsolute(value))) ||
				paths.resolve(cwd, value) !== extension
			)
				return false;
		} else if (values.has(arg)) {
			// The audited parser consumes a value even when it looks like another flag.
			const value = read(++i);
			if (
				value === undefined ||
				(arg === '--tui-mode' && value !== 'regular') ||
				(arg === '--use-theme' && value.startsWith('-')) ||
				(arg === '--thinking' && !['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(value))
			)
				return false;
		} else if (!switches.has(arg)) return false;
	}
	return disabled && extensions === 1;
}
