import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { BrowserWorkspace, HumanPageRequest, BrowserObservation } from '../api';
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
	api: BrowserWorkspace;
	authority: () => HumanPageRequest | undefined;
	disabled: boolean;
	report: (reason: unknown) => void;
}) {
	const t = useT();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [targets, setTargets] = useState<Array<{ id: string; label: string }>>([]);
	const [target, setTarget] = useState('');
	const [sent, setSent] = useState(false), [cancelling, setCancelling] = useState(false);
	const [observation, setObservation] = useState<BrowserObservation>(), [ref, setRef] = useState('');
	const operation = useRef<AbortController | undefined>(undefined);
	const generation = useRef(0),
		mounted = useRef(false);
	useEffect(() => {
		mounted.current = true;
		generation.current++;
		return () => {
			mounted.current = false; operation.current?.abort();
		};
	}, [authority]);
	const choose = async () => {
		const scope = authority(), page = scope && captureHumanPage(api, scope), current = generation.current;
		if (!scope || !page) return;
		operation.current?.abort(); const abort = new AbortController(); operation.current = abort;
		setPending(true); setCancelling(false); setSent(false); setTargets([]); setTarget(''); setRef(''); setObservation(undefined); setOpen(true);
		try {
			const items = await api.listMaterialTargets();
			if (abort.signal.aborted || !mounted.current || current !== generation.current) return;
			if (!sameHumanPage(api, scope, authority(), page)) throw new Error('control_revoked');
			setTargets(items);
			if (items.length) {
				const observed = await api.observeMaterial(scope);
				if (abort.signal.aborted || !mounted.current || current !== generation.current) return;
				if (!sameHumanPage(api, scope, authority(), page)) throw new Error('observation_stale');
				setObservation(observed);
			}
		} catch (reason) { if (mounted.current && current === generation.current) report(reason); }
		finally { if (mounted.current && current === generation.current) { setPending(false); if (abort.signal.aborted) setOpen(false); } }
	};
	const cancel = () => { operation.current?.abort(); if (pending) setCancelling(true); else setOpen(false); };
	const send = async () => {
		const scope = authority(), page = scope && captureHumanPage(api, scope), current = generation.current;
		if (!scope || !page || !target || !observation || !ref) return;
		const abort = new AbortController(); operation.current?.abort(); operation.current = abort;
		setPending(true); setCancelling(false);
		try {
			if (!sameHumanPage(api, scope, authority(), page)) throw new Error('control_revoked');
			await api.sendMaterial({ ...scope, targetId: target, observationId: observation.id, ref, signal: abort.signal });
			if (mounted.current && current === generation.current) { setOpen(false); setSent(true); }
		} catch (reason) {
			if (mounted.current && current === generation.current) { if (abort.signal.aborted && !(reason instanceof Error && reason.message === 'material_delivery_unknown')) setOpen(false); else report(reason); }
		} finally { if (mounted.current && current === generation.current) setPending(false); }
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
					if (!value) cancel(); else setOpen(true);
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
					{observation && <div className="space-y-2">
						<Select value={ref} onValueChange={setRef} disabled={pending}>
							<SelectTrigger aria-label={t('browser.v2.materialElement')}><SelectValue placeholder={t('browser.v2.materialElement')} /></SelectTrigger>
							<SelectContent>{observation.nodes.filter(node => node.visible).map(node => <SelectItem key={node.ref} value={node.ref}>{`${node.role}: ${node.name} (${node.frameId})`}</SelectItem>)}</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">{t('browser.v2.materialSnapshotHelp')}</p>
					</div>}
					{cancelling && <p role="status">{t('browser.v2.materialCancelling')}</p>}
					<DialogFooter>
						<Button variant="outline" disabled={cancelling} onClick={cancel}>
							{t('browser.v2.cancel')}
						</Button>
						<Button disabled={pending || disabled || !target || !ref} onClick={() => void send()}>
							{t('browser.v2.sendMaterial')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
