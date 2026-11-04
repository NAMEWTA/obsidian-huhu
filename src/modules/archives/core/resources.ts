import { ContactsError } from './files';

/** A single visible, portable path segment, including Windows device-name protection. */
export function safeArchiveName(input: string): string {
	let name = [...input.trim()]
		.map((char) => (char.charCodeAt(0) < 32 ? '-' : char))
		.join('')
		.replace(/[\\/:*?"<>|#^[\]]/g, '-')
		.replace(/\s+/g, '-')
		.replace(/^[. -]+|[. -]+$/g, '');
	if (!name) throw new ContactsError('invalidName');
	if (/^(con|prn|aux|nul|conin\$|conout\$|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i.test(name)) name = '_' + name;
	return [...name]
		.slice(0, 120)
		.join('')
		.replace(/[. ]+$/g, '');
}
export interface ArchiveResource {
	path: string;
	relativePath: string;
	name: string;
	extension: string;
	size: number;
	modified: number;
}
export interface ArchiveFolderEntry {
	path: string;
	folder: boolean;
	size: number;
	modified: number;
}
export interface ArchiveImport {
	name: string;
	read(): Promise<ArrayBuffer>;
}
export interface ArchiveImportResult {
	name: string;
	path?: string;
	error?: string;
}
