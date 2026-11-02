export type HistoryTrigger = 'interval' | 'switch' | 'important';

export interface LocalHistoryEntry {
	readonly id: string;
	readonly documentId: string;
	readonly path: string;
	readonly hash: string;
	readonly byteLength: number;
	readonly createdAt: number;
	readonly trigger: HistoryTrigger;
}

/** Only visible Markdown is eligible; host configuration and hidden managed content stay outside history. */
export function isHistoryPath(path: string, configDir = ''): boolean {
	return /\.md$/i.test(path) && !/[\\:]/.test(path)
		&& ![...path].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
		&& !path.split('/').some(part => !part || part.startsWith('.'))
		&& !(configDir && (path === configDir || path.startsWith(configDir + '/')));
}
