export interface PhysicalDirectory {
	readonly canonicalPath: string;
	readonly dev: string;
	readonly ino: string;
}

export interface VaultBinding {
	readonly vaultId: string;
	readonly deviceId: string;
	readonly rootPath: string;
	readonly root: PhysicalDirectory;
}

export interface VaultDirectoryBinding {
	readonly kind: 'vault';
	readonly relativePath: string;
	readonly target: PhysicalDirectory;
}

export interface ExternalDirectoryChoice {
	readonly selectedPath: string;
	readonly target: PhysicalDirectory;
	readonly vaultRoot: PhysicalDirectory;
	readonly deviceId: string;
}

export interface DirectoryGrant extends ExternalDirectoryChoice {
	readonly id: string;
	readonly createdAt: number;
	readonly revokedAt?: number;
}

export type SpaceDirectory = VaultDirectoryBinding | { readonly kind: 'external'; readonly grantId: string };

export interface SpaceRecord {
	readonly id: string;
	readonly name: string;
	readonly directory: SpaceDirectory;
	readonly archived: boolean;
	readonly createdAt: number;
	readonly updatedAt: number;
}

export interface ResolvedDirectory {
	readonly cwd: string;
}

export interface SpaceChoice {
	readonly id: string;
	readonly name: string;
	readonly directoryLabel: string;
}
