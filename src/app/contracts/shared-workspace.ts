/** App lifetime owner of the Agent Space records and workspace layouts; it is disposed only at app unload. */
export interface SharedWorkspaceOwner {
	readonly ready: Promise<void>;
	readonly spaces: unknown;
	readonly workspaceStore: unknown;
	setSpaceChooser?(chooser: unknown): void;
	/** The Space records + layouts as one recovery owner, so their writes are gated together. */
	readonly recoveryOwner?: import('../../shared/storage/recovery-contracts').RecoveryOwner;
	dispose(): Promise<void>;
}
