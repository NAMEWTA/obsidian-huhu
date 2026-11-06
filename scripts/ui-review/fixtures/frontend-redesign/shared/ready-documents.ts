/** Wait for the final srcdoc document, never the iframe's initial about:blank document. */
export async function readyDocuments(main: Document, timeoutMs = 10000): Promise<{ main: Document; second: Document }> {
	const win = main.defaultView;
	if (!win) throw new Error('Fixture main window unavailable');
	await new Promise<void>((resolve, reject) => {
		const finish = (error?: Error) => {
			win.clearTimeout(timer);
			main.removeEventListener('DOMContentLoaded', check);
			main.removeEventListener('readystatechange', check);
			error ? reject(error) : resolve();
		};
		const check = () => {
			if (main.readyState !== 'loading' && main.body) finish();
		};
		const timer = win.setTimeout(() => finish(new Error('Timed out: fixture main document')), timeoutMs);
		main.addEventListener('DOMContentLoaded', check);
		main.addEventListener('readystatechange', check);
		check();
	});
	const frame = main.querySelector('iframe');
	if (!frame) throw new Error('Fixture iframe missing after main readiness');
	const second = await new Promise<Document>((resolve, reject) => {
		const finish = (doc?: Document) => {
			win.clearTimeout(timer);
			frame.removeEventListener('load', check);
			doc ? resolve(doc) : reject(new Error('Timed out: fixture srcdoc document'));
		};
		const check = () => {
			const current = frame.contentDocument;
			if (current?.URL === 'about:srcdoc' && current.readyState === 'complete' && current.body) finish(current);
		};
		const timer = win.setTimeout(() => finish(), timeoutMs);
		frame.addEventListener('load', check);
		check();
	});
	return { main, second };
}
