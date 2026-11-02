// Only the external Obsidian API is controlled. Host, HAP and receipt code are production imports.
export class TFile {}
export class TFolder {}
export class MarkdownView {}
export class FileSystemAdapter {}
export const Platform = { isDesktopApp: false };
export const normalizePath = (value) =>
	value
		.replace(/\\/g, '/')
		.replace(/\/{2,}/g, '/')
		.replace(/^\/+|\/+$/g, '');
