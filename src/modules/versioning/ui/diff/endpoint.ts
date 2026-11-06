import type { FileContents } from '@pierre/diffs';
import policy from './language-policy.json';

export const languageForFilename = (name: string): import('@pierre/diffs').SupportedLanguages =>
	(policy.extensions as Record<string, import('@pierre/diffs').SupportedLanguages>)[
		name.split('.').at(-1)?.toLowerCase() ?? ''
	] ?? 'text';
import type { ResolvedEndpoint } from '../../core/history';
import { displayText } from './preferences';

/** Missing and empty are deliberately distinct; cache identity covers body, path, language and immutable source. */
export function endpointFile(endpoint: ResolvedEndpoint): FileContents | null {
	if (endpoint.status === 'missing') return null;
	if (endpoint.status !== 'text') throw new Error(`Unavailable endpoint: ${endpoint.status}`);
	const lang = languageForFilename(endpoint.path);
	return {
		name: endpoint.path,
		contents: displayText(endpoint.snapshot.text),
		lang,
		cacheKey: JSON.stringify([endpoint.repositoryId, endpoint.id, endpoint.path, lang, endpoint.snapshot.hash]),
	};
}
