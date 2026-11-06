import { createRoot } from 'react-dom/client';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ShellRoot } from './ShellRoot';
import { TestProviders } from '../ui/react/test-providers';
import { Button } from '../ui/components/button';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '../ui/components/dropdown-menu';
import { normalizeWorkbenchState, WORKBENCH_UI_SCHEMA } from './navigation-state';
import { t } from '../shared/i18n';
test('a retained independent navigation root opens its menu above the owning Sheet', async () => {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
		left: 0,
		top: 0,
		width: 800,
		height: 800,
		right: 800,
		bottom: 800,
		x: 0,
		y: 0,
		toJSON() {
			return {};
		},
	});
	const navigation = document.createElement('div');
	document.body.append(navigation);
	const root = createRoot(navigation);
	await act(async () =>
		root.render(
			<TestProviders>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button>Independent menu</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem>Navigation action</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TestProviders>,
		),
	);
	const user = userEvent.setup();
	const view = render(
		<TestProviders>
			<ShellRoot
				state={normalizeWorkbenchState({ schema: WORKBENCH_UI_SCHEMA, route: { feature: 'terminal' } })}
				rail={[{ id: 'terminal', label: 'Agent', icon: 'terminal', slot: 'top' }]}
				title="Agent"
				panelTitle="Agent"
				navigationContext
				ownerWindow={window}
				statuses={[]}
				busy={false}
				onRail={() => 'toggled'}
				onOpen={() => {}}
				onNavigate={() => {}}
				onPanelOpen={() => {}}
				onPanelWidth={() => {}}
				more={() => {}}
				retry={() => {}}
				report={() => {}}
				contentRef={null}
				panelCustomRef={(node) => {
					if (node) node.append(navigation);
				}}
			/>
		</TestProviders>,
	);
	try {
		await user.click(screen.getByRole('button', { name: t('workbench.toggleNavigation') }));
		const sheet = await screen.findByRole('dialog');
		await user.click(screen.getByRole('button', { name: 'Independent menu' }));
		const menu = await screen.findByRole('menu');
		expect(Number((menu as HTMLElement).style.zIndex)).toBeGreaterThan(Number((sheet as HTMLElement).style.zIndex));
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
		expect(screen.getByRole('dialog')).toBe(sheet);
	} finally {
		view.unmount();
		await act(async () => root.unmount());
		navigation.remove();
		vi.restoreAllMocks();
	}
});
