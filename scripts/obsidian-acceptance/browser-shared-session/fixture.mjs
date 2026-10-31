import { createServer } from 'node:http';

// Synthetic data only. No user account, real credential, filesystem or network API.
export const fixtureHtml = `<!doctype html><html lang="zh"><meta charset="utf-8">
<title>HUHU Session Space P0</title>
<style>body{font:18px system-ui;padding:24px}input,button{font:inherit;margin:12px;padding:12px}</style>
<h1>共享页面门禁 / Shared page gate</h1>
<label>草稿 <input id="draft" aria-label="Fixture draft"></label>
<label>密码哨兵 <input type="password" value="SYNTHETIC_PASSWORD_DO_NOT_LOG"></label>
<button id="increment">Increment fixture counter</button><output id="count">0</output>
<script>
window.fixtureMemory = 'same-live-document';
document.getElementById('increment').addEventListener('click', () => {
 const output = document.getElementById('count'); output.textContent = String(Number(output.textContent) + 1);
});
async function database() {
 return new Promise((resolve, reject) => {
  const request = indexedDB.open('huhu-p0', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('sentinels');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error('fixture_db_open_failed'));
 });
}
async function stored(write) {
 const db = await database();
 try {
  return await new Promise((resolve, reject) => {
   const transaction = db.transaction('sentinels', write ? 'readwrite' : 'readonly');
   const store = transaction.objectStore('sentinels');
   const request = write ? store.put('synthetic-idb', 'key') : store.get('key');
   transaction.oncomplete = () => resolve(write ? 'synthetic-idb' : request.result ?? null);
   transaction.onerror = transaction.onabort = () => reject(new Error('fixture_db_transaction_failed'));
  });
 } finally { db.close(); }
}
window.huhuFixture = {
 async seed() {
  window.fixtureMemory = 'modified-live-document';
  document.cookie = 'huhu_p0=synthetic-cookie; Max-Age=3600; SameSite=Lax; Path=/';
  localStorage.setItem('huhu-p0', 'synthetic-local');
  document.getElementById('draft').value = 'synthetic-human-draft';
  return stored(true);
 },
 async read() {
  return {
   cookie: document.cookie.split('; ').includes('huhu_p0=synthetic-cookie'),
   local: localStorage.getItem('huhu-p0'), idb: await stored(false),
   draft: document.getElementById('draft').value,
   count: Number(document.getElementById('count').textContent), memory: window.fixtureMemory,
   nodeExposed: typeof require !== 'undefined', processExposed: typeof process !== 'undefined'
  };
 }
};
</script></html>`;

export async function startFixture() {
	let expectedHost;
	const server = createServer((request, response) => {
		if (!expectedHost || request.headers.host !== expectedHost ||
			(request.headers.origin && request.headers.origin !== `http://${expectedHost}`)) {
			response.writeHead(403); response.end(); return;
		}
		if (request.method !== 'GET' || request.url !== '/') {
			response.writeHead(404); response.end(); return;
		}
		response.writeHead(200, {
			'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
			'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
			'X-Content-Type-Options': 'nosniff',
		});
		response.end(fixtureHtml);
	});
	server.requestTimeout = 5000;
	server.headersTimeout = 5000;
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	expectedHost = `127.0.0.1:${server.address().port}`;
	return {
		origin: `http://${expectedHost}`,
		close: () => new Promise((resolve, reject) => {
			server.closeAllConnections();
			server.close(error => error ? reject(error) : resolve());
		}),
	};
}
