export const HUHU_ROOT = '.huhu';

/** One portable namespace. Reject aliases that Windows or POSIX could resolve outside it. */
export function huhuPath(...parts: string[]): string {
	return validateHuhuPath([HUHU_ROOT, ...parts].join('/'));
}

export function validateHuhuPath(value: string): string {
	const path = value.replaceAll('\\', '/');
	const parts = path.split('/');
	if (parts[0] !== HUHU_ROOT || parts.some(part => !part || part === '.' || part === '..'
		|| [...part].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || /[<>:"|?*]/.test(part) || /[. ]$/.test(part)
		|| /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error('huhu-storage.invalid-path', { cause: value });
	return path;
}
