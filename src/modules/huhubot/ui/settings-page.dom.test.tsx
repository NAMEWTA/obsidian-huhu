import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders } from '../../../ui/react/test-providers';
import { setLanguage, t } from '../../../shared/i18n';
import type { SettingsHandle } from '../../../shared/settings/store';
import type { BotClient, BotMethodMap, BotRuntimeAccess, BudgetSettings } from '../api';
import { BotRpcError } from '../core/protocol/connection';
import type { HuhuBotSettings } from '../settings';
import { huhubotSettingsPage } from './settings-page';

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
const saved: BudgetSettings = {
	revision: '1',
	policy: { rootTokenLimit: '10', profileTokenLimit: '100', maintenanceTokenLimit: '20', paused: true },
	limits: { maxDepth: 4, maxChildren: 4, rootChildren: 4, profileChildren: 8, maxWakes: 8 },
};
function fixture() {
	const reading = deferred<BudgetSettings>(),
		writing = deferred<BudgetSettings>();
	const budget = vi.fn(async () => reading.promise),
		configureBudget = vi.fn(
			async (_command: BotMethodMap['collaboration.configureBudget']['params']) => writing.promise,
		);
	const client = {
		state: 'ready',
		hello: { profile: { profileId: 'profile', commandEpoch: '1' } },
		onClose: () => () => {},
		collaboration: { budget, configureBudget },
	} as unknown as BotClient;
	const snapshot: HuhuBotSettings = { binaryPath: '', workingDirectory: '', profileRoot: '' };
	const settings = {
		get: () => snapshot,
		subscribe: () => () => {},
		update: vi.fn(async () => {}),
	} as unknown as SettingsHandle<HuhuBotSettings>;
	const runtime = { client, connect: async () => client } as BotRuntimeAccess;
	return { View: huhubotSettingsPage(settings, runtime), reading, writing, budget, configureBudget };
}
beforeEach(() => setLanguage('en'));
test('budget controls wait for the initial saved policy and stay locked during configuration', async () => {
	const f = fixture();
	render(
		<TestProviders>
			<f.View />
		</TestProviders>,
	);
	const limit = screen.getByLabelText(t('huhubot.settings.rootTokenLimit')) as HTMLInputElement;
	expect(limit.disabled).toBe(true);
	expect((screen.getByRole('checkbox') as HTMLButtonElement).disabled).toBe(true);
	f.reading.resolve(saved);
	await waitFor(() => expect(limit.disabled).toBe(false));
	fireEvent.change(limit, { target: { value: '25' } });
	fireEvent.click(screen.getByRole('button', { name: t('huhubot.settings.saveBudget') }));
	await waitFor(() => expect(f.configureBudget).toHaveBeenCalledOnce());
	expect(limit.disabled).toBe(true);
	expect((screen.getByRole('checkbox') as HTMLButtonElement).disabled).toBe(true);
	f.writing.resolve({ ...saved, revision: '2', policy: { ...saved.policy, rootTokenLimit: '25' } });
	await waitFor(() => expect(limit.disabled).toBe(false));
	expect(limit.value).toBe('25');
	expect(f.budget).toHaveBeenCalledOnce();
	expect(screen.getByRole('checkbox').getAttribute('data-slot')).toBe('checkbox');
});
test('separate settings leaves use separate credential field identities', () => {
	const f = fixture();
	render(
		<TestProviders>
			<f.View />
			<f.View />
		</TestProviders>,
	);
	const fields = screen.getAllByLabelText(t('huhubot.settings.apiKey'));
	expect(fields).toHaveLength(2);
	expect(fields[0]!.id).not.toBe(fields[1]!.id);
});
test('a policy conflict keeps the draft until explicit discard then reloads the saved revision', async () => {
	const f = fixture();
	f.configureBudget.mockRejectedValueOnce(
		new BotRpcError(-32000, {
			kind: 'CONFLICT',
			reason: 'REVISION_CONFLICT',
			retryable: false,
			correlationId: 'test',
		}),
	);
	render(
		<TestProviders>
			<f.View />
		</TestProviders>,
	);
	f.reading.resolve(saved);
	const limit = screen.getByLabelText(t('huhubot.settings.rootTokenLimit')) as HTMLInputElement;
	await waitFor(() => expect(limit.disabled).toBe(false));
	fireEvent.change(limit, { target: { value: '25' } });
	fireEvent.click(screen.getByRole('button', { name: t('huhubot.settings.saveBudget') }));
	await screen.findByRole('alert');
	fireEvent.click(screen.getByRole('button', { name: t('huhubot.common.reloadSaved') }));
	fireEvent.click(screen.getByRole('button', { name: t('huhubot.common.keepEditing') }));
	expect(limit.value).toBe('25');
	expect(f.budget).toHaveBeenCalledOnce();
	f.budget.mockResolvedValueOnce({ ...saved, revision: '2', policy: { ...saved.policy, rootTokenLimit: '80' } });
	fireEvent.click(screen.getByRole('button', { name: t('huhubot.common.reloadSaved') }));
	fireEvent.click(screen.getByRole('button', { name: t('huhubot.common.discard') }));
	await waitFor(() => expect(limit.value).toBe('80'));
	expect(f.budget).toHaveBeenCalledTimes(2);
	fireEvent.change(limit, { target: { value: '95' } });
	fireEvent.click(screen.getByRole('button', { name: t('huhubot.settings.saveBudget') }));
	await waitFor(() => expect(f.configureBudget).toHaveBeenCalledTimes(2));
	expect(f.configureBudget.mock.calls[1]?.[0].expectedRevision).toBe('2');
	f.writing.resolve({ ...saved, revision: '3', policy: { ...saved.policy, rootTokenLimit: '95' } });
	await waitFor(() => expect(limit.disabled).toBe(false));
});
