import { expect, test } from 'vitest';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { StatusDot } from '../../../../ui/components/huhu/StatusDot';

// AC-061: status is never conveyed by colour alone, in the pane header, tabs, sidebar or any grouping.
const states = ['idle', 'done', 'failed', 'interrupted', 'working', 'permission', 'unknown'] as const;

function cue(state: (typeof states)[number], size: 'sm' | 'md') {
	const { container, unmount } = render(
		<TestProviders>
			<StatusDot state={state} size={size} />
		</TestProviders>,
	);
	const root = container.querySelector('[role="img"]')!;
	const shape = root.querySelector('[data-status-shape]')?.getAttribute('data-status-shape');
	// Shape fingerprint: explicit marker, or the drawing element (spinner / question / dashed) when it has none.
	const signature = shape ?? root.innerHTML.replace(/class="[^"]*"/g, '').replace(/\s+/g, ' ');
	const label = root.getAttribute('aria-label');
	unmount();
	return { signature, label };
}

for (const size of ['sm', 'md'] as const) {
	test(`each of idle/done/failed/interrupted/running/blocked/unknown has its own non-colour shape and a label (${size})`, () => {
		const seen = new Map<string, string>();
		for (const state of states) {
			const { signature, label } = cue(state, size);
			expect(label, state).toBeTruthy();
			expect(seen.get(signature), `${state} must not share a shape with ${seen.get(signature)}`).toBeUndefined();
			seen.set(signature, state);
		}
		// permission is the blocked state: it must also differ from waiting-free states (checked above) and keep its label.
		expect(seen.size).toBe(states.length);
	});
}

test('failed and interrupted use different shapes even though they share the error colour', () => {
	expect(cue('failed', 'sm').signature).toBe('failed');
	expect(cue('interrupted', 'sm').signature).toBe('interrupted');
	expect(cue('done', 'md').signature).toBe('done');
});
