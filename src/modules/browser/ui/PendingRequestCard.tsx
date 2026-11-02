import { useState } from 'react';
import type { BrowserWorkspace, HumanPageRequest, PendingHumanRequest } from '../api';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { useT } from '../../../ui/react/hooks';
import { captureHumanPage, sameHumanPage } from './human-authority';

export function PendingRequestCard({
	api,
	request,
	authority,
	report,
}: {
	api: BrowserWorkspace;
	request: PendingHumanRequest;
	authority: () => HumanPageRequest | undefined;
	report: (reason: unknown) => void;
}) {
	const t = useT();
	const [reply, setReply] = useState('');
	const [pending, setPending] = useState(false);
	const scope = authority();
	const canAnswer =
		request.status === 'pending' &&
		request.kind !== 'permission' &&
		request.kind !== 'http-auth' &&
		!!scope &&
		scope.epoch === request.epoch &&
		scope.spaceId === request.spaceId &&
		scope.pageId === request.pageId;
	const answer = async (accept: boolean) => {
		const captured = authority();
		const page = captured && captureHumanPage(api, captured);
		if (!canAnswer || !captured || !page || captured.epoch !== request.epoch) return;
		setPending(true);
		try {
			const file =
				request.kind === 'file-chooser' && accept
					? await api.chooseUpload(captured.spaceId, 'human')
					: undefined;
			const latest = api.getState().requests.find((item) => item.id === request.id);
			if (
				!sameHumanPage(api, captured, authority(), page) ||
				latest?.revision !== request.revision ||
				latest.epoch !== captured.epoch ||
				latest.status !== 'pending'
			)
				throw new Error('browser_stale_request');
			await api.pageAction({
				...captured,
				command:
					request.kind === 'dialog'
						? {
								kind: 'dialog',
								requestId: request.id,
								revision: request.revision,
								accept,
								...(accept && reply ? { text: reply } : {}),
							}
						: {
								kind: 'chooser',
								requestId: request.id,
								revision: request.revision,
								fileIds: file ? [file.id] : [],
							},
			});
		} catch (reason) {
			report(reason);
		} finally {
			setPending(false);
		}
	};
	return (
		<section
			className="space-y-2 border-b border-border bg-muted/30 p-3 text-sm"
			aria-label={t(request.kind === 'dialog' ? 'browser.v2.dialogTitle' : 'browser.v2.chooserTitle')}
		>
			<p className="break-words font-medium">
				{t(
					request.kind === 'http-auth'
						? 'browser.v2.authDenied'
						: request.kind === 'permission'
							? 'browser.v2.permissionDenied'
							: request.kind === 'dialog'
								? 'browser.v2.dialogTitle'
								: 'browser.v2.chooserTitle',
				)}
			</p>
			{request.message && (
				<p className="max-h-28 overflow-auto whitespace-pre-wrap break-words">{request.message}</p>
			)}
			{request.status !== 'pending' ? (
				<p>{t('browser.v2.requestDenied')}</p>
			) : request.kind === 'dialog' || request.kind === 'file-chooser' ? (
				<>
					{!canAnswer && <p className="text-muted-foreground">{t('browser.v2.requestWaiting')}</p>}
					{request.kind === 'dialog' && (
						<Input
							aria-label={t('browser.v2.dialogReply')}
							value={reply}
							maxLength={4096}
							disabled={!canAnswer || pending}
							onChange={(event) => setReply(event.target.value)}
						/>
					)}
					<div className="flex flex-wrap gap-2">
						<Button size="sm" disabled={!canAnswer || pending} onClick={() => void answer(true)}>
							{t(request.kind === 'dialog' ? 'browser.v2.accept' : 'browser.v2.chooseFiles')}
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={!canAnswer || pending}
							onClick={() => void answer(false)}
						>
							{t('browser.v2.dismiss')}
						</Button>
					</div>
				</>
			) : null}
		</section>
	);
}
