import type { ReactNode } from 'react';
import { HuhuProviders } from './providers';
export function TestProviders({
	children,
	ownerDocument = document,
}: {
	children: ReactNode;
	ownerDocument?: Document;
}) {
	return (
		<HuhuProviders ownerDocument={ownerDocument}>
			<div className="huhu-ui">{children}</div>
		</HuhuProviders>
	);
}
