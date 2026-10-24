import type { App, HoverParent } from 'obsidian';
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';
export interface DataviewContext {
	app: App;
	hoverParent: HoverParent | null;
	opener: ((file: ContentFile, subpath?: string) => void) | null;
}
