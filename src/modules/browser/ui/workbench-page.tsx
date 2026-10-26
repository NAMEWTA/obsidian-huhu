import type { PageCreate } from '../../../app/contracts/workbench-host';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import type { BrowserWorkspace as BrowserWorkspaceApi } from '../api';
import { ReactSurface } from '../../../ui/react/surface';
import { t } from '../../../shared/i18n';
import { BrowserWorkspace, type BrowserWorkspaceSelection } from './BrowserWorkspace';

export const createBrowserPage =
	(api: BrowserWorkspaceApi): PageCreate =>
	async (context, target, state, signal) => {
		signal.throwIfAborted();
		class BrowserPresentation extends ReactSurface {
			private navigationRevision = 0;
			private selection: BrowserWorkspaceSelection = {
				spaceId: target.resourceId ?? (typeof state.spaceId === 'string' ? state.spaceId : undefined),
				pageId: target.focusId ?? (typeof state.pageId === 'string' ? state.pageId : undefined),
			};
			getViewType() {
				return 'huhu-browser-surface';
			}
			getDisplayText() {
				return t('browser.title');
			}
			getIcon() {
				return 'globe';
			}
			override getState() {
				return { ...this.selection };
			}
			getTarget(): WorkbenchTarget {
				return { feature: 'browser', resourceId: this.selection.spaceId, focusId: this.selection.pageId };
			}
			select = (selection: BrowserWorkspaceSelection) => {
				this.selection = selection;
				this.context.changed?.();
				this.rerender();
			};
			navigate(next: WorkbenchTarget) {
				if (next.resourceId || next.focusId) this.navigationRevision++;
				const spaceId = next.resourceId ?? this.selection.spaceId;
				this.select({
					spaceId,
					pageId: next.focusId ?? (spaceId === this.selection.spaceId ? this.selection.pageId : undefined),
				});
			}
			restore(next: Record<string, unknown>) {
				if (typeof next.spaceId === 'string' || typeof next.pageId === 'string') this.navigationRevision++;
				const spaceId = typeof next.spaceId === 'string' ? next.spaceId : this.selection.spaceId;
				this.select({
					spaceId,
					pageId:
						typeof next.pageId === 'string'
							? next.pageId
							: spaceId === this.selection.spaceId
								? this.selection.pageId
								: undefined,
				});
			}
			protected renderContent() {
				return (
					<BrowserWorkspace
						api={api}
						selection={this.selection}
						onSelect={this.select}
						navigationRevision={this.navigationRevision}
					/>
				);
			}
		}
		const surface = new BrowserPresentation(context);
		return {
			surface,
			getTarget: () => surface.getTarget(),
			getState: () => surface.getState(),
			navigate: async (next, abort) => {
				if (!abort.aborted) surface.navigate(next);
			},
			restore: async (next) => {
				surface.restore(next);
			},
		};
	};
