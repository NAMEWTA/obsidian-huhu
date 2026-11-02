// Native lifecycle adapters, informed by Orca 27b823f (MIT, Lovecast Inc.).
// Hooks are inert outside HUHU and never infer completion from output silence.
import { EVENT_PAYLOAD_SCRIPT } from './event-payload';
import { HOOK_PUBLISHER_SCRIPT } from './hook-spool';
import { editorEmbeddedCodecSource } from '../../../../../shared/native/control-wire-editor-codec.generated';
import { piEditorArgumentGate } from './pi-editor-gate';
export { piEditorArgumentGate };



const transport = `import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir = process.env.HUHU_HOOK_DIR, token = process.env.HUHU_HOOK_TOKEN;
${EVENT_PAYLOAD_SCRIPT}
${HOOK_PUBLISHER_SCRIPT}
function owner() {
 if (!dir || !token) return false;
 try { hookGuard(); } catch { return false; }
 // Legacy nested-provider suppression only. A PID is never source identity or foreground evidence.
 const pid = process.env.HUHU_NATIVE_OWNER;
 if (pid && pid !== String(process.pid)) { try { process.kill(Number(pid), 0); return false; } catch (e) { if (e.code !== 'ESRCH') return false; } }
 process.env.HUHU_NATIVE_OWNER = String(process.pid); return true;
}
function nativeSource(provider) {
 const instance = crypto.randomUUID(); let sequence = 0;
 const send = (event, data, nativeEvent, blockId) => {
  const source = { provider, instance, sequence: ++sequence, event: nativeEvent };
  if (blockId) source.blockId = blockId;
  return post(event, () => eventData(typeof data === 'function' ? data() : data), source);
 };
 Object.defineProperty(send, 'sourceInstance', { value: instance }); return send;
}
function nativeAnswer(parts) {
 let bytes = 0; const chunks = [];
 for (const part of parts || []) {
  if (part.type !== 'text' || part.ignored || typeof part.text !== 'string' || !part.text) continue;
  bytes += Buffer.byteLength(part.text) + (chunks.length ? 1 : 0);
  if (bytes > 2097152) return { huhu_answer_error: 'answerTooLarge' };
  chunks.push(part.text);
 }
 return { last_assistant_message: chunks.join('\\n') };
}

`;
const PI_EDITOR_APP = String.raw`
import { EventEmitter as EditorEventEmitter } from 'node:events';
function createPiEditor(pi, send) {
 if (!process.env.HUHU_EDITOR_CAPABILITY_FILE || globalThis[Symbol.for('huhu.pi.editor.enrolled')]) return;
 globalThis[Symbol.for('huhu.pi.editor.enrolled')] = true;
 const argumentsSupported = ${piEditorArgumentGate.toString()};
 ${editorEmbeddedCodecSource()}
 const codec = HuhuEditorCodec, limits = codec.EDITOR_LIMITS;
 let ctx, tui, Editor, Tui, keys, socket, cap, correlation, authenticated = false, started = false, closed = false;
 let blocking = 0, pasteOpen = false, tail = '', uncertain = false, clipboardPending = false, humanSubmit = false, removeRaw;
 // Factory execution precedes the official main-screen ProcessTerminal.start. Never assume an already-flowing stream has an empty parser.
 if (process.stdin.listenerCount('data') !== 0 || process.stdin.readableFlowing === true) uncertain = true;
 function observedStdin(data) {
  try {
   if (closed) return;
   if (typeof data !== 'string') { uncertain = true; return; }
   scanPaste(tail + data.slice(0, 5)); scanPaste(data);
   tail = data.length >= 5 ? data.slice(-5) : (tail + data).slice(-5);
   if (data.includes('\ufffd')) uncertain = true;
  } catch { uncertain = true; }
 }
 // EventEmitter's public method observes without invoking Readable.on's flow-mode side effect. The original terminal owns decoding and consumption.
 EditorEventEmitter.prototype.prependListener.call(process.stdin, 'data', observedStdin);
 let current, authTimer, inputTimer, writeCount = 0, writeBytes = 0;
 const writes = new Set();
 function stop() {
  if (closed) return; closed = true; authenticated = false;
  if (authTimer) clearTimeout(authTimer); if (inputTimer) clearTimeout(inputTimer);
  removeRaw?.(); removeRaw = undefined;
  EditorEventEmitter.prototype.removeListener.call(process.stdin, 'data', observedStdin);
  if (current) { current.raw = undefined; current = undefined; }
  socket?.destroy(); socket = undefined; cap = undefined;
  for (const item of writes) item.reject(Error('Editor connection closed'));
  writes.clear(); writeCount = 0; writeBytes = 0;
 }
 function metadata(message) {
  if (closed || !socket || writeCount >= limits.operationReceiptStates) return Promise.reject(Error('Editor receipt capacity'));
  const capBytes = 2 * ((message.type === 'editor-auth' ? limits.metadataBytes : limits.receiptBytes) + 5);
  if (writeBytes + capBytes > limits.lifecyclePoolBytes) return Promise.reject(Error('Editor metadata capacity'));
  writeCount++; writeBytes += capBytes;
  let frame;
  try {
   let encoded = codec.encodeEditorMessage(message, 'app-to-native', correlation);
   frame = Buffer.allocUnsafe(encoded.byteLength + 5); frame.writeUInt32BE(encoded.byteLength + 1, 0); frame[4] = 1; frame.set(encoded.body, 5);
   encoded = undefined; message = undefined;
  } catch (error) { writeCount--; writeBytes -= capBytes; return Promise.reject(error); }
  return new Promise((resolve, reject) => {
   const item = { frame, done: false, returned: false, blocked: false, reject };
   writes.add(item);
   const finish = () => {
    if (!item.done || !item.returned || item.blocked || !writes.delete(item)) return;
    item.frame = undefined; writeCount--; writeBytes -= capBytes; resolve();
   };
   try {
    const accepted = socket.write(frame, error => { if (error) { reject(error); stop(); return; } item.done = true; finish(); });
    frame = undefined; item.returned = true; item.blocked = !accepted;
    if (!accepted) socket.once('drain', () => { item.blocked = false; finish(); });
    finish();
   } catch (error) { reject(error); stop(); }
  });
 }
 function outcome(operation, result) {
  if (!current || current !== operation || operation.replied) return;
  operation.replied = true; if (inputTimer) clearTimeout(inputTimer); inputTimer = undefined;
  operation.raw = undefined;
  const resultMessage = { type: 'editor-app-result', version: 1, sid: correlation.sid, editorId: correlation.editorId, op: operation.op, result };
  const settledMessage = { type: 'editor-app-settled', version: 1, sid: correlation.sid, editorId: correlation.editorId, op: operation.op };
  // Body references end before either receipt is encoded. The one operation remains owned through callback + drain.
  void metadata(resultMessage).then(() => metadata(settledMessage)).then(() => { if (current === operation) current = undefined; }, stop);
 }
 const none = reason => ({ state: 'none', effect: 'none', reason });
 function gate(text) {
  if (closed || !authenticated || !ctx || ctx.mode !== 'tui' || !tui || !correlation || correlation.sourceInstance !== send.sourceInstance) return 'source-changed';
  if (blocking || tui.hasOverlay()) return 'blocked';
  if (Object.getPrototypeOf(tui) !== Tui.prototype) return 'unsupported';
  const editor = tui.getFocusedComponent();
  if (!editor || Object.getPrototypeOf(editor) !== Editor.prototype || ctx.ui.getEditorComponent() !== undefined) return 'focus-changed';
  if (editor.disableSubmit || editor.isShowingAutocomplete() || pasteOpen || ['\x1b', '\x1b[', '\x1b[2', '\x1b[20', '\x1b[200', '\x1b[201'].some(prefix => tail.endsWith(prefix)) || uncertain || clipboardPending || humanSubmit) return 'not-ready';
  if (editor.getText() !== '') return 'draft-present';
  const kb = keys();
  if (!kb.matches('\r', 'tui.input.submit')) return 'unsupported';
  for (const id of Object.keys(kb.getResolvedBindings()))
   if (id !== 'tui.input.submit' && (id.startsWith('app.') || id.startsWith('tui.editor.') || id.startsWith('tui.input.')) && kb.matches('\r', id)) return 'unsupported';
  if (!text.trim() || /[\x00-\x08\x0b-\x1f\x7f]/.test(text) || text.endsWith('\\')) return 'invalid';
  return editor;
 }
 function apply(operation) {
  let decoded, paste;
  try {
   if (closed || current !== operation || operation.replied) return;
   if (performance.now() >= operation.end) { outcome(operation, none('expired')); return; }
   codec.editorBodyBytes(operation.raw);
   // Reserve the worst-case UTF16 decoded/trim and paste copies before allocating either string.
   if (operation.total * 4 > limits.appDecodedUtf16Bytes || operation.total * 2 + 24 > limits.appPasteUtf16Bytes || operation.total > limits.appRawBodyBytes) throw Error('body-capacity');
   decoded = new TextDecoder('utf-8', { fatal: true }).decode(operation.raw);
   const editor = gate(decoded);
   if (typeof editor === 'string') { decoded = undefined; outcome(operation, none(editor)); return; }
   paste = '\x1b[200~' + decoded + '\x1b[201~'; decoded = undefined; operation.raw = undefined;
   let pasted = false;
   try {
    // This synchronous pair is the entire effect. No await, onSubmit replacement or direct Session/model call.
    editor.handleInput(paste); pasted = true; paste = undefined;
    editor.handleInput('\r');
    outcome(operation, editor.getText() === '' ? { state: 'adapter-applied', effect: 'completed' } : { state: 'partial', effect: 'partial', reason: 'submit-failed' });
   } catch { paste = undefined; outcome(operation, { state: 'partial', effect: 'partial', reason: pasted ? 'submit-failed' : 'paste-failed' }); }
  } catch { decoded = undefined; paste = undefined; outcome(operation, none('invalid')); }
 }
 function scanPaste(data) {
  let offset = 0;
  while (offset < data.length) {
   const begin = data.indexOf('\x1b[200~', offset), end = data.indexOf('\x1b[201~', offset);
   if (begin < 0 && end < 0) break;
   if (begin >= 0 && (end < 0 || begin < end)) { pasteOpen = true; offset = begin + 6; }
   else { pasteOpen = false; offset = end + 6; }
  }
 }
 function rawInput(data) {
  if (closed || typeof data !== 'string') return;
  const kb = keys(), focused = tui.getFocusedComponent(), owner = !!focused && Object.getPrototypeOf(focused) === Editor.prototype;
  if (data === '\x1b' && tail.endsWith('\x1b')) tail = '';
  if (data.includes('\ufffd')) uncertain = true;
  if (owner && !pasteOpen) {
   if (kb.matches(data, 'app.clipboard.pasteImage') || kb.matches(data, 'app.editor.external') || /^\x1b\[<\d{1,5};/.test(data) || data.startsWith('\x1b[M')) clipboardPending = true;
   if (['tui.editor.jumpForward', 'tui.editor.jumpBackward', 'tui.editor.historyPrevious', 'tui.editor.historyNext', 'tui.editor.cursorUp', 'tui.editor.cursorDown', 'tui.input.tab'].some(id => kb.matches(data, id))) uncertain = true;
   if (kb.matches(data, 'app.clear')) humanSubmit = false;
   if (kb.matches(data, 'tui.input.submit')) humanSubmit = true;
  }
  if (!owner && kb.matches(data, 'app.interrupt')) queueMicrotask(() => {
   if (!closed && tui.getFocusedComponent() && Object.getPrototypeOf(tui.getFocusedComponent()) === Editor.prototype) humanSubmit = false;
  });
 }
 function incoming(frame) {
  if (frame[4] === 1) {
   const message = codec.parseEditorMessage(frame.subarray(5), 'native-to-app', correlation);
   if (message.type === 'editor-authenticated') {
    if (authenticated || message.sourceInstance !== send.sourceInstance || message.profileId !== 'pi-1.4.0-jiti-2.7.0') throw Error('Editor authentication correlation');
    authenticated = true; cap = undefined; clearTimeout(authTimer); authTimer = undefined; return;
   }
   if (!authenticated) throw Error('Unauthenticated editor delivery');
   if (message.type === 'editor-close') { stop(); return; }
   if (message.type === 'editor-cancel') { if (current?.op === message.op && !current.replied) outcome(current, none('cancelled')); return; }
   if (message.type !== 'editor-deliver' || current) throw Error('Editor operation capacity or direction');
   const operation = { op: message.op, total: message.totalBytes, offset: 0, end: performance.now() + message.remainingMs, replied: false, raw: undefined };
   current = operation;
   if (message.sourceInstance !== send.sourceInstance) { outcome(operation, none('source-changed')); return; }
   if (operation.total > limits.bodyBytes || operation.total > limits.appRawBodyBytes) { outcome(operation, none('capacity')); return; }
   operation.raw = Buffer.allocUnsafe(operation.total);
   inputTimer = setTimeout(() => outcome(operation, none('expired')), Math.min(message.remainingMs, limits.inputDeadlineMs));
  } else {
   const part = codec.parseEditorAppPart(frame), operation = current;
   if (!part || !operation || operation.replied || part.op !== operation.op || !operation.raw || operation.offset + part.data.byteLength > operation.total) throw Error('Editor body correlation');
   operation.raw.set(part.data, operation.offset); operation.offset += part.data.byteLength;
   if (operation.offset === operation.total) apply(operation);
  }
 }
 async function start(context, event) {
  if (started || closed || event.reason === 'reload') return;
  started = true; ctx = context;
  if (ctx.mode !== 'tui' || process.platform !== 'linux') { stop(); return; }
  authTimer = setTimeout(stop, limits.handshakeMs);
  try {
   const capPath = process.env[codec.EDITOR_CAPABILITY_ENV];
   if (!capPath || !path.isAbsolute(capPath)) throw Error('Editor capability path');
   hookPath(capPath);
   const info = fs.lstatSync(capPath);
   if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) || info.nlink !== 1 || info.uid !== process.getuid() || info.size > limits.capabilityBytes) throw Error('Editor capability protection');
   const fd = fs.openSync(capPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
   try {
    const currentInfo = fs.fstatSync(fd);
    if (currentInfo.dev !== info.dev || currentInfo.ino !== info.ino || !currentInfo.isFile()) throw Error('Editor capability identity');
    const bytes = Buffer.allocUnsafe(limits.capabilityBytes + 1); let size = 0;
    for (;;) { const n = fs.readSync(fd, bytes, size, bytes.length - size, null); size += n; if (!n || size === bytes.length) break; }
    if (size > limits.capabilityBytes) throw Error('Editor capability capacity');
    cap = codec.parseEditorCapability(bytes.subarray(0, size));
   } finally { fs.closeSync(fd); }
   correlation = { sid: cap.sid, editorId: cap.editorId, identity: cap.identity, sourceInstance: send.sourceInstance };
   const [sdk, terminalSdk, net, url] = await Promise.all([import('@earendil-works/pi-coding-agent'), import('@earendil-works/pi-tui'), import('node:net'), import('node:url')]);
   if (closed) return;
   if (!argumentsSupported(process.argv.slice(2), url.fileURLToPath(import.meta.url), ctx.cwd, path)) throw Error('Unsupported editor arguments');
   Editor = sdk.CustomEditor; Tui = terminalSdk.TuiMainScreen; keys = terminalSdk.getKeybindings;
   if (typeof Editor !== 'function' || typeof Tui !== 'function' || typeof keys !== 'function') throw Error('Unsupported editor SDK');
   ctx.ui.setWidget('huhu-editor-binding', value => { tui = value; return { render: () => [], invalidate() {} }; });
   if (!tui || !tui.getFocusedComponent() || Object.getPrototypeOf(tui.getFocusedComponent()) !== Editor.prototype || ctx.ui.getEditorComponent() !== undefined) throw Error('Not original default editor');
   removeRaw = ctx.ui.onTerminalInput(rawInput);
   socket = net.createConnection(cap.endpoint);
   const storage = Buffer.allocUnsafe(Math.max(limits.lifecycleBytes + 5, limits.fragmentBytes + codec.EDITOR_BINARY.appPartHeaderBytes));
   let received = 0, expected = 4;
   socket.on('data', chunk => {
    try {
     for (let offset = 0; offset < chunk.length && !closed;) {
      const n = Math.min(expected - received, chunk.length - offset); chunk.copy(storage, received, offset, offset + n); offset += n; received += n;
      if (received !== expected) continue;
      if (expected === 4) { expected = storage.readUInt32BE(0) + 4; if (expected < 5 || expected > storage.length) throw Error('Editor frame capacity'); }
      else { incoming(storage.subarray(0, expected)); received = 0; expected = 4; }
     }
    } catch { stop(); }
   });
   socket.on('error', stop); socket.on('close', stop);
   socket.once('connect', () => { void metadata({ type: 'editor-auth', version: 1, sid: cap.sid, editorId: cap.editorId,
    purpose: codec.EDITOR_PURPOSE, token: cap.token, identity: cap.identity, sourceInstance: send.sourceInstance }).catch(stop); });
  } catch { stop(); }
 }
 return { start: (context, event) => { void start(context, event); }, block: value => { blocking = Math.max(0, blocking + (value ? 1 : -1)); },
  inputStarted: () => { humanSubmit = false; }, inputSettled: () => { humanSubmit = false; }, close: stop };
}
`;

export const PI_EXTENSION =
	transport + PI_EDITOR_APP +
	`
export default function(pi) {
 if (!owner()) return;
 const send = nativeSource('pi'), editor = createPiEditor(pi, send); let pending = false, answer, failure = '', block;
 const data = ctx => ({ session_id: ctx.sessionManager?.getSessionId?.(), transcript_path: ctx.sessionManager?.getSessionFile?.(), cwd: ctx.cwd });
 send('AdapterStart', {}, 'registration');
 pi.on('session_start', (event, ctx) => { if (event.reason !== 'reload') send('SessionStart', data(ctx), 'session_start'); editor?.start(ctx, event); });
 pi.on('agent_start', (_event, ctx) => { pending = true; answer = undefined; failure = ''; editor?.inputStarted(); send('UserPromptSubmit', data(ctx), 'agent_start'); });
 pi.on('ui_prompt_start', (_event, ctx) => { editor?.block(true); if (pending) { if (!block) block = crypto.randomUUID(); send('PermissionRequest', data(ctx), 'ui_prompt_start', block); } });
 pi.on('ui_prompt_end', (_event, ctx) => { editor?.block(false); if (pending && block) { send('PreToolUse', data(ctx), 'ui_prompt_end', block); block = undefined; } });
 pi.on('agent_end', event => {
  let message; for (let i = (event?.messages?.length || 0) - 1; i >= 0; i--) { if (event.messages[i].role === 'assistant') { message = event.messages[i]; break; } }
  answer = message;
  failure = message?.stopReason === 'error' || message?.stopReason === 'aborted' ? 'nativeAnswerFailed' : '';
 });
 pi.on('agent_settled', (event, ctx) => {
  editor?.inputSettled(); if (!pending) return; pending = false;
  const aborted = event.aborted;
  send(aborted ? 'StopCancelled' : failure ? 'StopFailure' : 'Stop', () => ({ ...data(ctx), ...nativeAnswer(answer?.content), ...(aborted || failure ? { huhu_answer_error: aborted ? 'nativeAnswerCancelled' : failure } : {}) }), 'agent_settled');
  answer = undefined;
 });
 pi.on('session_shutdown', () => { editor?.close(); pending = false; answer = undefined; send('AdapterClose', {}, 'session_shutdown'); });
}

`;
export const OPENCODE_EXTENSION =
	transport +
	`
export const HuhuStatus = async ({ client }) => {
 if (!owner()) return {};
 const send = nativeSource('opencode'); send('AdapterStart', {}, 'registration');
 const queue = []; let running = false, failed = false;
 async function handle(event) {
  const id = event.properties.sessionID;
  if (!id) return;
  let session;
  try { session = (await client.session.get({ path: { id } })).data; }
  catch { send('HookError', { huhu_answer_error: 'nativeSessionReadFailed' }, 'HookError'); return; }
  if (!session || session.parentID) return;
  const data = { session_id: id, cwd: session.directory }, status = event.properties.status;
  if (event.type === 'session.status' && (status === 'busy' || status === 'retry')) send('UserPromptSubmit', data, event.type);
  if (event.type === 'permission.asked' || event.type === 'question.asked') send('PermissionRequest', data, event.type, event.properties.id || crypto.randomUUID());
  if (event.type === 'session.error') send('AdapterError', { ...data, huhu_answer_error: 'nativeSessionError' }, 'HookError');
  if (event.type === 'session.status' && status === 'idle') {
   try {
    const messages = (await client.session.messages({ path: { id } })).data;
    let user, answer;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].info?.role === 'user') { user = messages[i]; break; }
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].info?.role === 'assistant' && messages[i].info?.parentID === user?.info?.id) { answer = messages[i]; break; }
    if (!answer || answer.info.error || !answer.info.time?.completed) send('StopFailure', { ...data, huhu_answer_error: 'nativeAnswerMissing' }, 'StopFailure');
    else send('Stop', () => ({ ...data, ...nativeAnswer(answer.parts) }), 'Stop');
   } catch { send('StopFailure', { ...data, huhu_answer_error: 'nativeAnswerMissing' }, 'StopFailure'); }
  }
 }
 async function drain() {
  if (running) return; running = true;
  try { while (queue.length) { const job = queue.shift(); try { await handle(job.event); } catch { send('HookError', { huhu_answer_error: 'nativeDeliveryFailed' }, 'HookError'); } finally { job.resolve(); } } }
  finally { running = false; }
 }
 return { event: ({event}) => {
  if (queue.length >= 8) { if (!failed) { failed = true; send('HookError', { huhu_answer_error: 'nativeDeliveryCapacity' }, 'HookError'); } return Promise.resolve(); }
  const type = event.type, p = event.properties || {};
  if (typeof type !== 'string' || type.length > 128 || (p.sessionID !== undefined && (typeof p.sessionID !== 'string' || p.sessionID.length > 1024)) || (p.id !== undefined && (typeof p.id !== 'string' || p.id.length > 256))) { send('HookError', { huhu_answer_error: 'nativeDeliveryInvalid' }, 'HookError'); return Promise.resolve(); }
  const captured = { type, properties: { sessionID: p.sessionID, status: p.status?.type, id: p.id } };
  return new Promise(resolve => { queue.push({ event: captured, resolve }); void drain(); });
 }};
};
`;
