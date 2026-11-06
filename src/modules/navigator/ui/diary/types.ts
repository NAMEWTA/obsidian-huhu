import type { NavigatorPeriodicService } from '../../api';

export interface DiaryPort {
	/** Page adapter filters preview-only notifications while retaining file and periodic-identity changes. */
	changes?: (listener: () => void) => () => void;
	periodic: Pick<NavigatorPeriodicService, 'list' | 'inspect' | 'open' | 'subscribe'> & Partial<Pick<NavigatorPeriodicService, 'weekStart' | 'display'>>;
	/** Read the current periodic file; failures stay visible in the reader. */
	read(path: string): Promise<string>;
}
export interface TurnEngine {
	turn(host: HTMLElement, pages: readonly HTMLElement[], backwards: boolean, signal: AbortSignal): Promise<void>;
}

export interface DiaryPagePort extends DiaryPort {
	periodic: DiaryPort['periodic'] & Pick<NavigatorPeriodicService, 'prepare'>;
}
