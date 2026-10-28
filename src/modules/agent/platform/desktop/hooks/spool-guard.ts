/** Shared physical root/token guard, evaluated again in each publisher process. */
export const SPOOL_GUARD = `function hookPath(file) {
 let cursor = path.resolve(file);
 for (;;) { try { if (fs.lstatSync(cursor).isSymbolicLink()) throw Error('hookSpoolSymlink'); } catch (error) { if (hookCode(error) !== 'ENOENT') throw error; } const parent = path.dirname(cursor); if (parent === cursor) break; cursor = parent; }
}
function hookGuard() {
 if (!root || !dir || !token || path.dirname(path.dirname(dir)) !== root || path.basename(path.dirname(dir)) !== 'scopes' || !/^(?:[0-9]|[12][0-9]|3[01])$/.test(path.basename(dir))) throw Error('hookScopeInvalid');
 hookPath(dir);
 const active = hookMetadata(path.join(dir, 'active.json'), 256);
 if (active.token !== token) throw Error('hookScopeClosed');
}
function hookMetadata(file, limit) {
 hookPath(file); const handle = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
 try {
  if (!fs.fstatSync(handle).isFile()) throw Error('hookMetadataInvalid');
  const bytes = Buffer.allocUnsafe(limit + 1); let size = 0;
  while (size <= limit) { const read = fs.readSync(handle, bytes, size, limit + 1 - size, null); if (!read) break; size += read; }
  if (size > limit) throw Error('hookMetadataTooLarge');
  return JSON.parse(bytes.toString('utf8', 0, size));
 } finally { fs.closeSync(handle); }
}
`;
