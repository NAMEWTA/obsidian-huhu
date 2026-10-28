import type { App } from 'obsidian';
import { DocumentMutationCoordinator, type DocumentMutationOptions } from '../../../../host/obsidian/document-mutation';

export function createObsidianRestoreDocuments(
	app: App,
	options: DocumentMutationOptions,
): DocumentMutationCoordinator {
	return new DocumentMutationCoordinator(app, options);
}
