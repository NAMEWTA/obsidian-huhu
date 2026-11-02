import { afterEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'zustand/vanilla';
import { DndContext } from '@dnd-kit/core';
import { TestProviders } from '../../../../ui/react/test-providers';
import { t } from '../../../../shared/i18n';
import { emptyWorkspace } from '../../core/workspace/model';
import { WorkspaceService } from '../../services/workspace-service';
import type { TerminalSessions } from '../../services/terminal/sessions';
import type { AgentController } from '../../services/controller';
import { WorkspaceUIContext } from '../workspace/workspace-context';
import { WorkspaceTab } from './WorkspaceTab';
const services: WorkspaceService[] = [];
afterEach(async () => { await Promise.all(services.splice(0).map((service) => service.dispose())); });
test.each(['right', 'down'] as const)('real tab menu %s reports a single-tab refusal, then splits two page tabs', async (edge) => {
	const report = vi.fn();
	const workspace = new WorkspaceService({ store: createStore(emptyWorkspace), ready: Promise.resolve(), flush: async () => {}, dispose: async () => {} },
		{ subscribe: () => () => {}, get: () => undefined, focus: vi.fn() } as unknown as TerminalSessions,
		{ shell: vi.fn(), agent: vi.fn(), resume: vi.fn(), account: () => '', report });
	services.push(workspace);
	workspace.openPage('board');
	const tab = workspace.active!, groupId = workspace.group(tab.id)!.id;
	const controller = { workspace } as AgentController;
	render(<TestProviders><WorkspaceUIContext value={{ controller, confirm: async () => false, close: () => {} }}><DndContext>
		<WorkspaceTab tab={tab} groupId={groupId} active />
	</DndContext></WorkspaceUIContext></TestProviders>);
	const user = userEvent.setup();
	const choose = async () => {
		await user.pointer({ keys: '[MouseRight]', target: screen.getByRole('tab') });
		await user.click(await screen.findByRole('menuitem', { name: t(`agent.workspace.split.${edge}`) }));
	};
	await choose();
	expect(workspace.store.getState().groups).toHaveLength(1);
	expect(report).toHaveBeenCalledExactlyOnceWith(t('agent.workspace.moveReason.last-tab'));
	workspace.openPage('usage');
	await choose();
	expect(workspace.store.getState().groups).toHaveLength(2);
	expect(workspace.active?.id).toBe(tab.id);
	expect(report).toHaveBeenCalledTimes(1);
});
