import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { BrowserWorkspaceApi, HumanPageRequest } from '../api';
import { Button } from '../../../ui/components/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '../../../ui/components/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/components/select';
import { useT } from '../../../ui/react/hooks';
import { captureHumanPage, sameHumanPage } from './human-authority';

export function SendMaterialButton({
	api,
	authority,
	disabled,
	report,
}: {
	api: BrowserWorkspaceApi;
	authority(): HumanPageRequest | undefined;
	disabled: boolean;
	report(reason: unknown): void;
}) {
	const t = useT();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [targets, setTargets] = useState<Array<{ id: string; label: string }>>([]);
	const [target, setTarget] = useState('');
	const [sent, setSent] = useState(false);
	const generation = useRef(0);
	useEffect(() => {
		generation.current++;
		return () => {
			generation.current++;
		};
	}, [authority]);
	const choose = async () => {
		const current = generation.current;
		setPending(true);
		setSent(false);
		try {
			const items = await api.listMaterialTargets();
			if (current !== generation.current) return;
			setTargets(items);
			setTarget('');
			setOpen(true);
		} catch (reason) {
			if (current === generation.current) report(reason);
		} finally {
			if (current === generation.current) setPending(false);
		}
	};
	const send = async () => {
		const scope = authority(),
			page = scope && captureHumanPage(api, scope),
			current = generation.current;
		if (!scope || !page || !target) return;
		setPending(true);
		try {
			if (!sameHumanPage(api, scope, authority(), page)) throw new Error('control_revoked');
			await api.sendMaterial({ ...scope, targetId: target });
			if (current === generation.current) {
				setOpen(false);
				setSent(true);
			}
		} catch (reason) {
			if (current === generation.current) report(reason);
		} finally {
			if (current === generation.current) setPending(false);
		}
	};
	return (
		<>
			<Button size="sm" variant="outline" disabled={disabled || pending} onClick={() => void choose()}>
				<Send />
				{t('browser.v2.sendMaterial')}
			</Button>
			{sent && (
				<span role="status" className="text-xs text-muted-foreground">
					{t('browser.v2.materialSent')}
				</span>
			)}
			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (!pending) setOpen(value);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('browser.v2.materialTarget')}</DialogTitle>
						<DialogDescription>{t('browser.v2.materialHelp')}</DialogDescription>
					</DialogHeader>
					{targets.length ? (
						<Select value={target} onValueChange={setTarget}>
							<SelectTrigger aria-label={t('browser.v2.materialTarget')}>
								<SelectValue placeholder={t('browser.v2.materialTarget')} />
							</SelectTrigger>
							<SelectContent>
								{targets.map((item) => (
									<SelectItem key={item.id} value={item.id}>
										{item.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<p>{t('browser.v2.materialEmpty')}</p>
					)}
					<DialogFooter>
						<Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
							{t('browser.v2.cancel')}
						</Button>
						<Button disabled={pending || disabled || !target} onClick={() => void send()}>
							{t('browser.v2.sendMaterial')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
