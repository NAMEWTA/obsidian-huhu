import type { SafeService } from '../services/safe-service';

/** Command-only boundary: activating the safe does not load React, Radix or the quick picker. */
export async function openQuickPick(owner: HTMLElement, service: SafeService, signal: AbortSignal): Promise<void> {
	(await import('./quick-pick-dialog')).openQuickPick(owner, service, signal);
}
