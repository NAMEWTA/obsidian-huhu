import { createRef } from 'react';
import { expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../ui/react/test-providers';
import type { PanelModel } from '../../app/contracts/workbench';
import { SidePanel } from './SidePanel';

test('a panel that matches the query itself lists its results with a second line and navigates on click', async () => {
	const query = vi.fn(async (text: string) => [
		{ id: 'a', label: `Hit for ${text}`, detail: 'Agents › Usage · Quota', target: { feature: 'settings' as const, section: 'terminal', focusId: 'k' } },
	]);
	const model: PanelModel = {
		searchable: true,
		search: { placeholder: 'Search settings…', query },
		sections: [{ id: 's', items: [{ id: 'general', label: 'General' }] }],
	};
	const onNavigate = vi.fn();
	render(
		<TestProviders>
			<SidePanel title="Settings" model={model} current={{ feature: 'settings' }} customRef={createRef()} onNavigate={onNavigate} report={vi.fn()} />
		</TestProviders>,
	);
	expect(screen.getByText('General')).toBeTruthy();
	await userEvent.setup().type(screen.getByRole('textbox', { name: 'Search settings…' }), 'usage');
	const result = await screen.findByRole('button', { name: /Hit for usage/ });
	expect(result.textContent).toContain('Agents › Usage · Quota');
	// The category list gives way to the results.
	expect(screen.queryByText('General')).toBeNull();
	await userEvent.setup().click(result);
	await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ feature: 'settings', section: 'terminal', focusId: 'k' }));
});
