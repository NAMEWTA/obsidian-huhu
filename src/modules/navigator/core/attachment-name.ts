// Behaviour modelled on johansan/notebook-navigator (GPL-3.0); independent implementation, no code copied.
import { joinPath, parentFolder } from './types';

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

/** `YYYY-MM-DD-HHMMSS` of a local date: the part of an attachment name that tells when it was added. */
export function attachmentStamp(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
	'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp', 'image/avif': 'avif', 'image/heic': 'heic', 'image/tiff': 'tiff',
	'application/pdf': 'pdf', 'application/zip': 'zip', 'application/json': 'json', 'text/plain': 'txt', 'text/markdown': 'md', 'text/csv': 'csv',
	'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/webm': 'webm',
	'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

/** Lower-case extension of an attachment: the one in its file name, else the one its MIME type stands for, else `bin`. */
export function attachmentExtension(fileName: string, mimeType: string): string {
	const dot = fileName.lastIndexOf('.');
	const named = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
	if (/^[a-z0-9]{1,10}$/.test(named)) return named;
	return MIME_EXTENSIONS[mimeType.toLowerCase().split(';')[0]!.trim()] ?? 'bin';
}

/** `YYYY-MM-DD-HHMMSS-xxxx.ext`, `xxxx` being four lower-case hex digits. */
export function attachmentFileName(date: Date, token: string, extension: string): string {
	return `${attachmentStamp(date)}-${token}.${extension}`;
}

/** Four random hex digits (`0000`-`ffff`) from `random()` in [0, 1). */
export function randomToken(random: () => number): string {
	return Math.floor(random() * 0x10000).toString(16).padStart(4, '0');
}

/**
 * The folder attachments of the note at `notePath` go to: `<folder of the note>/<name>`, `name` defaulting to
 * `assets`. Slashes and characters a folder name cannot have are dropped, so the folder is always one level.
 */
export function attachmentFolder(notePath: string, name: string): string {
	const clean = name.replace(/[\\/:*?"<>|]/g, '').replace(/^[\s.]+|[\s.]+$/g, '') || 'assets';
	return joinPath(parentFolder(notePath), clean);
}

/**
 * A path in `folder` for a new attachment: the stamp and a random token, drawn again while a file with that name
 * exists, so several files added in the same second never clash.
 */
export function uniqueAttachmentPath(folder: string, date: Date, extension: string, exists: (path: string) => boolean, random: () => number): string {
	for (let attempt = 0; ; attempt++) {
		const path = joinPath(folder, attachmentFileName(date, randomToken(random), extension));
		if (!exists(path)) return path;
		// 65,536 names per second: running out means the random source is broken, so stop instead of looping.
		if (attempt > 70_000) throw new Error('No free attachment name');
	}
}
