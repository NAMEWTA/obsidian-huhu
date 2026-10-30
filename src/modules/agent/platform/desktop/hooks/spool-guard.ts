/**
 * Shared physical root/token guard, evaluated again in each publisher process. Like the reader, the
 * spool root and its ancestors are checked once per (at most 3 s) process; every path below the
 * root is still checked on each call. Re-walking to the drive root on every call cost about 250
 * synchronous filesystem calls per publication while a collector was held, which on Windows made
 * a 32-scope burst outlast the 3 s input deadline (hookCollectorTimeout).
 */
export const SPOOL_GUARD = `let hookTop=root?path.resolve(root):'', hookTopChecked;
function hookPath(file) {
 let cursor=path.resolve(file), passed;
 for (;;) { if (cursor===hookTop) { if (hookTopChecked) return;passed=1;} try { if (fs.lstatSync(cursor).isSymbolicLink()) throw Error('hookSpoolSymlink');} catch (error) { if (hookCode(error)!=='ENOENT') throw error;} const parent=path.dirname(cursor);if (parent===cursor) break;cursor=parent;}
 if (passed) hookTopChecked=1;
}
function hookGuard() {
 if (!root||!dir||!token||path.dirname(path.dirname(dir))!==root||path.basename(path.dirname(dir))!=='scopes'||!/^(?:[0-9]|[12][0-9]|3[01])$/.test(path.basename(dir))) throw Error('hookScopeInvalid');
 hookPath(dir);
 const active=hookMetadata(path.join(dir, 'active.json'), 256);
 if (active.token!==token) throw Error('hookScopeClosed');
}
function hookMetadata(file, limit) {
 hookPath(file);const handle=fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW||0));
 try {
  if (!fs.fstatSync(handle).isFile()) throw Error('hookMetadataInvalid');
  const bytes=Buffer.allocUnsafe(limit + 1);let size=0;
  while (size<=limit) { const read=fs.readSync(handle, bytes, size, limit + 1 - size, null);if (!read) break;size+=read;}
  if (size>limit) throw Error('hookMetadataTooLarge');
  return JSON.parse(bytes.toString('utf8', 0, size));
 } finally { fs.closeSync(handle);}
}
`;
