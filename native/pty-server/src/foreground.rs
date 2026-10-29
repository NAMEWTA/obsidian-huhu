//! Observations of one captured PTY root. No process-tree/name heuristic is a positive foreground proof.
use serde_json::Value;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Rejection {
    Unsupported,
    Closed,
    NotReady,
    ForegroundChanged,
    RecipeChanged,
}
impl Rejection {
    pub fn reason(self) -> &'static str {
        match self {
            Self::Unsupported => "unsupported",
            Self::Closed => "closed",
            Self::NotReady => "not-ready",
            Self::ForegroundChanged => "foreground-changed",
            Self::RecipeChanged => "recipe-changed",
        }
    }
}
pub fn supported() -> bool {
    cfg!(target_os = "linux")
}
/// At most two original resolution paths. No PATH/env or artifact payload is copied into the binding.
#[derive(Clone)]
pub struct Launch {
    paths: Vec<(std::path::PathBuf, std::path::PathBuf)>,
}
impl Launch {
    fn verify(&self) -> Result<(), Rejection> {
        for (path, target) in &self.paths {
            if std::fs::canonicalize(path).ok().as_ref() != Some(target) {
                return Err(Rejection::RecipeChanged);
            }
        }
        Ok(())
    }
}
#[cfg(target_os = "linux")]
mod linux {
    use super::*;
    use std::{
        fs::{self, File, OpenOptions},
        io::Read,
        os::{
            fd::{AsRawFd, FromRawFd},
            unix::fs::{MetadataExt, OpenOptionsExt},
        },
        path::Path,
    };
    #[derive(Clone, Debug)]
    struct Stat {
        state: u8,
        group: i32,
        sid: i32,
        tty: i64,
        birth: u64,
    }
    fn parse_stat(bytes: &[u8]) -> Result<Stat, Rejection> {
        let text = std::str::from_utf8(bytes).map_err(|_| Rejection::NotReady)?;
        let fields: Vec<_> = text
            .get(text.rfind(')').ok_or(Rejection::NotReady)? + 2..)
            .ok_or(Rejection::NotReady)?
            .split_whitespace()
            .collect();
        Ok(Stat {
            state: fields
                .first()
                .and_then(|v| v.as_bytes().first())
                .copied()
                .ok_or(Rejection::NotReady)?,
            group: fields
                .get(2)
                .ok_or(Rejection::NotReady)?
                .parse()
                .map_err(|_| Rejection::NotReady)?,
            sid: fields
                .get(3)
                .ok_or(Rejection::NotReady)?
                .parse()
                .map_err(|_| Rejection::NotReady)?,
            tty: fields
                .get(4)
                .ok_or(Rejection::NotReady)?
                .parse()
                .map_err(|_| Rejection::NotReady)?,
            birth: fields
                .get(19)
                .ok_or(Rejection::NotReady)?
                .parse()
                .map_err(|_| Rejection::NotReady)?,
        })
    }
    fn open_at(proc: &File, name: &std::ffi::CStr, flags: i32) -> Result<File, Rejection> {
        let fd = unsafe { libc::openat(proc.as_raw_fd(), name.as_ptr(), flags | libc::O_CLOEXEC) };
        if fd < 0 {
            let error = std::io::Error::last_os_error();
            return Err(
                if matches!(error.raw_os_error(), Some(libc::ENOENT | libc::ESRCH)) {
                    Rejection::Closed
                } else {
                    Rejection::NotReady
                },
            );
        }
        Ok(unsafe { File::from_raw_fd(fd) })
    }
    fn stat(proc: &File) -> Result<Stat, Rejection> {
        let f = open_at(proc, c"stat", libc::O_RDONLY | libc::O_NOFOLLOW)?;
        let mut bytes = Vec::new();
        f.take(4097)
            .read_to_end(&mut bytes)
            .map_err(|_| Rejection::NotReady)?;
        if bytes.len() > 4096 {
            return Err(Rejection::NotReady);
        }
        parse_stat(&bytes)
    }
    fn file_matches(value: &Value) -> Result<(), Rejection> {
        let path = Path::new(value["path"].as_str().ok_or(Rejection::RecipeChanged)?);
        let real = fs::canonicalize(path).map_err(|_| Rejection::RecipeChanged)?;
        let m = fs::metadata(&real).map_err(|_| Rejection::RecipeChanged)?;
        if !path.is_absolute()
            || real != path
            || !m.is_file()
            || value["dev"].as_str() != Some(m.dev().to_string().as_str())
            || value["ino"].as_str() != Some(m.ino().to_string().as_str())
        {
            return Err(Rejection::RecipeChanged);
        }
        Ok(())
    }
    fn executable(
        file: &str,
        cwd: &Path,
        env: &std::collections::HashMap<String, String>,
    ) -> Result<std::path::PathBuf, Rejection> {
        if file.contains('/') {
            let p = cwd.join(file);
            if p.as_os_str().len() > 4096 {
                return Err(Rejection::RecipeChanged);
            }
            return Ok(p);
        }
        let path = env
            .get("PATH")
            .cloned()
            .or_else(|| std::env::var("PATH").ok())
            .ok_or(Rejection::RecipeChanged)?;
        if path.len() > 65536 {
            return Err(Rejection::RecipeChanged);
        }
        for (n, dir) in path.split(':').enumerate() {
            if n >= 64 || !Path::new(dir).is_absolute() {
                return Err(Rejection::RecipeChanged);
            }
            let candidate = Path::new(dir).join(file);
            let Some(raw) = candidate
                .to_str()
                .and_then(|p| std::ffi::CString::new(p).ok())
            else {
                continue;
            };
            if unsafe { libc::access(raw.as_ptr(), libc::X_OK) } == 0 {
                if candidate.as_os_str().len() > 4096 {
                    return Err(Rejection::RecipeChanged);
                }
                return Ok(candidate);
            }
        }
        Err(Rejection::RecipeChanged)
    }
    pub fn validate(
        file: &str,
        args: &[String],
        cwd: Option<&str>,
        env: &std::collections::HashMap<String, String>,
        recipe: &Value,
    ) -> Result<Launch, Rejection> {
        file_matches(&recipe["executable"])?;
        file_matches(&recipe["entry"])?;
        let cwd = match cwd.filter(|s| !s.is_empty()) {
            Some(p) => fs::canonicalize(p).map_err(|_| Rejection::RecipeChanged)?,
            None => std::env::current_dir().map_err(|_| Rejection::RecipeChanged)?,
        };
        let program = executable(file, &cwd, env)?;
        let invoked = fs::canonicalize(&program).map_err(|_| Rejection::RecipeChanged)?;
        let mut paths = vec![(program, invoked.clone())];
        let node = Path::new(
            recipe["executable"]["path"]
                .as_str()
                .ok_or(Rejection::RecipeChanged)?,
        );
        let entry = Path::new(
            recipe["entry"]["path"]
                .as_str()
                .ok_or(Rejection::RecipeChanged)?,
        );
        if invoked == node {
            if args.first().is_some_and(|s| s.starts_with('-'))
                || args
                    .first()
                    .and_then(|p| fs::canonicalize(cwd.join(p)).ok())
                    .as_deref()
                    != Some(entry)
            {
                return Err(Rejection::RecipeChanged);
            }
            let original = cwd.join(&args[0]);
            if original.as_os_str().len() > 4096 {
                return Err(Rejection::RecipeChanged);
            }
            paths.push((original, entry.to_owned()));
        } else if invoked == entry {
            let f = File::open(entry).map_err(|_| Rejection::RecipeChanged)?;
            let mut first = Vec::new();
            f.take(128)
                .read_to_end(&mut first)
                .map_err(|_| Rejection::RecipeChanged)?;
            if first.split(|b| *b == b'\n').next() != Some(b"#!/usr/bin/env node".as_slice())
                || fs::canonicalize(executable("node", &cwd, env)?)
                    .ok()
                    .as_deref()
                    != Some(node)
            {
                return Err(Rejection::RecipeChanged);
            }
            let node_path = executable("node", &cwd, env)?;
            paths.push((node_path, node.to_owned()));
        } else {
            return Err(Rejection::RecipeChanged);
        }
        Ok(Launch { paths })
    }
    pub struct Capture {
        proc: File,
        pid: u32,
        born: Stat,
        recipe: Value,
        launch: Launch,
    }
    impl Capture {
        pub fn capture(pid: u32, recipe: &Value, launch: Launch) -> Result<Self, Rejection> {
            if !super::supported() {
                return Err(Rejection::Unsupported);
            }
            let proc = OpenOptions::new()
                .read(true)
                .custom_flags(libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_CLOEXEC)
                .open(format!("/proc/{pid}"))
                .map_err(|_| Rejection::Closed)?;
            if proc.metadata().map_err(|_| Rejection::NotReady)?.uid() != unsafe { libc::geteuid() }
            {
                return Err(Rejection::NotReady);
            }
            let born = stat(&proc)?;
            if born.sid != pid as i32
                || born.group != pid as i32
                || born.tty == 0
                || matches!(born.state, b'Z' | b'X')
            {
                return Err(Rejection::NotReady);
            }
            // exec shebang/env resolution can still be in flight. Capture lifetime here; authenticate the actual Node image and foreground only at the app handshake.
            Ok(Self {
                proc,
                pid,
                born,
                recipe: recipe.clone(),
                launch,
            })
        }
        pub fn pid(&self) -> u32 {
            self.pid
        }

        pub fn verify(&self, foreground: Option<i32>, peer_pid: u32) -> Result<(), Rejection> {
            if self.proc.metadata().map_err(|_| Rejection::NotReady)?.uid()
                != unsafe { libc::geteuid() }
            {
                return Err(Rejection::NotReady);
            }
            let now = stat(&self.proc)?;
            if now.birth != self.born.birth || matches!(now.state, b'Z' | b'X') {
                return Err(Rejection::Closed);
            }
            if peer_pid != self.pid
                || now.sid != self.born.sid
                || now.tty != self.born.tty
                || now.group != self.born.group
                || foreground != Some(self.born.group)
            {
                return Err(Rejection::ForegroundChanged);
            }
            if matches!(now.state, b'T' | b't') {
                return Err(Rejection::NotReady);
            }
            self.launch.verify()?;
            file_matches(&self.recipe["executable"])?;
            file_matches(&self.recipe["entry"])?;
            let exe = open_at(&self.proc, c"exe", libc::O_PATH)?;
            let m = exe.metadata().map_err(|_| Rejection::NotReady)?;
            if self.recipe["executable"]["dev"].as_str() != Some(m.dev().to_string().as_str())
                || self.recipe["executable"]["ino"].as_str() != Some(m.ino().to_string().as_str())
            {
                return Err(Rejection::RecipeChanged);
            }
            let after = stat(&self.proc)?;
            if after.birth != now.birth
                || after.sid != now.sid
                || after.tty != now.tty
                || after.group != now.group
            {
                return Err(Rejection::ForegroundChanged);
            }
            Ok(())
        }
    }
}
#[cfg(target_os = "linux")]
pub use linux::{validate as validate_launch, Capture};
#[cfg(not(target_os = "linux"))]
pub struct Capture;
#[cfg(not(target_os = "linux"))]
impl Capture {
    pub fn capture(_: u32, _: &Value, _: Launch) -> Result<Self, Rejection> {
        Err(Rejection::Unsupported)
    }
    pub fn verify(&self, _: Option<i32>, _: u32) -> Result<(), Rejection> {
        Err(Rejection::Unsupported)
    }
    pub fn pid(&self) -> u32 {
        0
    }
}
#[cfg(not(target_os = "linux"))]
pub fn validate_launch(
    _: &str,
    _: &[String],
    _: Option<&str>,
    _: &std::collections::HashMap<String, String>,
    _: &Value,
) -> Result<Launch, Rejection> {
    Err(Rejection::Unsupported)
}
