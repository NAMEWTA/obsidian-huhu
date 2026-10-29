//! Trusted bootstrap control for the existing helper executable and ConPTY.
#[cfg(any(windows, test))]
#[cfg_attr(not(test), allow(dead_code))]
#[derive(Debug)]
enum GateError<E> {
    Assign(E),
    Cancelled,
    Release(E),
}
#[cfg(any(windows, test))]
#[cfg_attr(not(test), allow(dead_code))]
fn assign_and_release<E>(
    assign: impl FnOnce() -> Result<(), E>,
    cancelled: impl FnOnce() -> bool,
    release: impl FnOnce() -> Result<(), E>,
) -> Result<(), GateError<E>> {
    assign().map_err(GateError::Assign)?;
    if cancelled() {
        return Err(GateError::Cancelled);
    }
    release().map_err(GateError::Release)
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;
    #[test]
    fn failed_assignment_or_cancellation_never_releases_payload_gate() {
        for fail_assignment in [false, true] {
            let released = Cell::new(false);
            let result = assign_and_release(
                || {
                    if fail_assignment {
                        Err("nested job rejected")
                    } else {
                        Ok(())
                    }
                },
                || true,
                || {
                    released.set(true);
                    Ok(())
                },
            );
            assert!(result.is_err());
            assert!(!released.get());
        }
    }
    #[test]
    fn gate_failure_is_not_success_and_success_is_strictly_after_assignment() {
        let assigned = Cell::new(false);
        let result = assign_and_release(
            || {
                assigned.set(true);
                Ok(())
            },
            || false,
            || {
                assert!(assigned.get());
                Err("SetEvent failed")
            },
        );
        assert!(matches!(result, Err(GateError::Release("SetEvent failed"))));
        assert!(assign_and_release(|| Ok::<_, &str>(()), || false, || Ok(())).is_ok());
    }
}
/// Windows command line for one payload. Rust's `Command` always sets
/// `STARTF_USESTDHANDLES`. The helper creates the process itself with the
/// pseudoconsole attribute, then places that process in the session job.
#[cfg(any(windows, test))]
pub(crate) fn windows_command_line(file: &str, args: &[String]) -> Vec<u16> {
    let mut out = Vec::new();
    append_windows_argument(&mut out, file);
    for arg in args {
        out.push(u16::from(b' '));
        append_windows_argument(&mut out, arg);
    }
    out.push(0);
    out
}
#[cfg(any(windows, test))]
fn append_windows_argument(out: &mut Vec<u16>, arg: &str) {
    let quote = arg.is_empty()
        || arg
            .chars()
            .any(|c| matches!(c, ' ' | '\t' | '\n' | '\r' | '"'));
    if !quote {
        out.extend(arg.encode_utf16());
        return;
    }
    out.push(u16::from(b'"'));
    let mut backslashes = 0u32;
    for c in arg.chars() {
        match c {
            '\\' => backslashes += 1,
            '"' => {
                for _ in 0..(backslashes * 2 + 1) {
                    out.push(u16::from(b'\\'));
                }
                out.push(u16::from(b'"'));
                backslashes = 0;
            }
            _ => {
                for _ in 0..backslashes {
                    out.push(u16::from(b'\\'));
                }
                backslashes = 0;
                let mut buf = [0u16; 2];
                for unit in c.encode_utf16(&mut buf) {
                    out.push(*unit);
                }
            }
        }
    }
    for _ in 0..(backslashes * 2) {
        out.push(u16::from(b'\\'));
    }
    out.push(u16::from(b'"'));
}
/// `None` inherits the parent environment. Overrides replace keys without regard to case.
#[cfg(any(windows, test))]
pub(crate) fn windows_environment_block(
    base: impl IntoIterator<Item = (String, String)>,
    overrides: &std::collections::HashMap<String, String>,
) -> Option<Vec<u16>> {
    if overrides.is_empty() {
        return None;
    }
    let mut entries: Vec<(String, String)> = base.into_iter().collect();
    for (key, value) in overrides {
        if key.is_empty() || key.contains('=') || key.contains('\0') || value.contains('\0') {
            continue;
        }
        if let Some(slot) = entries
            .iter_mut()
            .find(|(existing, _)| existing.eq_ignore_ascii_case(key))
        {
            slot.0.clone_from(key);
            slot.1.clone_from(value);
        } else {
            entries.push((key.clone(), value.clone()));
        }
    }
    entries.sort_by(|left, right| {
        left.0
            .to_ascii_lowercase()
            .cmp(&right.0.to_ascii_lowercase())
    });
    let mut block = Vec::new();
    for (key, value) in entries {
        block.extend(format!("{key}={value}").encode_utf16());
        block.push(0);
    }
    block.push(0);
    Some(block)
}
#[cfg(test)]
mod command_line_tests {
    use super::{windows_command_line, windows_environment_block};
    use std::collections::HashMap;
    fn text(units: &[u16]) -> String {
        String::from_utf16_lossy(units)
    }
    #[test]
    fn plain_arguments_stay_unquoted_and_special_ones_are_escaped() {
        assert_eq!(
            text(&windows_command_line(
                "cmd.exe",
                &["/D".into(), "/C".into(), "exit 7".into()]
            )),
            "cmd.exe /D /C \"exit 7\"\0"
        );
        assert_eq!(
            text(&windows_command_line(
                "C:\\Program Files\\shell.exe",
                &[String::new(), "a\"b".into(), "c\\".into(), "c \\".into()]
            )),
            "\"C:\\Program Files\\shell.exe\" \"\" \"a\\\"b\" c\\ \"c \\\\\"\0"
        );
    }
    #[test]
    fn missing_image_os_errors_are_program_rejected_and_other_failures_are_not() {
        for marker in ["(os error 2)", "(os error 3)", "(os error 123)", "(os error 161)", "(os error 193)", "(os error 206)", "(os error 267)"] {
            assert_eq!(
                super::spawn_failure_code(&format!("CreateProcessW failed: The system cannot find the file specified. {marker}")),
                "program-rejected"
            );
        }
        assert_eq!(
            super::spawn_failure_code("CreateProcessW failed: Access is denied. (os error 5)"),
            "pty-unavailable"
        );
    }
    #[test]
    fn environment_overrides_replace_case_insensitively_and_empty_means_inherit() {
        assert!(windows_environment_block([("PATH".into(), "a".into())], &HashMap::new()).is_none());
        let mut overrides = HashMap::new();
        overrides.insert("Path".into(), "b".into());
        overrides.insert("HUHU".into(), "1".into());
        let block = windows_environment_block(
            [("PATH".into(), "a".into()), ("Z".into(), "z".into())],
            &overrides,
        )
        .unwrap();
        assert_eq!(text(&block), "HUHU=1\0Path=b\0Z=z\0\0");
    }
}
/// CreateProcess reports these before a process exists. The effect is none.
pub fn spawn_failure_code(message: &str) -> &'static str {
    const MARKERS: &[&str] = &[
        "(os error 2)",
        "(os error 3)",
        "(os error 123)",
        "(os error 161)",
        "(os error 193)",
        "(os error 206)",
        "(os error 267)",
    ];
    if MARKERS.iter().any(|marker| message.contains(marker)) {
        "program-rejected"
    } else {
        "pty-unavailable"
    }
}
#[cfg(windows)]
pub use platform::{contain, detach_parent_console, run_if_requested};
#[cfg(windows)]
mod platform {
    use crate::{
        job::Job,
        session::{SpawnFailure, SpawnRequest},
    };
    use portable_pty::Child;
    use std::{
        io, mem, ptr,
        sync::atomic::{AtomicU32, AtomicU64, Ordering},
        thread,
        time::{Duration, Instant},
    };
    use windows_sys::Win32::{
        Foundation::*,
        Security::{Authorization::*, *},
        System::{Memory::*, Threading::*},
    };
    const SIZE: usize = 256 * 1024;
    const REQUEST: usize = 1024;
    /// Inherited pseudoconsole handle value, published before the anchor starts.
    const CONSOLE_SLOT: usize = 40;
    const PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE: usize = 0x0002_0016;
    const PROC_THREAD_ATTRIBUTE_HANDLE_LIST: usize = 0x0002_0002;
    const BOOTSTRAP_ARG: &str = "--huhu-session-bootstrap";
    /// The helper is a Windows-subsystem image, so a console parent cannot attach
    /// it. `CreateProcess` of a pseudoconsole client otherwise waits on that
    /// console lock, and an existing program such as `cmd.exe` never returns. A
    /// missing image fails before that lock and is already `program-rejected`.
    /// This call still runs: standard handles are pipes by the time `main` runs,
    /// so detaching leaves the frame protocol intact when a host did attach one.
    pub fn detach_parent_console() {
        unsafe { windows_sys::Win32::System::Console::FreeConsole() };
    }
    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }
    #[derive(Debug)]
    struct Handle(HANDLE);
    unsafe impl Send for Handle {}
    unsafe impl Sync for Handle {}
    impl Drop for Handle {
        fn drop(&mut self) {
            unsafe {
                CloseHandle(self.0);
            }
        }
    }
    #[cfg_attr(not(test), allow(dead_code))]
    struct Security(PSECURITY_DESCRIPTOR);
    impl Drop for Security {
        fn drop(&mut self) {
            unsafe {
                LocalFree(self.0);
            }
        }
    }
    #[cfg_attr(not(test), allow(dead_code))]
    impl Security {
        fn user() -> io::Result<Self> {
            let mut token = ptr::null_mut();
            if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) } == 0 {
                return Err(io::Error::last_os_error());
            }
            let token = Handle(token);
            let mut bytes = 0;
            unsafe {
                GetTokenInformation(token.0, TokenUser, ptr::null_mut(), 0, &mut bytes);
            }
            if bytes == 0 || bytes > 4096 {
                return Err(io::Error::other("Invalid token user size"));
            }
            let mut data = vec![0usize; (bytes as usize).div_ceil(mem::size_of::<usize>())];
            if unsafe {
                GetTokenInformation(
                    token.0,
                    TokenUser,
                    data.as_mut_ptr() as _,
                    bytes,
                    &mut bytes,
                )
            } == 0
            {
                return Err(io::Error::last_os_error());
            }
            let user = unsafe { &*(data.as_ptr() as *const TOKEN_USER) };
            let mut string = ptr::null_mut();
            if unsafe { ConvertSidToStringSidW(user.User.Sid, &mut string) } == 0 {
                return Err(io::Error::last_os_error());
            }
            let mut n = 0;
            unsafe {
                while *string.add(n) != 0 {
                    n += 1;
                }
            }
            let sid = String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(string, n) });
            unsafe {
                LocalFree(string as _);
            }
            let descriptor = wide(&format!("D:P(A;;GA;;;SY)(A;;GA;;;{sid})"));
            let mut out = ptr::null_mut();
            if unsafe {
                ConvertStringSecurityDescriptorToSecurityDescriptorW(
                    descriptor.as_ptr(),
                    1,
                    &mut out,
                    ptr::null_mut(),
                )
            } == 0
            {
                return Err(io::Error::last_os_error());
            }
            Ok(Self(out))
        }
        fn attributes(&self) -> SECURITY_ATTRIBUTES {
            SECURITY_ATTRIBUTES {
                nLength: mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
                lpSecurityDescriptor: self.0,
                bInheritHandle: 0,
            }
        }
    }
    struct Mapping {
        _handle: Handle,
        view: *mut u8,
    }
    impl Drop for Mapping {
        fn drop(&mut self) {
            unsafe {
                UnmapViewOfFile(MEMORY_MAPPED_VIEW_ADDRESS {
                    Value: self.view as _,
                });
            }
        }
    }
    impl Mapping {
        fn from_handle(handle: Handle) -> io::Result<Self> {
            let view = unsafe { MapViewOfFile(handle.0, FILE_MAP_ALL_ACCESS, 0, 0, SIZE) };
            if view.Value.is_null() {
                return Err(io::Error::last_os_error());
            }
            Ok(Self {
                _handle: handle,
                view: view.Value as _,
            })
        }
        #[cfg_attr(not(test), allow(dead_code))]
        fn create(name: &str, security: &Security) -> io::Result<Self> {
            let attrs = security.attributes();
            let h = unsafe {
                CreateFileMappingW(
                    INVALID_HANDLE_VALUE,
                    &attrs,
                    PAGE_READWRITE,
                    0,
                    SIZE as u32,
                    wide(name).as_ptr(),
                )
            };
            let error = unsafe { GetLastError() };
            if h.is_null() {
                return Err(io::Error::from_raw_os_error(error as i32));
            }
            let h = Handle(h);
            if error == ERROR_ALREADY_EXISTS {
                return Err(io::Error::other("Bootstrap mapping collision"));
            }
            Self::from_handle(h)
        }
        fn open(name: &str) -> io::Result<Self> {
            let h = unsafe { OpenFileMappingW(FILE_MAP_ALL_ACCESS, 0, wide(name).as_ptr()) };
            if h.is_null() {
                return Err(io::Error::last_os_error());
            }
            Self::from_handle(Handle(h))
        }
        fn word(&self, at: usize) -> &AtomicU32 {
            unsafe { &*(self.view.add(at) as *const AtomicU32) }
        }
        fn handle_word(&self) -> &AtomicU64 {
            unsafe { &*(self.view.add(8) as *const AtomicU64) }
        }
        fn slot(&self, at: usize) -> &AtomicU64 {
            unsafe { &*(self.view.add(at) as *const AtomicU64) }
        }
        fn failure(&self, error: &io::Error) {
            self.word(24)
                .store(error.raw_os_error().unwrap_or(1) as u32, Ordering::Relaxed);
            self.word(0).store(3, Ordering::Release);
        }
    }
    #[cfg_attr(not(test), allow(dead_code))]
    fn event(name: &str, security: &Security) -> io::Result<Handle> {
        let attrs = security.attributes();
        let h = unsafe { CreateEventW(&attrs, 1, 0, wide(name).as_ptr()) };
        let e = unsafe { GetLastError() };
        if h.is_null() {
            return Err(io::Error::from_raw_os_error(e as i32));
        }
        let h = Handle(h);
        if e == ERROR_ALREADY_EXISTS {
            return Err(io::Error::other("Bootstrap gate collision"));
        }
        Ok(h)
    }
    pub fn contain(child: &mut dyn Child, job: &Job) -> Result<(), SpawnFailure> {
        let Some(raw) = child.as_raw_handle() else {
            let _ = child.kill();
            return Err(SpawnFailure {
                code: "pty-unavailable",
                effect: "unknown",
                message: "Payload handle is missing".into(),
            });
        };
        let handle = raw as HANDLE;
        if let Err(error) = job.assign(handle) {
            // A process that has already exited cannot join the job. Its handle
            // still carries the exit code, and nothing remains to leak.
            if !process_has_exited(handle) {
                let _ = child.kill();
                return Err(SpawnFailure {
                    code: "pty-unavailable",
                    effect: "unknown",
                    message: format!("Payload was not assigned to the session job: {error}"),
                });
            }
        }
        Ok(())
    }
    fn process_has_exited(handle: HANDLE) -> bool {
        let mut code = 0;
        let ok = unsafe { GetExitCodeProcess(handle, &mut code) };
        ok != 0 && code != 259
    }
    struct Created {
        process: HANDLE,
        pid: u32,
    }
    struct AttributeList {
        ptr: *mut u8,
        layout: std::alloc::Layout,
        ready: bool,
    }
    impl AttributeList {
        fn new(count: u32) -> io::Result<Self> {
            let mut bytes = 0usize;
            unsafe {
                InitializeProcThreadAttributeList(ptr::null_mut(), count, 0, &mut bytes);
            }
            if bytes == 0 || bytes > 64 * 1024 {
                return Err(io::Error::other("Invalid attribute list size"));
            }
            let layout = std::alloc::Layout::from_size_align(bytes, 16).map_err(io::Error::other)?;
            let allocated = unsafe { std::alloc::alloc(layout) };
            if allocated.is_null() {
                return Err(io::Error::other("Attribute list allocation failed"));
            }
            let ok = unsafe {
                InitializeProcThreadAttributeList(allocated as _, count, 0, &mut bytes)
            };
            if ok == 0 {
                unsafe { std::alloc::dealloc(allocated, layout) };
                return Err(io::Error::last_os_error());
            }
            Ok(Self {
                ptr: allocated,
                layout,
                ready: true,
            })
        }
        fn set(&mut self, attribute: usize, value: *const core::ffi::c_void, size: usize) -> io::Result<()> {
            let ok = unsafe {
                UpdateProcThreadAttribute(
                    self.ptr as _,
                    0,
                    attribute,
                    value,
                    size,
                    ptr::null_mut(),
                    ptr::null(),
                )
            };
            if ok == 0 {
                Err(io::Error::last_os_error())
            } else {
                Ok(())
            }
        }
    }
    impl Drop for AttributeList {
        fn drop(&mut self) {
            if self.ready {
                unsafe { DeleteProcThreadAttributeList(self.ptr as _) };
            }
            if !self.ptr.is_null() {
                unsafe { std::alloc::dealloc(self.ptr, self.layout) };
            }
        }
    }
    /// `console` attaches the new process to that pseudoconsole.
    /// `inherit` lists the only extra handles a detached anchor receives, so it can
    /// pass the pseudoconsole on without itself becoming a console client.
    /// `stdio`, when set, is included in that same list. Leaving the parent's
    /// inheritable standard handles out of the list makes CreateProcess fail.
    fn create_process(
        command_line: &mut [u16],
        environment: Option<&[u16]>,
        directory: Option<&[u16]>,
        console: Option<HANDLE>,
        inherit: &[HANDLE],
        stdio: Option<[HANDLE; 3]>,
        detached: bool,
    ) -> io::Result<Created> {
        if console.is_some() && !inherit.is_empty() {
            return Err(io::Error::other(
                "Pseudoconsole spawn cannot also inherit handles",
            ));
        }
        if console.is_none() && inherit.is_empty() {
            return Err(io::Error::other("Process spawn has no console attachment"));
        }
        let mut listed = Vec::with_capacity(inherit.len() + 3);
        if let Some(handles) = stdio {
            listed.extend_from_slice(&handles);
        }
        listed.extend_from_slice(inherit);
        let mut attributes = AttributeList::new(1)?;
        if let Some(handle) = console {
            attributes.set(
                PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE,
                handle as *const _,
                mem::size_of::<HANDLE>(),
            )?;
        } else {
            attributes.set(
                PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
                listed.as_ptr() as *const _,
                mem::size_of::<HANDLE>() * listed.len(),
            )?;
        }
        let mut startup: STARTUPINFOEXW = unsafe { mem::zeroed() };
        startup.StartupInfo.cb = mem::size_of::<STARTUPINFOEXW>() as u32;
        startup.lpAttributeList = attributes.ptr as _;
        if let Some(handles) = stdio {
            startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
            startup.StartupInfo.hStdInput = handles[0];
            startup.StartupInfo.hStdOutput = handles[1];
            startup.StartupInfo.hStdError = handles[2];
        } else if console.is_some() {
            startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
            startup.StartupInfo.hStdInput = INVALID_HANDLE_VALUE;
            startup.StartupInfo.hStdOutput = INVALID_HANDLE_VALUE;
            startup.StartupInfo.hStdError = INVALID_HANDLE_VALUE;
        }
        let mut created: PROCESS_INFORMATION = unsafe { mem::zeroed() };
        let mut flags = CREATE_UNICODE_ENVIRONMENT | EXTENDED_STARTUPINFO_PRESENT;
        if detached {
            flags |= DETACHED_PROCESS;
        }
        let ok = unsafe {
            CreateProcessW(
                ptr::null(),
                command_line.as_mut_ptr(),
                ptr::null(),
                ptr::null(),
                if console.is_some() { 0 } else { 1 },
                flags,
                environment
                    .map(|block| block.as_ptr() as *const _)
                    .unwrap_or(ptr::null()),
                directory.map(|path| path.as_ptr()).unwrap_or(ptr::null()),
                &startup.StartupInfo,
                &mut created,
            )
        };
        if ok == 0 {
            return Err(io::Error::last_os_error());
        }
        if !created.hThread.is_null() {
            unsafe { CloseHandle(created.hThread) };
        }
        Ok(Created {
            process: created.hProcess,
            pid: created.dwProcessId,
        })
    }
    fn run(args: &[String]) -> io::Result<()> {
        if args.len() != 4 {
            return Err(io::Error::other("Invalid bootstrap arguments"));
        }
        let mapping = Mapping::open(&args[2])?;
        let result = (|| -> io::Result<()> {
            let gate =
                unsafe { OpenEventW(SYNCHRONIZATION_SYNCHRONIZE, 0, wide(&args[3]).as_ptr()) };
            if gate.is_null() {
                return Err(io::Error::last_os_error());
            }
            let gate = Handle(gate);
            if unsafe { WaitForSingleObject(gate.0, 5000) } != WAIT_OBJECT_0 {
                return Err(io::Error::other("Bootstrap gate not released"));
            }
            let n = mapping.word(32).load(Ordering::Acquire) as usize;
            if n == 0 || n > SIZE - REQUEST {
                return Err(io::Error::other("Invalid bootstrap request size"));
            }
            let request: SpawnRequest = serde_json::from_slice(unsafe {
                std::slice::from_raw_parts(mapping.view.add(REQUEST), n)
            })
            .map_err(io::Error::other)?;
            let mut command_line = super::windows_command_line(&request.file, &request.args);
            let environment = super::windows_environment_block(std::env::vars(), &request.env);
            let directory = request
                .cwd
                .filter(|cwd| !cwd.is_empty())
                .map(|cwd| wide(&cwd));
            let console_bits = mapping.slot(CONSOLE_SLOT).load(Ordering::Acquire);
            if console_bits == 0 || console_bits == u64::MAX {
                return Err(io::Error::other("Pseudoconsole handle missing"));
            }
            let console = console_bits as usize as HANDLE;
            struct CloseConsole(HANDLE);
            impl Drop for CloseConsole {
                fn drop(&mut self) {
                    unsafe { CloseHandle(self.0) };
                }
            }
            let _console = CloseConsole(console);
            let child = create_process(
                &mut command_line,
                environment.as_deref(),
                directory.as_deref(),
                Some(console),
                &[],
                None,
                false,
            )?;
            mapping.word(20).store(1, Ordering::Release);
            mapping.word(4).store(child.pid, Ordering::Relaxed);
            mapping
                .handle_word()
                .store(child.process as usize as u64, Ordering::Release);
            mapping.word(0).store(1, Ordering::Release);
            let deadline = Instant::now() + Duration::from_secs(4);
            while mapping.word(0).load(Ordering::Acquire) != 2 {
                if Instant::now() >= deadline {
                    unsafe {
                        TerminateProcess(child.process, 1);
                    }
                    return Err(io::Error::other("Payload handle was not captured"));
                }
                thread::sleep(Duration::from_millis(5));
            }
            if unsafe { WaitForSingleObject(child.process, INFINITE) } != WAIT_OBJECT_0 {
                return Err(io::Error::last_os_error());
            }
            Ok(())
        })();
        if let Err(error) = &result {
            if mapping.word(0).load(Ordering::Acquire) != 1 {
                mapping.failure(error);
            }
        }
        result
    }
    pub fn run_if_requested() -> bool {
        let args: Vec<_> = std::env::args().collect();
        if args.get(1).map(String::as_str) != Some(BOOTSTRAP_ARG) {
            return false;
        }
        std::process::exit(if run(&args).is_ok() { 0 } else { 1 });
    }
    #[cfg(test)]
    mod windows_tests {
        use super::*;
        #[test]
        fn actual_failed_job_assignment_keeps_the_private_gate_closed() {
            let security = Security::user().unwrap();
            let name = format!("Local\\huhu-gate-test-{}", uuid::Uuid::new_v4());
            let gate = event(&name, &security).unwrap();
            let job = Job::new().unwrap();
            let result = super::super::assign_and_release(
                || job.assign(INVALID_HANDLE_VALUE),
                || false,
                || {
                    if unsafe { SetEvent(gate.0) } == 0 {
                        Err(io::Error::last_os_error())
                    } else {
                        Ok(())
                    }
                },
            );
            assert!(matches!(result, Err(super::super::GateError::Assign(_))));
            assert_eq!(unsafe { WaitForSingleObject(gate.0, 0) }, WAIT_TIMEOUT);
            assert_eq!(job.active().unwrap(), 0);
        }
        #[test]
        fn private_objects_are_noninheritable_and_collision_is_rejected() {
            let security = Security::user().unwrap();
            let name = format!("Local\\huhu-map-test-{}", uuid::Uuid::new_v4());
            let mapping = Mapping::create(&name, &security).unwrap();
            assert!(Mapping::create(&name, &security).is_err());
            let mut flags = 0;
            assert_ne!(
                unsafe { GetHandleInformation(mapping._handle.0, &mut flags) },
                0
            );
            assert_eq!(flags & HANDLE_FLAG_INHERIT, 0);
            let gate = event(&format!("{name}-gate"), &security).unwrap();
            assert!(event(&format!("{name}-gate"), &security).is_err());
            assert_eq!(unsafe { WaitForSingleObject(gate.0, 0) }, WAIT_TIMEOUT);
        }
    }
}
