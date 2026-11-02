import { expect, test, vi } from 'vitest';
import {
	calculateDiff,
	computeDiff,
	DIFF_DISPLAY_LIMIT,
	DiffLimitError,
	displayText,
	MAIN_THREAD_DIFF_LIMIT,
	mapDiffAnchor,
	type DiffWorkerResponse,
} from './diff-model';

test('diff preserves source elsewhere while normalizing only display BOM and line endings', () => {
	const original = '\uFEFF# 项目\r\n目标：旧内容\r\n';
	const next = '# 项目\n目标：新内容\n';
	const result = calculateDiff({ id: 'unicode', left: original, right: next });
	expect(original).toBe('\uFEFF# 项目\r\n目标：旧内容\r\n');
	expect(result.left).toBe('# 项目\n目标：旧内容\n');
	expect(result.chunks).toHaveLength(1);
	expect(result.chunks[0]?.changes[0]).toMatchObject({ fromA: 8, toA: 11, fromB: 8, toB: 11 });
	expect(displayText('a\rb\r\n')).toBe('a\nb\n');
});

test('anchor mapping follows unchanged text after additions and deletions', () => {
	const added = calculateDiff({
		id: 'insert',
		left: 'one\ntwo\nthree\nfour\n',
		right: 'one\nnew line\ntwo\nthree\nfour\n',
	});
	const source = added.left.indexOf('three');
	expect(mapDiffAnchor(added.chunks, source, 'a', added.right.length)).toBe(added.right.indexOf('three'));
	expect(mapDiffAnchor(added.chunks, added.right.indexOf('four'), 'b', added.left.length)).toBe(
		added.left.indexOf('four'),
	);
	const removed = calculateDiff({ id: 'delete', left: 'one\nremoved\ntwo\nthree\n', right: 'one\ntwo\nthree\n' });
	expect(mapDiffAnchor(removed.chunks, removed.left.indexOf('three'), 'a', removed.right.length)).toBe(
		removed.right.indexOf('three'),
	);
	expect(mapDiffAnchor(removed.chunks, removed.left.length + 50, 'a', removed.right.length)).toBe(
		removed.right.length,
	);
});

test('worker comparison ignores obsolete ids and terminates after successful completion', async () => {
	const worker = {
		onmessage: null,
		onerror: null,
		onmessageerror: null,
		postMessage: vi.fn(),
		terminate: vi.fn(),
	} as unknown as Worker;
	const request = { id: 'latest', left: 'a', right: 'b' };
	const promise = computeDiff(request, new AbortController().signal, () => worker);
	const deliver = (response: DiffWorkerResponse) =>
		worker.onmessage?.({ data: response } as MessageEvent<DiffWorkerResponse>);
	deliver({ id: 'old', model: calculateDiff({ ...request, id: 'old' }) });
	expect(worker.terminate).not.toHaveBeenCalled();
	deliver({ id: request.id, model: calculateDiff(request) });
	expect((await promise).id).toBe('latest');
	expect(worker.terminate).toHaveBeenCalledOnce();
	expect(worker.onmessage).toBeNull();
});

test('cancelling terminates a busy worker and large fallback computations are refused', async () => {
	const worker = {
		onmessage: null,
		onerror: null,
		onmessageerror: null,
		postMessage: vi.fn(),
		terminate: vi.fn(),
	} as unknown as Worker;
	const controller = new AbortController();
	const result = computeDiff({ id: 'cancel', left: 'a', right: 'b' }, controller.signal, () => worker);
	const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
	controller.abort();
	await rejected;
	expect(worker.terminate).toHaveBeenCalledOnce();
	await expect(
		computeDiff(
			{ id: 'large', left: 'x'.repeat(MAIN_THREAD_DIFF_LIMIT + 1), right: '' },
			new AbortController().signal,
		),
	).rejects.toEqual(new DiffLimitError('worker-required'));
	await expect(
		computeDiff(
			{ id: 'huge', left: 'x'.repeat(DIFF_DISPLAY_LIMIT + 1), right: '' },
			new AbortController().signal,
			() => worker,
		),
	).rejects.toEqual(new DiffLimitError('display-limit'));
});
