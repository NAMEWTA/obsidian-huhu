import path from 'node:path';
/** Never inherit another application's repository, worktree or index selection. */
export function gitEnvironment(extra?: Readonly<Record<string, string>>, cwd?: string): NodeJS.ProcessEnv {
	const env = { ...process.env, ...extra };
	for (const key of [
		'GIT_DIR',
		'GIT_WORK_TREE',
		'GIT_COMMON_DIR',
		'GIT_INDEX_FILE',
		'GIT_OBJECT_DIRECTORY',
		'GIT_ALTERNATE_OBJECT_DIRECTORIES',
		'GIT_PREFIX',
		'GIT_INTERNAL_SUPER_PREFIX',
		'GIT_NAMESPACE',
	])
		delete env[key];
	for (const key of Object.keys(env))
		if (
			/^GIT_CONFIG_(?:COUNT|KEY_|VALUE_|PARAMETERS)/.test(key) ||
			[
				'GIT_CEILING_DIRECTORIES',
				'GIT_DISCOVERY_ACROSS_FILESYSTEM',
				'GIT_SHALLOW_FILE',
				'GIT_REPLACE_REF_BASE',
			].includes(key)
		)
			delete env[key];
	return {
		...env,
  ...(cwd ? { GIT_CEILING_DIRECTORIES: path.dirname(cwd) } : {}),
		GIT_TERMINAL_PROMPT: '0',
		GCM_INTERACTIVE: 'never',
		LC_ALL: 'C',
		LANGUAGE: 'C',
		GIT_PAGER: 'cat',
		PAGER: 'cat',
		GIT_EDITOR: 'true',
	};
}
