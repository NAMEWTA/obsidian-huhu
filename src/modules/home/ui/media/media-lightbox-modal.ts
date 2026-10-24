
import type { ContentFile } from '../../../../host/obsidian/storage/content-files';
export interface MediaTagHooks {
	getTags(file: ContentFile): string[];
	getAllTags(): string[];
	onTagsChange(file: ContentFile, tags: string[]): void;
}
