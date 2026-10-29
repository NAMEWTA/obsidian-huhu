//! Trusted bootstrap control for the existing helper executable and ConPTY.
#[cfg(any(windows, test))]
#[derive(Debug)]
enum GateError<E> {
    Assign(E),
    Cancelled,
    Release(E),
}
#[cfg(any(windows, test))]
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
#[cfg(windows)]
pub use platform::{run_if_requested, spawn};
#[cfg(windows)]
mod platform {
    use crate::{
        job::Job,
        session::{SpawnFailure, SpawnRequest, Stop},
    };
    use portable_pty::{Child, ChildKiller, CommandBuilder, ExitStatus, SlavePty};
    use std::{
        fs::OpenOptions,
        io, mem,
        os::windows::io::{AsRawHandle, RawHandle},
        process::{Command, Stdio},
        ptr,
        sync::{
            atomic::{AtomicU32, AtomicU64, Ordering},
            Arc, Mutex,
        },
        thread,
        time::{Duration, Instant},
    };
    use windows_sys::Win32::{
        Foundation::*,
        Security::{Authorization::*, Cryptography::*, *},
        System::{Memory::*, Threading::*},
    };
    const SIZE: usize = 256 * 1024;
    const REQUEST: usize = 1024;
    const BOOTSTRAP_ARG: &str = "--huhu-session-bootstrap";
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
    struct Security(PSECURITY_DESCRIPTOR);
    impl Drop for Security {
        fn drop(&mut self) {
            unsafe {
                LocalFree(self.0);
            }
        }
    }
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
        fn failure(&self, error: &io::Error) {
            self.word(24)
                .store(error.raw_os_error().unwrap_or(1) as u32, Ordering::Relaxed);
            self.word(0).store(3, Ordering::Release);
        }
    }
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
    fn cleanup(anchor: Box<dyn Child + Send + Sync>, job: &Job, mapping: &Mapping) -> bool {
        let _ = job.terminate();
        // Assignment failure still leaves only our trusted gated anchor. Terminate that captured
        // handle too: an empty Session Job cannot reap a process that was never assigned to it.
        let exited = anchor.as_raw_handle().is_some_and(|raw| {
            let handle = raw as HANDLE;
            if unsafe { WaitForSingleObject(handle, 0) } != WAIT_OBJECT_0 {
                unsafe {
                    TerminateProcess(handle, 1);
                }
            }
            (unsafe { WaitForSingleObject(handle, 1500) }) == WAIT_OBJECT_0
        });
        drop(anchor);
        // The mapped value belongs to the anchor process, not the helper. Only the helper
        // duplicates it after observing readiness; cancellation can never leak a foreign transfer.
        let deadline = Instant::now() + Duration::from_millis(500);
        while Instant::now() < deadline {
            if matches!(job.active(), Ok(0)) {
                return exited;
            }
            thread::sleep(Duration::from_millis(10));
        }
        // No payload was published. A console host pulled into this job is not the user program;
        // it stays until the pseudoconsole closes, which the caller does on this failure path.
        let no_payload = mapping.word(20).load(Ordering::Acquire) == 0;
        let hosts_only = matches!(job.process_ids(), Ok(ids)
            if !ids.is_empty() && ids.iter().copied().all(is_console_host));
        exited && no_payload && hosts_only
    }
    fn is_console_host(pid: u32) -> bool {
        let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
        if handle.is_null() {
            return false;
        }
        let handle = Handle(handle);
        let mut name = [0u16; 512];
        let mut len = name.len() as u32;
        if unsafe {
            QueryFullProcessImageNameW(handle.0, PROCESS_NAME_WIN32, name.as_mut_ptr(), &mut len)
        } == 0
        {
            return false;
        }
        let name = String::from_utf16_lossy(&name[..len as usize]).to_ascii_lowercase();
        name.ends_with("\\conhost.exe") || name.ends_with("\\openconsole.exe")
    }
    fn reject(
        anchor: Box<dyn Child + Send + Sync>,
        job: &Job,
        mapping: &Mapping,
        known_none: bool,
        message: impl std::fmt::Display,
    ) -> SpawnFailure {
        let confirmed = cleanup(anchor, job, mapping);
        SpawnFailure {
            code: if known_none && confirmed {
                "program-rejected"
            } else {
                "unconfirmed"
            },
            effect: if known_none && confirmed {
                "none"
            } else {
                "unknown"
            },
            message: message.to_string(),
        }
    }
    pub fn spawn(
        slave: &dyn SlavePty,
        request: &SpawnRequest,
        id: u32,
        job: &Arc<Job>,
        stop: &Arc<Mutex<Stop>>,
    ) -> Result<Box<dyn Child + Send + Sync>, SpawnFailure> {
        let prepared = (|| -> io::Result<_> {
            let mut nonce = [0u8; 16];
            if unsafe {
                BCryptGenRandom(
                    ptr::null_mut(),
                    nonce.as_mut_ptr(),
                    nonce.len() as u32,
                    BCRYPT_USE_SYSTEM_PREFERRED_RNG,
                )
            } < 0
            {
                return Err(io::Error::other("Bootstrap random source failed"));
            }
            let name = format!(
                "Local\\huhu-{}-{id}-{}",
                std::process::id(),
                nonce.iter().map(|b| format!("{b:02x}")).collect::<String>()
            );
            let security = Security::user()?;
            let mapping = Mapping::create(&name, &security)?;
            let gate_name = format!("{name}-gate");
            let gate = event(&gate_name, &security)?;
            let body = serde_json::to_vec(request).map_err(io::Error::other)?;
            if body.len() > SIZE - REQUEST {
                return Err(io::Error::other("Bootstrap request is too large"));
            }
            unsafe {
                ptr::copy_nonoverlapping(body.as_ptr(), mapping.view.add(REQUEST), body.len());
            }
            mapping.word(32).store(body.len() as u32, Ordering::Release);
            let mut command = CommandBuilder::new(std::env::current_exe()?);
            command.args([BOOTSTRAP_ARG, &name, &gate_name]);
            for (k, v) in &request.env {
                command.env(k, v);
            }
            if let Some(cwd) = &request.cwd {
                command.cwd(cwd);
            }
            Ok((mapping, gate, command))
        })()
        .map_err(|e| SpawnFailure::before_spawn("pty-unavailable", e))?;
        let (mapping, gate, command) = prepared;
        let anchor = slave
            .spawn_command(command)
            .map_err(|e| SpawnFailure::before_spawn("pty-unavailable", e))?;
        let Some(raw) = anchor.as_raw_handle() else {
            return Err(reject(
                anchor,
                job,
                &mapping,
                true,
                "Bootstrap handle missing",
            ));
        };
        if let Err(error) = super::assign_and_release(
            || job.assign(raw as _),
            || stop.lock().unwrap().at.is_some(),
            || {
                if unsafe { SetEvent(gate.0) } != 0 {
                    Ok(())
                } else {
                    Err(io::Error::last_os_error())
                }
            },
        ) {
            return Err(reject(anchor, job, &mapping, true, format!("{error:?}")));
        }
        let deadline = Instant::now() + Duration::from_secs(4);
        loop {
            match mapping.word(0).load(Ordering::Acquire) {
                1 => {
                    let local = mapping.handle_word().load(Ordering::Acquire) as usize as HANDLE;
                    let mut duplicate = ptr::null_mut();
                    if unsafe {
                        DuplicateHandle(
                            raw as HANDLE,
                            local,
                            GetCurrentProcess(),
                            &mut duplicate,
                            0,
                            0,
                            DUPLICATE_SAME_ACCESS,
                        )
                    } == 0
                    {
                        return Err(reject(
                            anchor,
                            job,
                            &mapping,
                            false,
                            io::Error::last_os_error(),
                        ));
                    }
                    let handle = duplicate;
                    let pid = mapping.word(4).load(Ordering::Acquire);
                    if handle.is_null() {
                        return Err(reject(
                            anchor,
                            job,
                            &mapping,
                            false,
                            "Payload handle missing",
                        ));
                    }
                    let handle = Handle(handle);
                    if unsafe { GetProcessId(handle.0) } != pid {
                        return Err(reject(
                            anchor,
                            job,
                            &mapping,
                            false,
                            "Payload handle identity mismatch",
                        ));
                    }
                    mapping.word(0).store(2, Ordering::Release);
                    return Ok(Box::new(Payload {
                        handle,
                        _anchor: anchor,
                        job: job.clone(),
                        pid,
                    }));
                }
                3 => {
                    let none = mapping.word(20).load(Ordering::Acquire) == 0;
                    let error = io::Error::from_raw_os_error(
                        mapping.word(24).load(Ordering::Acquire) as i32,
                    );
                    return Err(reject(anchor, job, &mapping, none, error));
                }
                _ => {
                    if stop.lock().unwrap().at.is_some() || Instant::now() >= deadline {
                        let status = mapping.word(0).load(Ordering::Acquire);
                        if status == 1 || status == 3 {
                            continue;
                        }
                        // Word 20 is published only after the payload process exists.
                        // A confirmed empty job is then program-rejected, not an unknown effect.
                        let none = mapping.word(20).load(Ordering::Acquire) == 0;
                        return Err(reject(
                            anchor,
                            job,
                            &mapping,
                            none,
                            "Bootstrap launch interrupted or timed out",
                        ));
                    }
                }
            }
            thread::sleep(Duration::from_millis(5));
        }
    }
    #[derive(Debug)]
    struct Payload {
        handle: Handle,
        _anchor: Box<dyn Child + Send + Sync>,
        job: Arc<Job>,
        pid: u32,
    }
    impl ChildKiller for Payload {
        fn kill(&mut self) -> io::Result<()> {
            self.job.terminate()
        }
        fn clone_killer(&self) -> Box<dyn ChildKiller + Send + Sync> {
            Box::new(JobKiller(self.job.clone()))
        }
    }
    #[derive(Debug)]
    struct JobKiller(Arc<Job>);
    impl ChildKiller for JobKiller {
        fn kill(&mut self) -> io::Result<()> {
            self.0.terminate()
        }
        fn clone_killer(&self) -> Box<dyn ChildKiller + Send + Sync> {
            Box::new(Self(self.0.clone()))
        }
    }
    impl Child for Payload {
        fn try_wait(&mut self) -> io::Result<Option<ExitStatus>> {
            match unsafe { WaitForSingleObject(self.handle.0, 0) } {
                WAIT_TIMEOUT => Ok(None),
                WAIT_OBJECT_0 => self.status().map(Some),
                _ => Err(io::Error::last_os_error()),
            }
        }
        fn wait(&mut self) -> io::Result<ExitStatus> {
            if unsafe { WaitForSingleObject(self.handle.0, INFINITE) } != WAIT_OBJECT_0 {
                return Err(io::Error::last_os_error());
            }
            self.status()
        }
        fn process_id(&self) -> Option<u32> {
            Some(self.pid)
        }
        fn as_raw_handle(&self) -> Option<RawHandle> {
            Some(self.handle.0 as _)
        }
    }
    impl Payload {
        fn status(&self) -> io::Result<ExitStatus> {
            let mut code = 0;
            if unsafe { GetExitCodeProcess(self.handle.0, &mut code) } == 0 {
                return Err(io::Error::last_os_error());
            }
            Ok(ExitStatus::with_exit_code(code))
        }
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
            let mut command = Command::new(&request.file);
            command.args(&request.args).envs(&request.env);
            if let Some(cwd) = request.cwd.filter(|c| !c.is_empty()) {
                command.current_dir(cwd);
            }
            let input = OpenOptions::new().read(true).write(true).open("CONIN$")?;
            let output = OpenOptions::new().read(true).write(true).open("CONOUT$")?;
            command
                .stdin(Stdio::from(input))
                .stdout(Stdio::from(output.try_clone()?))
                .stderr(Stdio::from(output));
            let mut child = command.spawn()?;
            mapping.word(20).store(1, Ordering::Release);
            mapping.word(4).store(child.id(), Ordering::Relaxed);
            mapping.handle_word().store(
                AsRawHandle::as_raw_handle(&child) as usize as u64,
                Ordering::Release,
            );
            mapping.word(0).store(1, Ordering::Release);
            let deadline = Instant::now() + Duration::from_secs(4);
            while mapping.word(0).load(Ordering::Acquire) != 2 {
                if Instant::now() >= deadline {
                    return Err(io::Error::other("Payload handle was not captured"));
                }
                thread::sleep(Duration::from_millis(5));
            }
            let _ = child.wait()?;
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
