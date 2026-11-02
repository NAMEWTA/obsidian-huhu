import type { RecoveryOwner } from '../../../../shared/storage/recovery-contracts';
import type { NativeHistory } from '../../platform/history/service';
import type { StatsService } from '../stats-service';
import type { TerminalAutomationRuntime } from '../agent-runtime';
import { agentWorkbenchPath } from '../../../../shared/storage/vault-layout';
import type { SpaceService } from '../spaces/space-service';
import type { WorkspaceStore } from '../workspace-store';

/**
 * Live agent writers expressed as recovery owners. Each wraps the strict methods the real writer exposes
 * (`quiesce*`, `drain*`, `reload*`, `resume*`); none of them uses the reported-only flush paths.
 * T-16 and any runtime import register these on the app recovery host; the pre-start legacy import needs none
 * because no writer exists yet in that process.
 */
export interface FileWriter {
	/** Running work that blocks the operation (listed to the user, never stopped here). */
	busy?(): readonly string[];
	quiesce(): void | Promise<void>;
	drain(): Promise<void>;
	reload(): Promise<void>;
	resume(): void | Promise<void>;
}

export function createFileOwner(id: string, paths: readonly string[], writer: FileWriter): RecoveryOwner {
	const owned = new Set(paths);
	return {
		id,
		owns: (path) => owned.has(path),
		preflight: async () => ({ busy: writer.busy?.() ?? [] }),
		quiesce: async () => {
			await writer.quiesce();
		},
		drain: async () => {
			await writer.drain();
		},
		adopt: async () => {
			await writer.reload();
		},
		release: async () => {
			await writer.resume();
		},
	};
}

const dir = (device: string) => `.huhu/terminal-agent/${device}`;

export function historyAnnotationOwner(
	device: string,
	current: () => Pick<NativeHistory, 'quiesceWrites' | 'drainWrites' | 'reloadFromDisk' | 'resumeWrites'>,
): RecoveryOwner {
	return createFileOwner('agent-history', [`${dir(device)}/history.json`], {
		// The history owner is created lazily; asking for it here means it exists and is reloaded after adoption.
		quiesce: () => current().quiesceWrites(),
		drain: () => current().drainWrites(),
		reload: () => current().reloadFromDisk(),
		resume: () => current().resumeWrites(),
	});
}

export function usageStatsOwner(
	device: string,
	stats: Pick<StatsService, 'quiesceWrites' | 'drain' | 'reloadFromDisk' | 'resumeWrites'>,
	workspaceScoped: boolean,
): RecoveryOwner {
	return createFileOwner(
		workspaceScoped ? 'agent-workspace-stats' : 'agent-stats',
		[`${dir(device)}/${workspaceScoped ? 'workspace-stats' : 'stats'}.json`],
		{
			quiesce: () => stats.quiesceWrites(),
			drain: () => stats.drain(),
			reload: () => stats.reloadFromDisk(),
			resume: () => stats.resumeWrites(),
		},
	);
}

export function automationRegistryOwner(
	device: string,
	runtime: Pick<TerminalAutomationRuntime, 'quiesceRegistry' | 'drainRegistry' | 'reloadRegistry' | 'resumeRegistry'>,
	busy?: () => readonly string[],
): RecoveryOwner {
	return createFileOwner('agent-automation-sessions', [`${dir(device)}/automation-sessions.json`], {
		busy,
		quiesce: () => runtime.quiesceRegistry(),
		drain: () => runtime.drainRegistry(),
		reload: () => runtime.reloadRegistry(),
		resume: () => runtime.resumeRegistry(),
	});
}

/**
 * Space records, sessions, inbox and every layout (Agent and Browser share them) as one owner. Quiesce makes
 * every writer, including Browser edits through the shared workspace store, fail with BUSY; drain saves dirty
 * drafts and queued writes strictly; adopt reloads the records and drops all cached drafts and JsonStore baselines.
 */
export function spaceWorkspaceOwner(
	device: string,
	spaces: Pick<SpaceService, 'quiesceWrites' | 'resumeWrites' | 'drainWrites' | 'reloadFromDisk'>,
	layouts: Pick<WorkspaceStore, 'holdEdits' | 'resumeEdits' | 'drainEdits' | 'reloadFromSpaces'>,
	busy?: () => readonly string[],
): RecoveryOwner {
	const path = agentWorkbenchPath(device);
	return createFileOwner('agent-workbench-records', [path, `${path}.backup`], {
		busy,
		quiesce: () => {
			layouts.holdEdits?.();
			spaces.quiesceWrites();
		},
		drain: async () => {
			await layouts.drainEdits?.();
			await spaces.drainWrites();
		},
		reload: async () => {
			await spaces.reloadFromDisk();
			layouts.reloadFromSpaces?.();
		},
		resume: () => {
			spaces.resumeWrites();
			layouts.resumeEdits?.();
		},
	});
}

/** Owns no file: it only lists running terminals/agents so the operation returns BUSY instead of stopping them. */
export function runningWorkOwner(running: () => readonly string[]): RecoveryOwner {
	return {
		id: 'agent-running-work',
		owns: () => false,
		preflight: async () => ({ busy: running() }),
		quiesce: async () => {},
		drain: async () => {},
		adopt: async () => {},
		release: async () => {},
	};
}
