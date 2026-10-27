import type { PageCreate } from '../../../../app/contracts/workbench-host';
import { ReactSurface } from '../../../../ui/react/surface';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { t } from '../../../../shared/i18n';
import { createElement } from 'react';
import type { BotAccessHost } from './AccessPage';
import { AccessPage } from './AccessPage';

export class AccessSurface extends ReactSurface {
  constructor(context: NativeSurfaceContext, private readonly host: BotAccessHost) { super(context); }
  getViewType(): string { return 'huhu-bot-access'; }
  getDisplayText(): string { return t('huhubot.access.title'); }
  getIcon(): string { return 'shield-check'; }
  protected renderContent() { return createElement(AccessPage, { host: this.host }); }
}
export const createAccessPage = (host: BotAccessHost): PageCreate => async (context, target, _state, signal) => {
  if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
  const surface = new AccessSurface(context, host);
  return { surface, getTarget: () => target, navigate: async () => {} };
};
