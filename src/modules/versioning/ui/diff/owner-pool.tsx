import { useCallback, useRef, useState, type ReactNode } from 'react';
import './theme';
import { WorkerPoolManager } from '@pierre/diffs/worker';
import { WorkerPoolContext } from '@pierre/diffs/react';
import { ensureDiffsOwnerDocument } from 'virtual:diffs-owner-document';
import { useOwnerDocument, useVisible } from '../../../../ui/react/contexts';
import { createHighlightWorker } from './workers';

/** No library singleton: each mounted owner has its own pool and close/unmount lifetime. */
export function DiffOwner({ children }: { children: ReactNode }) {
	const document = useOwnerDocument();
	const visible = useVisible();
	const generation = useRef(0);
	const [state, setState] = useState<{ document: Document; pool?: WorkerPoolManager }>();
	const mount = useCallback(
		(node: HTMLDivElement | null) => {
			if (!node) return;
			const token = ++generation.current;
			const owner = document.defaultView;
			ensureDiffsOwnerDocument(document);
			if (!visible || !owner || !('Worker' in owner)) {
				setState({ document });
				return;
			}
			const manager = new WorkerPoolManager(
				{
					workerFactory: () => createHighlightWorker(owner),
					poolSize: 2,
					onWorkerError: (event) => event.preventDefault(),
				},
				{ theme: 'huhu', preferredHighlighter: 'shiki-js' },
			);
			setState({ document, pool: manager });
			void manager.initialize().catch(() => {
				if (generation.current === token) setState({ document });
			});
			const release = () => {
				generation.current++;
				manager.terminate();
			};
			owner.addEventListener('pagehide', release, { once: true });
			return () => {
				release();
				owner.removeEventListener('pagehide', release);
			};
		},
		[document, visible],
	);
	return (
		<div ref={mount} className="contents">
			{state?.document === document ? <WorkerPoolContext value={state.pool}>{children}</WorkerPoolContext> : null}
		</div>
	);
}
