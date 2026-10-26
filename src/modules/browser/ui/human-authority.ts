import type { BrowserWorkspace, HumanPageRequest } from '../api';

export function captureHumanPage(api: BrowserWorkspace, scope: HumanPageRequest) {
	const space = api.getState().spaces.find((item) => item.id === scope.spaceId);
	const page = space?.pages.find((item) => item.id === scope.pageId);
	const lease = space?.control.lease;
	if (
		space?.control.mode !== 'human' ||
		!space.runtimeId ||
		!page ||
		page.status !== 'open' ||
		lease?.leaseId !== scope.leaseId ||
		lease.epoch !== scope.epoch ||
		(lease.viewerId ?? lease.controllerId) !== scope.viewerId
	)
		return;
	return { runtimeId: space.runtimeId, documentId: page.documentId };
}

export function sameHumanPage(
	api: BrowserWorkspace,
	before: HumanPageRequest,
	after: HumanPageRequest | undefined,
	page: { runtimeId: string; documentId: string },
): boolean {
	if (
		!after ||
		before.spaceId !== after.spaceId ||
		before.pageId !== after.pageId ||
		before.viewerId !== after.viewerId ||
		before.leaseId !== after.leaseId ||
		before.epoch !== after.epoch
	)
		return false;
	const current = captureHumanPage(api, after);
	return current?.runtimeId === page.runtimeId && current.documentId === page.documentId;
}
