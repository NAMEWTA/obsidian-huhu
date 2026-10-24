import { DASHBOARDS_ROOT, DEFAULT_DASHBOARD_FILE } from './vault-layout';
import { validateHuhuPath } from './huhu-paths';

/** A board reference is rooted in dashboards and has no `.md` extension. No legacy root/name inference. */
export function dashboardPath(input = ''): string {
	if (!input) return DEFAULT_DASHBOARD_FILE;
	const path = validateHuhuPath(input);
	if (!path.startsWith(DASHBOARDS_ROOT + '/') || (/\.MD$/i.test(path) && !path.endsWith('.md')))
		throw new Error('huhu-content.invalid-path', { cause: input });
	const reference = path.endsWith('.md') ? path.slice(0, -3) : path;
	if (/\.md$/i.test(reference)) throw new Error('huhu-content.invalid-path', { cause: input });
	return validateHuhuPath(reference);
}
export function dashboardFilePath(reference = ''): string {
	return dashboardPath(reference) + '.md';
}
