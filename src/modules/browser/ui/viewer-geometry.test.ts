import { expect, it, vi } from 'vitest';
import { framePoint, latestFramePresenter } from './viewer-geometry';

it('maps letterboxed surface pixels to CSS coordinates at non-unit zoom and refuses margins', () => {
	const box = { left: 20, top: 30, width: 800, height: 800 },
		frame = { cssWidth: 1600, cssHeight: 1000 };
	expect(framePoint(box, frame, 420, 430)).toEqual({ x: 800, y: 500 });
	expect(framePoint(box, frame, 420, 31)).toBeUndefined();
	expect(framePoint(box, frame, 820, 430)).toBeUndefined();
	expect(framePoint({ ...box, width: 0 }, frame, 20, 30)).toBeUndefined();
});
it('bounds decoder work to one live and one newest pending frame, ACKing replacements and closure', async () => {
	const ack = vi.fn(),
		presented: number[] = [];
	let resolve!: () => void;
	const presenter = latestFramePresenter<number>({
		ack,
		error: vi.fn(),
		present: async (value) => {
			presented.push(value);
			await new Promise<void>((done) => {
				resolve = done;
			});
		},
	});
	presenter.enqueue(1);
	presenter.enqueue(2);
	presenter.enqueue(3);
	expect(presented).toEqual([1]);
	expect(ack.mock.calls.flat()).toEqual([2]);
	resolve();
	await Promise.resolve();
	await Promise.resolve();
	expect(presented).toEqual([1, 3]);
	expect(ack.mock.calls.flat()).toEqual([2, 1]);
	presenter.enqueue(4);
	presenter.dispose();
	resolve();
	await Promise.resolve();
	await Promise.resolve();
	expect(ack.mock.calls.flat().sort()).toEqual([1, 2, 3, 4]);
});
