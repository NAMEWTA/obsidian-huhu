import type { OperatingSystem } from '../../../../shared/platform';

export type VaultSessionAgent = 'claude-code' | 'codex' | 'gemini' | 'opencode' | 'pi' | 'grok';

/** The admission state is persisted with a summary so a bad source never looks like an empty log. */
export type HistorySourceStatus = 'available' | 'missing' | 'changed' | 'unsupported' | 'permission-denied' | 'unknown';

export interface HistoryProvenance {
	/** Stable source locator. It is never inferred from the current working directory. */
	sourceRef: string;
	provider: VaultSessionAgent;
	accountKey: string;
	status: HistorySourceStatus;
	/** A source may be in the Vault while still not being assigned to a Space. */
	spaceId?: string;
}

export interface VaultSession {
	transcriptPath?: string;
	agentId: VaultSessionAgent;
	title: string;
	cwd: string;
	sessionId: string;
	modifiedAtMs: number;
	env: Record<string, string>;
	provenance?: HistoryProvenance;
}

export interface SessionIo {
	platform: OperatingSystem;
	readDir(dir: string): Promise<string[]>;
	stat(file: string): Promise<{ isDirectory: boolean; isFile: boolean; mtimeMs: number; size: number } | null>;
	readFile(file: string, maxBytes: number): Promise<string | null>;
}

export interface VaultScanRequest {
	limit?: number;
	key: string;
	vaultPath: string;
	io: SessionIo;
	claudeConfigDirs: readonly string[];
	codexHomes: readonly string[];
	geminiConfigDir?: string;
}
