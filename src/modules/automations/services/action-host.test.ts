import { expect, test, vi } from 'vitest';
import type { ModuleContext } from '../../../app/contracts/module';
import { createActionHost } from './action-host';

test('openUrl hands the address to the system default browser', async () => {
	const open = vi.fn();
	const context = { app: { workspace: { containerEl: { win: { open } } } } } as unknown as ModuleContext;
	await createActionHost(context).openUrl('https://example.com/a');
	expect(open).toHaveBeenCalledWith('https://example.com/a', '_blank');
});
