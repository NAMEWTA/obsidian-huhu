import type { TurnEngine } from './types';

/** The embedded engine has no idle loop; this adapter owns the finite animation and its cancellation. */
export async function loadTurnEngine(): Promise<TurnEngine> {
	const { PageFlip } = await import('./page-flip.mjs');
	return {
		turn(host, pages, backwards, signal) {
			const win = host.ownerDocument.defaultView;
			if (!win || signal.aborted || !pages.length) return Promise.resolve();
			const block = host.ownerDocument.createElement('div');
			block.className = 'h-full w-full';
			host.append(block);
			const width = Math.max(240, host.clientWidth / 2), height = Math.max(440, host.clientHeight);
			const book = new PageFlip(block, { width, height, size: 'stretch', minWidth: 120, maxWidth: 1600, minHeight: 200, maxHeight: 2000, usePortrait: false, useMouseEvents: false, showPageCorners: false, drawShadow: false, flippingTime: 240, autoSize: false });
			return new Promise<void>((resolve, reject) => {
				let frame: number | undefined, closed = false;
				const finish = (error?: unknown) => {
					if (closed) return;
					closed = true;
					if (frame !== undefined) win.cancelAnimationFrame(frame);
					signal.removeEventListener('abort', abort);
					try { book.destroy(); } catch (cleanupError) { error ??= cleanupError; } finally { block.remove(); }
					if (error) reject(error instanceof Error ? error : new Error('Page engine failed')); else resolve();
				};
				const abort = () => finish();
				signal.addEventListener('abort', abort, { once: true });
				try {
					const leaves = [...pages, ...pages].map((page) => page.cloneNode(true) as HTMLElement);
					book.loadFromHTML(leaves);
					const renderer = book.getRender();
					if (!renderer) throw new Error('Page engine renderer unavailable');
					renderer.render(win.performance.now());
					if (backwards) { book.turnToPage(2); book.flipPrev(); } else book.flipNext();
					const started = win.performance.now();
					const tick = (time: number) => {
						if (closed) return;
						try {
							renderer.render(time);
							if (book.getState() === 'read' || time - started >= 320) { renderer.finishAnimation(); finish(); }
							else frame = win.requestAnimationFrame(tick);
						} catch (error) { finish(error); }
					};
					frame = win.requestAnimationFrame(tick);
				} catch (error) { finish(error); }
			});
		},
	};
}
