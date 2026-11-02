import { expect, it, vi } from 'vitest';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { createBrowserPage } from './workbench-page';
import { workspaceFixture } from './testing/workspace';

it('uses explicit focusId for existing presentations and preserves it through an empty restore', async () => {
	const f = workspaceFixture(),
		changed = vi.fn();
	const context = {
		changed,
		contentEl: document.createElement('div'),
		containerEl: document.createElement('div'),
	} as unknown as NativeSurfaceContext;
	const signal = new AbortController().signal;
	const binding = await createBrowserPage(f.api)(
		context,
		{ feature: 'browser', resourceId: 'space', focusId: 'page-a' },
		{},
		signal,
	);
	await binding.navigate({ feature: 'browser', resourceId: 'space', focusId: 'page-b' }, signal);
	await binding.restore?.({});
	expect(binding.getTarget?.()).toEqual({ feature: 'browser', resourceId: 'space', focusId: 'page-b' });
	await binding.navigate({ feature: 'browser', resourceId: 'space' }, signal);
	expect(binding.getState?.()).toEqual({ spaceId: 'space', pageId: 'page-b' });
	await binding.navigate({ feature: 'browser', resourceId: 'another-space' }, signal);
	expect(binding.getTarget?.()).toEqual({ feature: 'browser', resourceId: 'another-space', focusId: undefined });
	expect(changed).toHaveBeenCalledTimes(4);
	expect(f.api.createSpace).not.toHaveBeenCalled();
});
