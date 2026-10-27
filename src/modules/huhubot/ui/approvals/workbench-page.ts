import type { PageCreate } from '../../../../app/contracts/workbench-host';
import { ReactSurface } from '../../../../ui/react/surface';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { t } from '../../../../shared/i18n';
import { createElement } from 'react';
import type { BotApprovalHost } from './ApprovalsPage';
import { ApprovalsPage } from './ApprovalsPage';

export class ApprovalsSurface extends ReactSurface {
  constructor(context: NativeSurfaceContext, private readonly host: BotApprovalHost) { super(context); }
  getViewType(): string { return 'huhu-bot-approvals'; }
  getDisplayText(): string { return t('huhubot.access.title'); }
  getIcon(): string { return 'clipboard-check'; }
  protected renderContent() { return createElement(ApprovalsPage, { host: this.host }); }
}
export const createApprovalsPage = (host: BotApprovalHost): PageCreate => async (context, target, _state, signal) => {
  if (signal.aborted) throw new DOMException('Canceled', 'AbortError');
  const surface = new ApprovalsSurface(context, host);
  return { surface, getTarget: () => target, navigate: async () => {} };
};
