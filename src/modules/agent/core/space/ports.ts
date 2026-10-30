import type {
	DirectoryGrant, ExternalDirectoryChoice, ResolvedDirectory, SpaceChoice,
	SpaceDirectory, VaultBinding, VaultDirectoryBinding,
} from './model';

export interface DirectoryPort {
	inspectVault(): Promise<VaultBinding>;
	assertVault(expected: VaultBinding): Promise<void>;
	bindVaultDirectory(vault: VaultBinding, relativePath: string): Promise<VaultDirectoryBinding>;
	chooseExternalDirectory(vault: VaultBinding, signal?: AbortSignal): Promise<ExternalDirectoryChoice | undefined>;
	resolveDirectory(vault: VaultBinding, directory: SpaceDirectory, grant: DirectoryGrant | undefined): Promise<ResolvedDirectory>;
	/** The real spelling of an existing absolute path (symlinks, Windows 8.3 short names), else the path unchanged. */
	canonicalPath?(selectedPath: string): Promise<string>;
}

export interface WriterLease {
	readonly instanceId: string;
	readonly port: number;
	readonly lost: AbortSignal;
	assertHeld(): Promise<void>;
	close(): Promise<void>;
}

export interface WriterOwnerPort {
	acquire(vault: VaultBinding, instanceId: string): Promise<WriterLease>;
}

export type SpaceChooser = (request: {
	readonly choices: readonly SpaceChoice[];
	readonly signal?: AbortSignal;
}) => Promise<string | undefined>;
