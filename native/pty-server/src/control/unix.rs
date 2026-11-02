//! Filesystem-named local sockets; never reclaims another listener's path.
use interprocess::local_socket::{
    prelude::*, ConnectOptions, GenericFilePath, ListenerNonblockingMode, ListenerOptions,
};
use interprocess::os::unix::local_socket::ListenerOptionsExt;
use std::{
    fs::{self, File, Metadata, OpenOptions},
    io::{self, Read},
    os::unix::fs::{DirBuilderExt, MetadataExt, OpenOptionsExt, PermissionsExt},
    path::{Path, PathBuf},
    time::Duration,
};
pub type Stream = interprocess::local_socket::Stream;
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Identity(pub u64, pub u64);
pub fn identity(meta: &Metadata) -> Identity {
    Identity(meta.dev(), meta.ino())
}
pub fn private_directory(path: &Path) -> io::Result<()> {
    let m = fs::symlink_metadata(path)?;
    if !m.is_dir()
        || m.file_type().is_symlink()
        || m.uid() != unsafe { libc::geteuid() }
        || m.mode() & 0o077 != 0
    {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "control directory is not private",
        ));
    }
    Ok(())
}
pub fn directory(path: &Path) -> io::Result<()> {
    match fs::DirBuilder::new().mode(0o700).create(path) {
        Ok(()) => (),
        Err(e) if e.kind() == io::ErrorKind::AlreadyExists => (),
        Err(e) => return Err(e),
    }
    private_directory(path)
}
/// `listen` rejects a socket path above 100 bytes. macOS canonicalizes `/tmp`
/// to `/private/tmp` and `/var` to `/private/var`, so the raw directory length
/// is not the limit that matters.
fn socket_fits(canonical_root: &Path) -> bool {
    canonical_root
        .join(format!("s{}", "0".repeat(32)))
        .as_os_str()
        .len()
        <= 100
}
fn rooted(base: &Path) -> io::Result<PathBuf> {
    let name = format!("huhu-ctl-{}", unsafe { libc::geteuid() });
    let canonical = fs::canonicalize(base)?.join(&name);
    if !socket_fits(&canonical) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "control socket path too long",
        ));
    }
    directory(&canonical)?;
    fs::canonicalize(&canonical)
}
pub fn runtime_root() -> io::Result<PathBuf> {
    if let Some(base) = std::env::var_os("XDG_RUNTIME_DIR").map(PathBuf::from) {
        if base.is_absolute() && private_directory(&base).is_ok() {
            match rooted(&base) {
                Ok(root) => return Ok(root),
                Err(error) if error.kind() == io::ErrorKind::InvalidInput => {}
                Err(error) => return Err(error),
            }
        }
    }
    rooted(Path::new("/tmp"))
}
pub fn open_new(path: &Path) -> io::Result<File> {
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .custom_flags(libc::O_NOFOLLOW | libc::O_CLOEXEC)
        .open(path)
}
pub fn open_read(path: &Path) -> io::Result<File> {
    let f = OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NOFOLLOW | libc::O_CLOEXEC)
        .open(path)?;
    private_file(&f)?;
    Ok(f)
}
pub fn private_file(file: &File) -> io::Result<()> {
    let m = file.metadata()?;
    if !m.is_file() || m.uid() != unsafe { libc::geteuid() } || m.mode() & 0o077 != 0 {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "control locator is not private",
        ));
    }
    Ok(())
}
pub fn remove_identity(path: &Path, id: &Identity) -> io::Result<()> {
    let meta = match fs::symlink_metadata(path) {
        Ok(v) => v,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(e),
    };
    if &identity(&meta) != id {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "control identity changed",
        ));
    }
    fs::remove_file(path)
}
pub fn nonce() -> io::Result<String> {
    let mut bytes = [0u8; 32];
    File::open("/dev/urandom")?.read_exact(&mut bytes)?;
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}
pub fn physical(path: &Path) -> io::Result<(String, String, String)> {
    let canonical = fs::canonicalize(path)?;
    let m = fs::metadata(&canonical)?;
    if !m.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Vault root is not a directory",
        ));
    }
    Ok((
        canonical.to_string_lossy().into_owned(),
        m.dev().to_string(),
        m.ino().to_string(),
    ))
}
pub fn connect(endpoint: &str) -> io::Result<Stream> {
    let stream = ConnectOptions::new()
        .name(Path::new(endpoint).to_fs_name::<GenericFilePath>()?)
        .wait_mode(interprocess::ConnectWaitMode::Timeout(
            Duration::from_millis(2000),
        ))
        .nonblocking_stream(true)
        .connect_sync()?;
    peer(&stream)?;
    Ok(stream)
}
pub fn peer(stream: &Stream) -> io::Result<()> {
    if stream.peer_creds()?.euid() != Some(unsafe { libc::geteuid() }) {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "control peer user mismatch",
        ));
    }
    Ok(())
}
pub struct Listener {
    inner: interprocess::local_socket::Listener,
    path: PathBuf,
    id: Identity,
    cleanup_on_drop: bool,
}
impl Listener {
    pub fn accept(&self) -> io::Result<Stream> {
        let stream = self.inner.accept()?;
        peer(&stream)?;
        Ok(stream)
    }
    pub fn close(mut self) -> io::Result<()> {
        self.cleanup_on_drop = false;
        remove_identity(&self.path, &self.id)
    }
}
impl Drop for Listener {
    fn drop(&mut self) {
        if self.cleanup_on_drop {
            let _ = remove_identity(&self.path, &self.id);
        }
    }
}
pub fn listen(endpoint: &str) -> io::Result<Listener> {
    let path = PathBuf::from(endpoint);
    if path.as_os_str().len() > 100 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "control socket path too long",
        ));
    }
    let options = || -> io::Result<ListenerOptions<'_>> {
        Ok(ListenerOptions::new()
            .name(path.as_path().to_fs_name::<GenericFilePath>()?)
            .nonblocking(ListenerNonblockingMode::Both)
            .reclaim_name(false)
            .try_overwrite(false))
    };
    // interprocess sets the mode with `fchmod` on the unbound socket. macOS
    // rejects that with EINVAL, reported as `Unsupported` before `bind`, so no
    // name exists yet. Only then is the parent re-checked as a 0700 directory
    // owned by this user, and the socket is narrowed to 0600 right after `bind`.
    let inner = match options()?.mode(0o600).create_sync() {
        Err(error) if error.kind() == io::ErrorKind::Unsupported => {
            private_directory(path.parent().unwrap_or(Path::new("/")))?;
            options()?.create_sync()?
        }
        other => other?,
    };
    let m = fs::symlink_metadata(&path)?;
    fs::set_permissions(&path, fs::Permissions::from_mode(0o600))?;
    Ok(Listener {
        inner,
        path,
        id: identity(&m),
        cleanup_on_drop: true,
    })
}
pub fn endpoint(root: &Path, nonce: &str) -> String {
    root.join(format!("s{}", &nonce[..32]))
        .to_string_lossy()
        .into_owned()
}
pub fn file_identity(file: &File) -> io::Result<Identity> {
    Ok(identity(&file.metadata()?))
}
pub fn path_identity(path: &Path) -> io::Result<Identity> {
    Ok(identity(&fs::symlink_metadata(path)?))
}

/// Retire only a captured private socket that the OS positively reports has no listener.
pub fn retire_dead_endpoint(endpoint: &str) -> io::Result<()> {
    use std::os::unix::fs::FileTypeExt;
    let path = Path::new(endpoint);
    if path.parent() != Some(runtime_root()?.as_path()) {
        return Err(io::ErrorKind::PermissionDenied.into());
    }
    let metadata = match fs::symlink_metadata(path) {
        Ok(value) => value,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error),
    };
    if !metadata.file_type().is_socket()
        || metadata.uid() != unsafe { libc::geteuid() }
        || metadata.mode() & 0o077 != 0
    {
        return Err(io::ErrorKind::PermissionDenied.into());
    }
    let captured = identity(&metadata);
    match connect(endpoint) {
        Ok(_) => return Err(io::ErrorKind::AddrInUse.into()),
        Err(error)
            if matches!(
                error.raw_os_error(),
                Some(libc::ECONNREFUSED) | Some(libc::ENOENT)
            ) =>
        {
            ()
        }
        Err(error) => return Err(error),
    }
    remove_identity(path, &captured)
}

/// Authentication requires the original root PID; UID-only is insufficient for editor enrollment.
pub fn editor_peer_pid(stream: &Stream) -> io::Result<u32> {
    #[cfg(target_os = "linux")]
    {
        return stream
            .peer_creds()?
            .pid()
            .and_then(|p| u32::try_from(p).ok())
            .ok_or(io::ErrorKind::PermissionDenied.into());
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = stream;
        Err(io::ErrorKind::Unsupported.into())
    }
}

#[cfg(test)]
mod tests {
    use super::socket_fits;
    use std::path::Path;

    #[test]
    fn private_prefix_can_push_a_runtime_root_past_the_socket_cap() {
        let expanded = Path::new(
            "/private/var/folders/aa/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/T/h7-0123456789abcdef/huhu-ctl-501",
        );
        assert!(expanded.as_os_str().len() > 66);
        assert!(!socket_fits(expanded));
        assert!(socket_fits(Path::new(
            "/private/tmp/h7-0123456789abcdef/huhu-ctl-501"
        )));
    }
}
