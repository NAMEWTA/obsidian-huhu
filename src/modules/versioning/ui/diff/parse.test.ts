import { expect, test, vi } from 'vitest';
import { parseComparison } from './parse';

const a = { name: 'a.txt', contents: 'before\n' },
	b = { name: 'a.txt', contents: 'after\n' };
test('the library preserves missing endpoints versus a real empty file', async () => {
	const empty = { name: 'a.txt', contents: '' };
	const metadata = await parseComparison(null, empty, new AbortController().signal);
	expect(metadata.additionLines.join('')).toBe('');
	expect(await parseComparison(a, b, new AbortController().signal)).toMatchObject({
		isPartial: false,
		additionLines: ['after\n'],
		deletionLines: ['before\n'],
	});
});
test('large parsing needs a worker rather than running synchronously', async () => {
	await expect(
		parseComparison(a, { ...b, contents: 'x'.repeat(120_001) }, new AbortController().signal),
	).rejects.toThrow('versioning.diff.workerRequired');
});
test('cancelling terminates the actual calculation and detaches late results', async () => {
	const worker = { onmessage: null, onerror: null, onmessageerror: null, postMessage: vi.fn(), terminate: vi.fn() };
	const signal = new AbortController();
	const result = parseComparison(a, b, signal.signal, () => worker as unknown as Worker);
	expect(worker.postMessage).toHaveBeenCalledWith({ oldFile: a, newFile: b });
	signal.abort();
	await expect(result).rejects.toMatchObject({ name: 'AbortError' });
	expect(worker.terminate).toHaveBeenCalledOnce();
	expect(worker.onmessage).toBeNull();
});
test('worker failures reject and release the calculation', async () => {
	const worker = {
		onmessage: null as null | ((event: MessageEvent) => void),
		onerror: null,
		onmessageerror: null,
		postMessage: vi.fn(),
		terminate: vi.fn(),
	};
	const result = parseComparison(a, b, new AbortController().signal, () => worker as unknown as Worker);
	worker.onmessage!({ data: { error: 'parser failed' } } as MessageEvent);
	await expect(result).rejects.toThrow('parser failed');
	expect(worker.terminate).toHaveBeenCalledOnce();
});

test('an abort during worker construction releases the worker before posting any calculation', async () => {
	const signal = new AbortController();
	const worker = { onmessage: null, onerror: null, onmessageerror: null, postMessage: vi.fn(), terminate: vi.fn() };
	await expect(
		parseComparison(a, b, signal.signal, () => {
			signal.abort();
			return worker as unknown as Worker;
		}),
	).rejects.toMatchObject({ name: 'AbortError' });
	expect(worker.postMessage).not.toHaveBeenCalled();
	expect(worker.terminate).toHaveBeenCalledOnce();
});
