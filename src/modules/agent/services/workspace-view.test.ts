import { expect, test } from 'vitest';
import { createWorkspaceView } from './workspace-view';

test('a fresh workspace opens one control tool while saved closing and an open history panel take precedence', () => {
	expect(createWorkspaceView().getState()).toMatchObject({ control: true, history: false });
	expect(createWorkspaceView({ agentControl: false }).getState()).toMatchObject({ control: false });
	expect(createWorkspaceView({ agentHistory: true }).getState()).toMatchObject({ control: false, history: true });
	expect(createWorkspaceView({ agentControl: true, agentHistory: true }).getState()).toMatchObject({
		control: false,
		history: true,
	});
	expect(createWorkspaceView({ agentTool: 'inbox' }).getState()).toMatchObject({ control: true, history: false, agentTool: 'inbox' });
	expect(createWorkspaceView({ agentTool: 'bogus' }).getState().agentTool).toBe('control');
});
