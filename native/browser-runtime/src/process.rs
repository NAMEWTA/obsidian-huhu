use serde_json::json;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::os::fd::{AsRawFd, FromRawFd, RawFd};
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::os::unix::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub struct Browser {
    pub pid: u32,
    pub birth: String,
    pub profile: PathBuf,
    pub runtime: String,
    key: String,
    child: Mutex<Child>,
    stop: Mutex<()>,
}
fn pair() -> io::Result<(File, File)> {
    let mut fds = [-1; 2];
    if unsafe { libc::pipe2(fds.as_mut_ptr(), libc::O_CLOEXEC) } < 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(unsafe { (File::from_raw_fd(fds[0]), File::from_raw_fd(fds[1])) })
}
fn duplicate(fd: RawFd) -> io::Result<File> {
    let n = unsafe { libc::fcntl(fd, libc::F_DUPFD_CLOEXEC, 10) };
    if n < 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(unsafe { File::from_raw_fd(n) })
    }
}
pub fn birth(pid: u32) -> io::Result<Option<String>> {
    match fs::read_to_string(format!("/proc/{pid}/stat")) {
        Ok(v) => {
            let tail = v
                .rsplit_once(')')
                .ok_or_else(|| io::Error::other("process_identity"))?
                .1;
            Ok(Some(
                tail.split_whitespace()
                    .nth(19)
                    .ok_or_else(|| io::Error::other("process_identity"))?
                    .into(),
            ))
        }
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e),
    }
}
fn live_group(pid: u32) -> io::Result<bool> {
    for entry in fs::read_dir("/proc")? {
        let entry = entry?;
        if entry.file_name().to_string_lossy().parse::<u32>().is_err() {
            continue;
        }
        let raw = match fs::read_to_string(entry.path().join("stat")) {
            Ok(v) => v,
            Err(e) if e.kind() == io::ErrorKind::NotFound => continue,
            Err(e) => return Err(e),
        };
        let Some((_, tail)) = raw.rsplit_once(')') else {
            return Err(io::Error::other("process_identity"));
        };
        let fields: Vec<_> = tail.split_whitespace().collect();
        if fields.get(2).and_then(|v| v.parse::<u32>().ok()) == Some(pid)
            && fields.first() != Some(&"Z")
        {
            return Ok(true);
        }
    }
    Ok(false)
}
fn signal_group(pid: u32, signal: i32) -> io::Result<()> {
    if unsafe { libc::kill(-(pid as i32), signal) } < 0 {
        let e = io::Error::last_os_error();
        if e.raw_os_error() != Some(libc::ESRCH) {
            return Err(e);
        }
    }
    Ok(())
}
fn reclaim_group(pid: u32, expected: &str) -> io::Result<bool> {
    if birth(pid)?.is_some_and(|actual| actual != expected) {
        return Ok(true);
    }
    signal_group(pid, libc::SIGTERM)?;
    let began = Instant::now();
    while began.elapsed() < Duration::from_secs(3) {
        if !live_group(pid)? {
            return Ok(true);
        }
        if began.elapsed() > Duration::from_millis(150) {
            signal_group(pid, libc::SIGKILL)?;
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    Ok(!live_group(pid)?)
}
fn receipt(profile: &Path) -> PathBuf {
    profile.join(".huhu-runtime-owner.json")
}
pub fn reclaim(profile: &Path, expected_runtime: Option<&str>, key: &str) -> io::Result<bool> {
    if !profile.is_absolute() || fs::canonicalize(profile)? != profile {
        return Err(io::Error::other("owner_path_invalid"));
    }
    let file = receipt(profile);
    let metadata = match fs::symlink_metadata(&file) {
        Ok(v) => v,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(true),
        Err(e) => return Err(e),
    };
    if !metadata.is_file() || metadata.len() > 8192 {
        return Err(io::Error::other("owner_invalid"));
    }
    let data = fs::read(&file)?;
    let owner = crate::receipt::open(&data, key)?;
    let runtime = owner["runtimeId"]
        .as_str()
        .ok_or_else(|| io::Error::other("owner_invalid"))?;
    if expected_runtime.is_some_and(|v| v != runtime) {
        return Err(io::Error::other("owner_mismatch"));
    }
    let pid = owner["pid"]
        .as_u64()
        .filter(|v| *v > 1 && *v <= i32::MAX as u64)
        .ok_or_else(|| io::Error::other("owner_invalid"))? as u32;
    let expected = owner["birth"]
        .as_str()
        .filter(|v| !v.is_empty() && v.bytes().all(|c| c.is_ascii_digit()))
        .ok_or_else(|| io::Error::other("owner_invalid"))?;
    if !reclaim_group(pid, expected)? {
        return Ok(false);
    }
    if fs::read(&file)? != data {
        return Err(io::Error::other("owner_changed"));
    }
    fs::remove_file(file)?;
    Ok(true)
}
impl Browser {
    pub fn spawn(
        executable: &Path,
        profile: &Path,
        runtime: &str,
        space: &str,
        ephemeral: bool,
        key: &str,
    ) -> io::Result<(Self, File, File)> {
        if !profile.is_absolute()
            || !executable.is_absolute()
            || fs::symlink_metadata(profile)?.file_type().is_symlink()
            || receipt(profile).exists()
        {
            return Err(io::Error::other("owned_profile_required"));
        }
        fs::set_permissions(profile, fs::Permissions::from_mode(0o700))?;
        let (input, writer) = pair()?;
        let (reader, output) = pair()?;
        let input = duplicate(input.as_raw_fd())?;
        let output = duplicate(output.as_raw_fd())?;
        let in_fd = input.as_raw_fd();
        let out_fd = output.as_raw_fd();
        let parent = unsafe { libc::getpid() };
        unsafe {
            libc::prctl(libc::PR_SET_CHILD_SUBREAPER, 1);
        }
        let mut command = Command::new(executable);
        command
            .args([
                "--headless=new",
                "--remote-debugging-pipe",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-sync",
                "--disable-background-networking",
                "--disable-dev-shm-usage",
            ])
            .arg(format!("--user-data-dir={}", profile.display()))
            .arg("about:blank")
            .env_clear()
            .env("PATH", "/usr/bin:/bin")
            .env("LANG", "C.UTF-8")
            .env("HOME", profile)
            .env("XDG_CONFIG_HOME", profile)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        unsafe {
            command.pre_exec(move || {
                if libc::setsid() < 0 {
                    return Err(io::Error::last_os_error());
                }
                if libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGKILL) < 0 {
                    return Err(io::Error::last_os_error());
                }
                if libc::getppid() != parent {
                    libc::_exit(127);
                }
                if libc::dup2(in_fd, 3) < 0 || libc::dup2(out_fd, 4) < 0 {
                    return Err(io::Error::last_os_error());
                }
                Ok(())
            });
        }
        let mut child = command.spawn()?;
        let pid = child.id();
        let born = match birth(pid) {
            Ok(Some(v)) => v,
            Ok(None) => {
                let _ = child.wait();
                return Err(io::Error::other("browser_exited"));
            }
            Err(error) => {
                let _ = signal_group(pid, libc::SIGKILL);
                let _ = child.wait();
                return Err(error);
            }
        };
        let browser = Self {
            pid,
            birth: born,
            profile: profile.into(),
            runtime: runtime.into(),
            key: key.into(),
            child: Mutex::new(child),
            stop: Mutex::new(()),
        };
        let record = crate::receipt::seal(
            json!({"version":2,"spaceId":space,"ephemeral":ephemeral,"runtimeId":runtime,"pid":pid,"birth":browser.birth}),
            key,
        )?;
        let saved = (|| -> io::Result<()> {
            let mut file = OpenOptions::new()
                .write(true)
                .create_new(true)
                .mode(0o600)
                .open(receipt(profile))?;
            file.write_all(&serde_json::to_vec(&record)?)?;
            file.sync_all()?;
            File::open(profile)?.sync_all()
        })();
        if let Err(e) = saved {
            let _ = signal_group(pid, libc::SIGKILL);
            let _ = browser.child.lock().unwrap().wait();
            return Err(e);
        }
        let flags = unsafe { libc::fcntl(writer.as_raw_fd(), libc::F_GETFL) };
        if flags < 0
            || unsafe { libc::fcntl(writer.as_raw_fd(), libc::F_SETFL, flags | libc::O_NONBLOCK) }
                < 0
        {
            let _ = browser.stop();
            return Err(io::Error::last_os_error());
        }
        Ok((browser, reader, writer))
    }
    pub fn stop(&self) -> io::Result<bool> {
        let _guard = self
            .stop
            .lock()
            .map_err(|_| io::Error::other("stop_poisoned"))?;
        let reclaimed = reclaim_group(self.pid, &self.birth)?;
        let _ = self.child.lock().unwrap().try_wait();
        unsafe {
            while libc::waitpid(-(self.pid as i32), std::ptr::null_mut(), libc::WNOHANG) > 0 {}
        }
        if reclaimed && receipt(&self.profile).exists() {
            let data = fs::read(receipt(&self.profile))?;
            let v = crate::receipt::open(&data, &self.key)?;
            if v["runtimeId"] != self.runtime
                || v["pid"].as_u64() != Some(self.pid as u64)
                || v["birth"] != self.birth
            {
                return Err(io::Error::other("owner_changed"));
            }
            fs::remove_file(receipt(&self.profile))?;
        }
        Ok(reclaimed)
    }
}
pub fn bounded_write(writer: &mut File, bytes: &[u8]) -> io::Result<()> {
    let begin = Instant::now();
    let mut offset = 0;
    while offset < bytes.len() {
        match writer.write(&bytes[offset..]) {
            Ok(0) => return Err(io::Error::other("pipe_closed")),
            Ok(n) => offset += n,
            Err(e) if e.kind() == io::ErrorKind::WouldBlock => {
                if begin.elapsed() > Duration::from_millis(150) {
                    return Err(io::Error::new(io::ErrorKind::TimedOut, "outcome_unknown"));
                }
                let mut fd = libc::pollfd {
                    fd: writer.as_raw_fd(),
                    events: libc::POLLOUT,
                    revents: 0,
                };
                unsafe {
                    libc::poll(&mut fd, 1, 5);
                }
            }
            Err(e) => return Err(e),
        }
    }
    Ok(())
}
