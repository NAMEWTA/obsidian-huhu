import type { ArchiveFolderEntry } from './resources';
/** File identity is stable during a rename; the adapter owns the actual file objects. */
export interface ContactsFile {
	readonly path: string;
	readonly extension: string;
	readonly stat: { mtime: number; size: number };
}
export interface ContactsFiles {
	readonly formatGuide: string;
	ready(): Promise<void>;
	getMarkdownFiles(): ContactsFile[];
	getFileByPath(path: string): ContactsFile | null;
	getAbstractFileByPath(path: string): unknown;
	read(file: ContactsFile): Promise<string>;
	cachedRead(file: ContactsFile): Promise<string>;
	process(file: ContactsFile, update: (latest: string) => string, beforeCommit?: () => void): Promise<string>;
	create(path: string, content: string, beforeCommit?: () => void): Promise<ContactsFile>;
	createBinary(path: string, content: ArrayBuffer): Promise<ContactsFile>;
	listFolder(path: string): ArchiveFolderEntry[];
	trashFolder(path: string, beforeCommit?: () => void): Promise<void>;
	checkFolderEditors(path: string): Promise<() => void>;
	/** Captures all native leaves once; the returned check detects leaf/generation changes at the synchronous commit point. */
	captureEditors(files: readonly ContactsFile[]): Promise<() => void>;
	createFolder(path: string): Promise<void>;
	mkdir(path: string): Promise<void>;
	checkEditor(file: ContactsFile, disk: string): void;
}
