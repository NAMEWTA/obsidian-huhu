import { isIconDataUrl } from '../core/model';

/** Icons are shown at most 32px; 64px keeps them sharp on dense screens and each stays a few kilobytes. */
export const ICON_PIXELS = 64;
/** An image larger than this is not even decoded. */
export const ICON_SOURCE_MAX_BYTES = 8 * 1024 * 1024;

export interface IconCanvas {
	/** Draw the image scaled to cover the square canvas, centered, and return it as a data URL of the given type. */
	encode(type: string): string;
	dispose(): void;
}

export interface IconDecoder {
	/** Decode the image and draw it on a square canvas; rejects for anything that is not a decodable raster image. */
	draw(file: Blob): Promise<IconCanvas>;
}

/**
 * Turn a chosen picture into the small icon stored inside the encrypted entry. The picture is decoded and redrawn in
 * memory only, so nothing about it is written to disk outside the encrypted file. Returns null when the picture cannot
 * be used (not an image, too large, or still too big after resizing).
 */
export async function imageToIcon(file: Blob, decoder: IconDecoder): Promise<string | null> {
	if (file.size > ICON_SOURCE_MAX_BYTES || !/^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type)) return null;
	let canvas: IconCanvas;
	try {
		canvas = await decoder.draw(file);
	} catch {
		return null;
	}
	try {
		// PNG keeps transparency; the lossy formats are only a fallback for busy photographs.
		for (const type of ['image/png', 'image/webp', 'image/jpeg']) {
			const url = canvas.encode(type);
			if (isIconDataUrl(url)) return url;
		}
		return null;
	} finally {
		canvas.dispose();
	}
}

/** The decoder for a window: a canvas of that window's document. */
export function canvasDecoder(doc: Document): IconDecoder {
	return {
		async draw(file) {
			const win = doc.defaultView;
			if (!win) throw new Error('window closed');
			const bitmap = await win.createImageBitmap(file);
			const canvas = doc.createElement('canvas');
			canvas.width = ICON_PIXELS;
			canvas.height = ICON_PIXELS;
			const context = canvas.getContext('2d');
			if (!context) {
				bitmap.close();
				throw new Error('canvas unavailable');
			}
			const side = Math.min(bitmap.width, bitmap.height);
			context.imageSmoothingQuality = 'high';
			context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, ICON_PIXELS, ICON_PIXELS);
			bitmap.close();
			return {
				encode: type => canvas.toDataURL(type, 0.85),
				dispose: () => { canvas.width = 0; canvas.height = 0; },
			};
		},
	};
}
