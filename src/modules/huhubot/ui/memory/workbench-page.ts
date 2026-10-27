import { createElement } from 'react';
import type { PageCreate } from '../../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { ReactSurface } from '../../../../ui/react/surface';
import { t } from '../../../../shared/i18n';
import type { MemoryWorkbenchHost } from './MemoryWorkbenchPage';
import { MemoryWorkbenchPage } from './MemoryWorkbenchPage';

export class MemoryPresentation extends ReactSurface {
  constructor(context: NativeSurfaceContext, private readonly host: MemoryWorkbenchHost) { super(context); }
  getViewType(): string { return 'huhu-bot-memory'; }
  getDisplayText(): string { return t('huhubot.memory.title'); }
  getIcon(): string { return 'brain'; }
  override onOpen(): Promise<void> {
    void super.onOpen();
    this.rerender();
    return Promise.resolve();
  }
  protected renderContent() { return createElement(MemoryWorkbenchPage, { host: this.host }); }
}

export const createMemoryPage = (host: MemoryWorkbenchHost): PageCreate => async (context, target, _state, signal) => {
  if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
  const surface = new MemoryPresentation(context, host);
  return { surface, getTarget: () => target, navigate: async () => {} };
};
