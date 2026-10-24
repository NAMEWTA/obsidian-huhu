/**
 * Centralised file-type knowledge for the dashboard.
 *
 * Every place that filters "supported" vault files or picks an icon for one
 * should go through these helpers so a new format (canvas, base, audio, ...)
 * only needs to be added once.
 */

/** Every file extension the dashboard recognises for browsing, linking, and
 *  attaching to cards. Kept as a lowercased set; lookups are case-insensitive. */
export const SUPPORTED_FILE_EXTS: ReadonlySet<string> = new Set([
	// Notes & documents
	'md',
	'pdf',
	// Obsidian rich formats
	'canvas',
	'base',
	// Images
	'png',
	'jpg',
	'jpeg',
	'gif',
	'svg',
	'webp',
	'bmp',
	// Audio
	'mp3',
	'wav',
	'ogg',
	'm4a',
	'flac',
	// Video
	'mp4',
	'mov',
	'mkv',
	'avi',
	'webm',
	'm4v',
]);
