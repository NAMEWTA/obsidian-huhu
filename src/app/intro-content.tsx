import { createRoot } from 'react-dom/client';
import { useT } from '../ui/react/hooks';
import { HuhuProviders } from '../ui/react/providers';
import { DesignScope } from '../ui/react/design-scope';
import { Button } from '../ui/components/button';

function IntroContent({ close }: { close: () => void }) {
	const t = useT();
	return (
		<DesignScope className="space-y-4">
			<h2 className="text-xl font-semibold">{t('intro.title')}</h2>
			<p className="text-sm">{t('intro.body')}</p>
			<Button onClick={close}>{t('intro.ok')}</Button>
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
