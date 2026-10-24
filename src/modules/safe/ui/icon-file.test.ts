import { describe, expect, test, vi } from 'vitest';
import { ICON_SOURCE_MAX_BYTES, imageToIcon, type IconDecoder } from './icon-file';

const png = `data:image/png;base64,${btoa('\x89PNG\r\n\x1a\n\x00')}AAAA`;
const decoder = (encode: (type: string) => string, dispose = vi.fn()): IconDecoder => ({ draw: async () => ({ encode, dispose }) });
const image = (type = 'image/png', size = 4) => new Blob([new Uint8Array(size)], { type });

describe('icon from a picture', () => {
	test('uses the first encoding that is a valid small icon and releases the canvas', async () => {
		const dispose = vi.fn();
		const encode = vi.fn((type: string) => type === 'image/png' ? `data:image/png;base64,${'A'.repeat(40000)}` : `data:image/webp;base64,${btoa('RIFF1234WEBPVP8 ')}`);
		await expect(imageToIcon(image(), decoder(encode, dispose))).resolves.toMatch(/^data:image\/webp/);
		expect(encode.mock.calls.map(call => call[0])).toEqual(['image/png', 'image/webp']);
		expect(dispose).toHaveBeenCalledOnce();
		await expect(imageToIcon(image(), decoder(() => png))).resolves.toBe(png);
	});

	test('rejects non-images, huge files, undecodable pictures and results that never fit', async () => {
		const never = vi.fn(() => 'data:image/png;base64,');
		await expect(imageToIcon(image('text/plain'), decoder(never))).resolves.toBeNull();
		await expect(imageToIcon(image('image/svg+xml'), decoder(never))).resolves.toBeNull();
		await expect(imageToIcon(image('image/png', ICON_SOURCE_MAX_BYTES + 1), decoder(never))).resolves.toBeNull();
		await expect(imageToIcon(image(), { draw: async () => { throw new Error('bad image'); } })).resolves.toBeNull();
		await expect(imageToIcon(image(), decoder(never))).resolves.toBeNull();
		expect(never).toHaveBeenCalledTimes(3);
	});
});
