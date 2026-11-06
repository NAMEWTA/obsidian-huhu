import { Sparkles } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { useT } from '../ui/react/hooks';
import { HuhuProviders } from '../ui/react/providers';
import { DesignScope } from '../ui/react/design-scope';
import { Button } from '../ui/components/button';

function IntroContent({ close }: { close: () => void }) {
	const t = useT();
	return (
		<DesignScope className="space-y-5 rounded-xl bg-[var(--hu-surface)] p-5 text-[var(--hu-fg)]">
			<div
				aria-hidden="true"
				className="flex size-[52px] items-center justify-center rounded-xl bg-[var(--hu-accent-soft)] text-[var(--hu-accent)]"
			>
				<Sparkles className="size-6" />
			</div>
			<h2 className="m-0 text-2xl font-semibold tracking-tight">{t('intro.title')}</h2>
			<p className="m-0 text-base leading-relaxed text-[var(--hu-fg-2)]">{t('intro.body')}</p>
			<Button size="lg" onClick={close}>
				{t('intro.ok')}
			</Button>
		</DesignScope>
	);
}

/** Content is loaded by the native modal owner; it never participates in app startup. */
export function mountIntroContent(container: HTMLElement, close: () => void): () => void {
	const root = createRoot(container);
	root.render(
		<HuhuProviders ownerDocument={container.ownerDocument}>
			<IntroContent close={close} />
		</HuhuProviders>,
	);
	return () => root.unmount();
}
