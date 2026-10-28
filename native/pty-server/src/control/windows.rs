//! Private same-user named pipes and locator ACLs. Windows execution remains a separate platform check.
use interprocess::os::windows::{
    named_pipe::{pipe_mode, DuplexPipeStream, PipeListener, PipeListenerOptions},
    security_descriptor::SecurityDescriptor,
};
use std::{
    fs::{self, File, OpenOptions},
    io, mem,
    num::NonZeroU8,
    os::windows::{
        ffi::OsStrExt,
        fs::{MetadataExt, OpenOptionsExt},
        io::{AsRawHandle, FromRawHandle},
    },
    path::{Path, PathBuf},
    ptr,
};
use widestring::U16CString;
use windows_sys::Win32::{
    Foundation::*,
    Security::{Authorization::*, Cryptography::*, *},
    Storage::FileSystem::*,
    System::Threading::{GetCurrentProcess, OpenProcessToken},
};
struct Handle(HANDLE);
impl Drop for Handle {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.0);
        }
    }
}
struct Local(PSECURITY_DESCRIPTOR);
impl Drop for Local {
    fn drop(&mut self) {
        unsafe {
            LocalFree(self.0);
        }
    }
}
fn wide(path: &Path) -> Vec<u16> {
    path.as_os_str().encode_wide().chain(Some(0)).collect()
}
fn denied() -> io::Error {
    io::Error::new(
        io::ErrorKind::PermissionDenied,
        "control ACL or identity mismatch",
    )
}
fn user_sid() -> io::Result<String> {
    unsafe {
        let mut handle = ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut handle) == 0 {
            return Err(io::Error::last_os_error());
        }
        let handle = Handle(handle);
        let mut size = 0;
        GetTokenInformation(handle.0, TokenUser, ptr::null_mut(), 0, &mut size);
        if size == 0 || size > 65536 {
            return Err(denied());
        }
        // usize storage aligns TOKEN_USER/SID pointers on both x64 and ARM64.
        let mut storage =
            vec![0usize; (size as usize + mem::size_of::<usize>() - 1) / mem::size_of::<usize>()];
        if GetTokenInformation(
            handle.0,
            TokenUser,
            storage.as_mut_ptr().cast(),
            size,
            &mut size,
        ) == 0
        {
            return Err(io::Error::last_os_error());
        }
        let token = &*(storage.as_ptr().cast::<TOKEN_USER>());
        let mut text = ptr::null_mut();
        if ConvertSidToStringSidW(token.User.Sid, &mut text) == 0 {
            return Err(io::Error::last_os_error());
        }
        let mut len = 0;
        while *text.add(len) != 0 && len < 256 {
            len += 1;
        }
        let sid = String::from_utf16_lossy(std::slice::from_raw_parts(text, len));
        LocalFree(text.cast());
        if len == 256 {
            return Err(denied());
        }
        Ok(sid)
    }
}
fn sddl() -> io::Result<String> {
    let sid = user_sid()?;
    Ok(format!("O:{sid}G:{sid}D:P(A;;FA;;;SY)(A;;FA;;;{sid})"))
}
fn raw_sd() -> io::Result<Local> {
    let text = U16CString::from_str(sddl()?).map_err(|_| denied())?;
    let mut sd = ptr::null_mut();
    if unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            text.as_ptr(),
            1,
            &mut sd,
            ptr::null_mut(),
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    Ok(Local(sd))
}
fn attributes(sd: &Local) -> SECURITY_ATTRIBUTES {
    SECURITY_ATTRIBUTES {
        nLength: mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: sd.0,
        bInheritHandle: 0,
    }
}
fn sid_text(sid: PSID) -> io::Result<String> {
    unsafe {
        let mut out = ptr::null_mut();
        if sid.is_null() || ConvertSidToStringSidW(sid, &mut out) == 0 {
            return Err(denied());
        }
        let mut n = 0;
        while n < 256 && *out.add(n) != 0 {
            n += 1;
        }
        let text = String::from_utf16_lossy(std::slice::from_raw_parts(out, n));
        LocalFree(out.cast());
        if n == 256 {
            return Err(denied());
        }
        Ok(text)
    }
}
fn private_handle(file: &File) -> io::Result<()> {
    unsafe {
        let mut owner = ptr::null_mut();
        let mut dacl = ptr::null_mut();
        let mut sd = ptr::null_mut();
        let code = GetSecurityInfo(
            file.as_raw_handle(),
            SE_FILE_OBJECT,
            OWNER_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION,
            &mut owner,
            ptr::null_mut(),
            &mut dacl,
            ptr::null_mut(),
            &mut sd,
        );
        if code != 0 {
            return Err(io::Error::from_raw_os_error(code as i32));
        }
        let _sd = Local(sd);
        let expected = user_sid()?;
        if sid_text(owner)? != expected || dacl.is_null() {
            return Err(denied());
        }
        let mut control = 0;
        let mut revision = 0;
        if GetSecurityDescriptorControl(sd, &mut control, &mut revision) == 0
            || control & SE_DACL_PROTECTED == 0
        {
            return Err(denied());
        }
        let mut user = false;
        for i in 0..(*dacl).AceCount as u32 {
            let mut ace = ptr::null_mut();
            if GetAce(dacl, i, &mut ace) == 0 {
                return Err(denied());
            }
            let header = &*ace.cast::<ACE_HEADER>();
            if header.AceType != 0 {
                return Err(denied());
            }
            let allow = &*ace.cast::<ACCESS_ALLOWED_ACE>();
            let sid = ptr::addr_of!(allow.SidStart).cast_mut().cast();
            let who = sid_text(sid)?;
            if who != expected && who != "S-1-5-18" {
                return Err(denied());
            }
            user |= who == expected;
        }
        if !user {
            return Err(denied());
        }
        Ok(())
    }
}
fn open_any(path: &Path) -> io::Result<File> {
    OpenOptions::new()
        .read(true)
        .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_BACKUP_SEMANTICS)
        .open(path)
}
pub fn private_directory(path: &Path) -> io::Result<()> {
    let file = open_any(path)?;
    let m = file.metadata()?;
    if !m.is_dir() || m.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
        return Err(denied());
    }
    private_handle(&file)
}
pub fn directory(path: &Path) -> io::Result<()> {
    let sd = raw_sd()?;
    let attr = attributes(&sd);
    if unsafe { CreateDirectoryW(wide(path).as_ptr(), &attr) } == 0 {
        let error = io::Error::last_os_error();
        if error.raw_os_error() != Some(ERROR_ALREADY_EXISTS as i32) {
            return Err(error);
        }
    }
    private_directory(path)
}
pub fn runtime_root() -> io::Result<PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .ok_or_else(denied)?;
    let root = base.join("huhu-control-v1");
    directory(&root)?;
    fs::canonicalize(root)
}
pub fn open_new(path: &Path) -> io::Result<File> {
    let sd = raw_sd()?;
    let attr = attributes(&sd);
    let handle = unsafe {
        CreateFileW(
            wide(path).as_ptr(),
            GENERIC_WRITE,
            FILE_SHARE_READ,
            &attr,
            CREATE_NEW,
            FILE_ATTRIBUTE_NORMAL | FILE_FLAG_OPEN_REPARSE_POINT,
            ptr::null_mut(),
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        return Err(io::Error::last_os_error());
    }
    Ok(unsafe { File::from_raw_handle(handle) })
}
pub fn private_file(file: &File) -> io::Result<()> {
    let m = file.metadata()?;
    if !m.is_file() || m.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
        return Err(denied());
    }
    private_handle(file)
}
pub fn open_read(path: &Path) -> io::Result<File> {
    let file = open_any(path)?;
    private_file(&file)?;
    Ok(file)
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Identity(u32, u64);
fn info(file: &File) -> io::Result<BY_HANDLE_FILE_INFORMATION> {
    unsafe {
        let mut value = mem::zeroed();
        if GetFileInformationByHandle(file.as_raw_handle(), &mut value) == 0 {
            return Err(io::Error::last_os_error());
        }
        Ok(value)
    }
}
pub fn file_identity(file: &File) -> io::Result<Identity> {
    let value = info(file)?;
    Ok(Identity(
        value.dwVolumeSerialNumber,
        ((value.nFileIndexHigh as u64) << 32) | value.nFileIndexLow as u64,
    ))
}
pub fn path_identity(path: &Path) -> io::Result<Identity> {
    file_identity(&open_any(path)?)
}
pub fn remove_identity(path: &Path, id: &Identity) -> io::Result<()> {
    let found = match path_identity(path) {
        Ok(v) => v,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(e),
    };
    if &found != id {
        return Err(denied());
    }
    fs::remove_file(path)
}
pub fn nonce() -> io::Result<String> {
    let mut bytes = [0u8; 32];
    if unsafe {
        BCryptGenRandom(
            ptr::null_mut(),
            bytes.as_mut_ptr(),
            32,
            BCRYPT_USE_SYSTEM_PREFERRED_RNG,
        )
    } < 0
    {
        return Err(io::Error::other("control random generation failed"));
    }
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}
pub fn physical(path: &Path) -> io::Result<(String, String, String)> {
    let canonical = fs::canonicalize(path)?;
    let file = open_any(&canonical)?;
    let m = file.metadata()?;
    if !m.is_dir() {
        return Err(denied());
    }
    let id = info(&file)?;
    let text = canonical
        .to_string_lossy()
        .trim_start_matches("\\\\?\\")
        .to_owned();
    Ok((
        text,
        id.dwVolumeSerialNumber.to_string(),
        (((id.nFileIndexHigh as u64) << 32) | id.nFileIndexLow as u64).to_string(),
    ))
}
pub struct Stream(DuplexPipeStream<pipe_mode::Bytes>);
impl io::Read for Stream {
    fn read(&mut self, b: &mut [u8]) -> io::Result<usize> {
        io::Read::read(&mut self.0, b)
    }
}
impl io::Write for Stream {
    fn write(&mut self, b: &[u8]) -> io::Result<usize> {
        io::Write::write(&mut self.0, b)
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}
impl Drop for Stream {
    fn drop(&mut self) {
        self.0.assume_flushed();
    }
}
pub struct Listener(PipeListener<pipe_mode::Bytes, pipe_mode::Bytes>);
impl Listener {
    pub fn accept(&self) -> io::Result<Stream> {
        self.0.accept().map(Stream)
    }
    pub fn close(self) -> io::Result<()> {
        Ok(())
    }
}
pub fn listen(endpoint: &str) -> io::Result<Listener> {
    let text = U16CString::from_str(sddl()?).map_err(|_| denied())?;
    let sd = SecurityDescriptor::deserialize(&text)?;
    let pipe = PipeListenerOptions::new()
        .path(endpoint)
        .nonblocking(true)
        .instance_limit(NonZeroU8::new(9))
        .accept_remote(false)
        .inheritable(false)
        .input_buffer_size_hint(32772)
        .output_buffer_size_hint(49156)
        .security_descriptor(Some(sd))
        .create_duplex::<pipe_mode::Bytes>()?;
    Ok(Listener(pipe))
}
pub fn connect(endpoint: &str) -> io::Result<Stream> {
    if !endpoint.starts_with("\\\\.\\pipe\\huhu-control-") {
        return Err(denied());
    }
    let pipe = DuplexPipeStream::connect_by_path_with_wait_mode(
        endpoint,
        interprocess::ConnectWaitMode::Timeout(std::time::Duration::from_millis(2000)),
    )?;
    pipe.set_nonblocking(true)?;
    Ok(Stream(pipe))
}
pub fn endpoint(_root: &Path, nonce: &str) -> String {
    format!("\\\\.\\pipe\\huhu-control-{nonce}")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn private_descriptor_and_files_are_constructed_with_current_user_and_system_only() {
        let text = sddl().unwrap();
        let sid = user_sid().unwrap();
        assert!(text.contains(&format!(";;;{sid})")));
        assert!(text.contains(";;;SY)"));
        for broad in [";;;WD)", ";;;AU)", ";;;BA)"] {
            assert!(!text.contains(broad));
        }
        let wide = U16CString::from_str(text).unwrap();
        SecurityDescriptor::deserialize(&wide).unwrap();
        let path = std::env::temp_dir().join(format!("huhu-control-acl-{}", nonce().unwrap()));
        directory(&path).unwrap();
        private_directory(&path).unwrap();
        let file_path = path.join("locator");
        let file = open_new(&file_path).unwrap();
        private_file(&file).unwrap();
        let id = file_identity(&file).unwrap();
        drop(file);
        remove_identity(&file_path, &id).unwrap();
        fs::remove_dir(&path).unwrap();
    }
}

/// A named pipe has no filesystem socket to unlink. Only definite kernel-name absence proves death.
pub fn retire_dead_endpoint(endpoint: &str) -> io::Result<()> {
    use windows_sys::Win32::Foundation::{ERROR_FILE_NOT_FOUND, ERROR_PATH_NOT_FOUND};
    match connect(endpoint) {
        Ok(_) => Err(io::ErrorKind::AddrInUse.into()),
        Err(error)
            if error.raw_os_error() == Some(ERROR_FILE_NOT_FOUND as i32)
                || error.raw_os_error() == Some(ERROR_PATH_NOT_FOUND as i32) =>
        {
            Ok(())
        }
        Err(error) => Err(error),
    }
}

pub fn editor_peer_pid(_: &Stream) -> io::Result<u32> {
    Err(io::ErrorKind::Unsupported.into())
}
