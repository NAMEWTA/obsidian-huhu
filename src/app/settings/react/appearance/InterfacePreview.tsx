import { useLayoutEffect, useRef, useState } from 'react';
import { applyInterfaceTheme } from '../../../../theme/runtime';
import type { ThemeSettings } from '../../../../theme/settings';
import { PortalContainerContext } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import { Button } from '../../../../ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../ui/components/popover';
import { DateField, type CalendarDate } from '../../../../ui/components/huhu/date';

/** This root owns its sample and portals. Preview controls have no settings handle. */
export function InterfacePreview({ settings }: { settings: ThemeSettings }) {
	const t = useT();
	const root = useRef<HTMLDivElement>(null);
	const [portal, setPortal] = useState<HTMLDivElement | null>(null);
	const [date, setDate] = useState<CalendarDate | null>(null);
	useLayoutEffect(() => {
		if (root.current) applyInterfaceTheme(root.current, settings);
	}, [settings]);
	return (
		<div
			ref={root}
			data-interface-preview
			className="huhu-ui space-y-4 rounded-[var(--hu-radius-lg)] border border-[var(--hu-line)] bg-[var(--hu-canvas)] p-4 text-[var(--hu-fg)]"
		>
			<h3 className="m-0 text-lg font-semibold">{t('appearance.sample.heading')}</h3>
			<p className="text-sm text-[var(--hu-fg-2)]">{t('appearance.sample.quote')}</p>
			{portal && (
				<PortalContainerContext.Provider value={portal}>
					<div className="flex flex-wrap gap-3">
						<Popover>
							<PopoverTrigger asChild>
								<Button>{t('appearance.previewAction')}</Button>
							</PopoverTrigger>
							<PopoverContent>
								<p className="text-sm">{t('appearance.sample.subheading')}</p>
							</PopoverContent>
						</Popover>
						<DateField label={t('appearance.previewDate')} value={date} onChange={setDate} />
					</div>
				</PortalContainerContext.Provider>
			)}
			<div ref={setPortal} className="huhu-ui huhu-portal-root" />
		</div>
	);
}
