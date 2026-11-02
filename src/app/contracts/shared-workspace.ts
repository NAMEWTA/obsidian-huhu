/** Browser tab facts persisted by the app-owned v2 workspace writer. */
export interface SharedBrowserTab {
	id: string;
	pageId: string;
	title: string;
	url: string;
	profileId: string;
	zoom: number;
	createdAt: number;
	faviconUrl?: string;
}

export interface SharedBrowserPort {
	open(tab: SharedBrowserTab, options?: { reuse?: boolean }): Promise<string>;
	close(pageId: string): Promise<void>;
	list(): SharedBrowserTab[];
	activate(pageId: string): void;
	update(
		pageId: string,
		state: Pick<SharedBrowserTab, 'title' | 'url' | 'profileId' | 'zoom'> & { faviconUrl?: string },
	): void;
	subscribe(listener: () => void): () => void;
}

/** App lifetime owner shared by Browser and Agent; it is disposed only at app unload. */
export interface SharedWorkspaceOwner {
	readonly ready: Promise<void>;
	readonly spaces: unknown;
	readonly workspaceStore: unknown;
	readonly browser: SharedBrowserPort;
	setSpaceChooser?(chooser: unknown): void;
	/** The Space records + layouts as one recovery owner; Browser writes pass through it, so they are gated too. */
	readonly recoveryOwner?: import('../../shared/storage/recovery-contracts').RecoveryOwner;
	dispose(): Promise<void>;
}
