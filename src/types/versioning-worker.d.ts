declare module 'virtual:versioning-diff-worker' {
	const source: string;
	export default source;
}
declare module 'virtual:versioning-parse-worker' {
	const source: string;
	export default source;
}
declare module 'virtual:diffs-languages' {
	export const languages: readonly string[];
	export function languageForFilename(name: string): import('@pierre/diffs').SupportedLanguages;
}
declare module 'virtual:diffs-owner-document' {
	export function ensureDiffsOwnerDocument(doc: Document): void;
}
