//! Native containment for one captured PTY; the helper-wide Windows job is only a death fallback.

#[cfg(unix)]
mod unix {
    use std::collections::{HashMap, HashSet};
    #[derive(Clone, Debug)]
    struct Member {
        pid: i32,
        sid: i32,
        group: i32,
        tty: u64,
        birth: u64,
        alive: bool,
    }
    #[cfg(target_os = "linux")]
    fn member(pid: i32) -> Result<Option<Member>, ()> {
        let text = match std::fs::read_to_string(format!("/proc/{pid}/stat")) {
            Ok(text) => text,
            Err(error)
                if error.kind() == std::io::ErrorKind::NotFound
                    || error.raw_os_error() == Some(libc::ESRCH) =>
            {
                return Ok(None)
            }
            Err(_) => return Err(()),
        };
        let fields: Vec<_> = text
            .get(text.rfind(')').ok_or(())? + 2..)
            .ok_or(())?
            .split_whitespace()
            .collect();
        Ok(Some(Member {
            pid,
            sid: fields.get(3).ok_or(())?.parse().map_err(|_| ())?,
            group: fields.get(2).ok_or(())?.parse().map_err(|_| ())?,
            tty: fields.get(4).ok_or(())?.parse::<i64>().map_err(|_| ())? as u64,
            birth: fields.get(19).ok_or(())?.parse().map_err(|_| ())?,
            alive: !matches!(*fields.first().ok_or(())?, "Z" | "X"),
        }))
    }
    #[cfg(target_os = "macos")]
    fn member(pid: i32) -> Result<Option<Member>, ()> {
        let mut info: libc::proc_bsdinfo = unsafe { std::mem::zeroed() };
        let size = std::mem::size_of_val(&info);
        if unsafe {
            libc::proc_pidinfo(
                pid,
                libc::PROC_PIDTBSDINFO,
                0,
                &mut info as *mut _ as _,
                size as i32,
            )
        } != size as i32
        {
            // Existence probing is diagnostic only: it never confirms cleanup by itself.
            return if unsafe { libc::kill(pid, 0) } != 0
                && std::io::Error::last_os_error().raw_os_error() == Some(libc::ESRCH)
            {
                Ok(None)
            } else {
                Err(())
            };
        }
        let sid = unsafe { libc::getsid(pid) };
        if sid < 0 {
            // Existence probing is diagnostic only: it never confirms cleanup by itself.
            return if unsafe { libc::kill(pid, 0) } != 0
                && std::io::Error::last_os_error().raw_os_error() == Some(libc::ESRCH)
            {
                Ok(None)
            } else {
                Err(())
            };
        }
        Ok(Some(Member {
            pid,
            sid,
            group: info.pbi_pgid as i32,
            tty: info.e_tdev as u64,
            birth: info
                .pbi_start_tvsec
                .saturating_mul(1_000_000)
                .saturating_add(info.pbi_start_tvusec),
            alive: info.pbi_status != 5,
        }))
    }
    fn members() -> Result<Vec<Member>, ()> {
        const MAX: usize = 16384;
        #[cfg(target_os = "linux")]
        {
            let mut result = Vec::new();
            for (count, entry) in std::fs::read_dir("/proc").map_err(|_| ())?.enumerate() {
                if count >= MAX {
                    return Err(());
                }
                let entry = entry.map_err(|_| ())?;
                if let Ok(pid) = entry.file_name().to_string_lossy().parse() {
                    if let Ok(Some(row)) = member(pid) {
                        result.push(row);
                    }
                }
            }
            Ok(result)
        }
        #[cfg(target_os = "macos")]
        {
            let mut pids = vec![0i32; MAX];
            let bytes =
                unsafe { libc::proc_listallpids(pids.as_mut_ptr() as _, (pids.len() * 4) as i32) };
            if bytes <= 0 || bytes as usize >= MAX {
                return Err(());
            }
            Ok(pids
                .into_iter()
                .take(bytes as usize)
                .filter_map(|pid| member(pid).ok().flatten())
                .collect())
        }
    }
    pub struct Scope {
        sid: i32,
        tty: u64,
        known: HashMap<i32, Member>,
        valid: bool,
        escaped: bool,
        failed_signal: bool,
    }
    impl Scope {
        pub fn capture(pid: Option<u32>) -> Self {
            let root = pid.and_then(|p| member(p as i32).ok().flatten());
            let valid = root
                .as_ref()
                .is_some_and(|m| m.sid == m.pid && m.group == m.pid && (m.tty != 0 || !m.alive));
            let sid = root.as_ref().map_or(0, |m| m.sid);
            let tty = root.as_ref().map_or(0, |m| m.tty);
            Self {
                sid,
                tty,
                known: root.into_iter().map(|m| (m.pid, m)).collect(),
                valid,
                escaped: false,
                failed_signal: false,
            }
        }
        fn observe_members(&mut self) -> Result<Vec<Member>, &'static str> {
            if !self.valid {
                return Err("scope-unverified");
            }
            let all = members().map_err(|_| "scope-unverified")?;
            self.observe_members_from(all, member)
        }
        fn observe_members_from(
            &mut self,
            all: Vec<Member>,
            lookup: impl Fn(i32) -> Result<Option<Member>, ()>,
        ) -> Result<Vec<Member>, &'static str> {
            // The bounded global scan may omit inaccessible unrelated processes. Captured identities
            // are checked separately so an unreadable owned process can never become a zero count.
            let mut checked = HashMap::new();
            for known in self.known.values() {
                checked.insert(
                    known.pid,
                    lookup(known.pid).map_err(|_| "scope-unverified")?,
                );
            }
            let root_active = checked
                .get(&self.sid)
                .and_then(|now| now.as_ref())
                .is_some_and(|now| {
                    self.known
                        .get(&self.sid)
                        .is_some_and(|old| now.birth == old.birth && now.alive)
                });
            // Session-leader exit clears the controlling tty for surviving jobs; SID membership persists.
            let tty_owned = |tty: u64| tty == self.tty || !root_active && tty == 0;
            for known in self.known.values() {
                if let Some(now) = checked
                    .get(&known.pid)
                    .and_then(|now| now.as_ref())
                    .filter(|now| now.birth == known.birth && now.alive)
                {
                    if now.sid != self.sid || !tty_owned(now.tty) {
                        self.escaped = true;
                    }
                }
            }
            let owned: Vec<_> = all
                .into_iter()
                .filter(|m| m.sid == self.sid && tty_owned(m.tty) && m.alive)
                .collect();
            for row in &owned {
                if let Some(old) = self.known.get(&row.pid) {
                    if old.birth != row.birth {
                        self.valid = false;
                        return Err("scope-unverified");
                    }
                }
                if !self.known.contains_key(&row.pid) && self.known.len() >= 16384 {
                    self.valid = false;
                    return Err("scope-unverified");
                }
                self.known.insert(row.pid, row.clone());
            }
            Ok(owned)
        }
        pub fn observe(&mut self) -> Result<usize, &'static str> {
            let count = self.observe_members()?.len();
            if self.escaped {
                return Err("escaped-member");
            }
            if self.failed_signal {
                return Err("signal-failed");
            }
            Ok(count)
        }
        pub fn signal(&mut self, force: bool) -> Result<(), &'static str> {
            let current = self.observe_members()?;
            let groups: HashSet<_> = current
                .into_iter()
                .map(|m| m.group)
                .filter(|group| *group > 1)
                .collect();
            for group in groups {
                // Recheck a captured member's birth/session/TTY immediately before targeting its group.
                let mut verified = false;
                for old in self.known.values().filter(|m| m.group == group) {
                    if let Some(now) = member(old.pid).map_err(|_| "scope-unverified")? {
                        verified |= now.birth == old.birth
                            && now.sid == self.sid
                            && now.tty == old.tty
                            && now.group == group;
                    }
                }
                if !verified {
                    continue;
                }
                let result = unsafe {
                    libc::killpg(group, if force { libc::SIGKILL } else { libc::SIGHUP })
                };
                if result != 0
                    && std::io::Error::last_os_error().raw_os_error() != Some(libc::ESRCH)
                {
                    self.failed_signal = true;
                }
                if !force {
                    unsafe {
                        libc::killpg(group, libc::SIGCONT);
                    }
                }
            }
            if self.failed_signal {
                Err("signal-failed")
            } else {
                Ok(())
            }
        }
        pub fn name(&self) -> &'static str {
            "unix-session"
        }
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn scope() -> Scope {
            let root = Member {
                pid: 42,
                sid: 42,
                group: 42,
                tty: 123,
                birth: 999,
                alive: true,
            };
            Scope {
                sid: 42,
                tty: 123,
                known: [(42, root)].into(),
                valid: true,
                escaped: false,
                failed_signal: false,
            }
        }
        #[test]
        fn unreadable_captured_identity_is_not_confirmed_absent() {
            assert_eq!(
                scope()
                    .observe_members_from(vec![], |_| Err(()))
                    .unwrap_err(),
                "scope-unverified"
            );
        }
        #[test]
        fn confirmed_disappearance_remains_a_zero_scope() {
            assert!(scope()
                .observe_members_from(vec![], |_| Ok(None))
                .unwrap()
                .is_empty());
        }
    }
}
#[cfg(unix)]
pub use unix::Scope;

#[cfg(windows)]
mod windows {
    use std::{
        io, mem, ptr,
        sync::{
            atomic::{AtomicBool, Ordering},
            Arc,
        },
    };
    use windows_sys::Win32::{
        Foundation::{CloseHandle, HANDLE},
        System::{JobObjects::*, Threading::GetCurrentProcess},
    };
    static HELPER_CONTAINED: AtomicBool = AtomicBool::new(false);
    #[derive(Debug)]
    pub struct Job(HANDLE);
    unsafe impl Send for Job {}
    unsafe impl Sync for Job {}
    impl Drop for Job {
        fn drop(&mut self) {
            unsafe {
                CloseHandle(self.0);
            }
        }
    }
    impl Job {
        pub fn new() -> io::Result<Self> {
            let handle = unsafe { CreateJobObjectW(ptr::null(), ptr::null()) };
            if handle.is_null() {
                return Err(io::Error::last_os_error());
            }
            let job = Self(handle);
            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { mem::zeroed() };
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if unsafe {
                SetInformationJobObject(
                    handle,
                    JobObjectExtendedLimitInformation,
                    &info as *const _ as _,
                    mem::size_of_val(&info) as u32,
                )
            } == 0
            {
                return Err(io::Error::last_os_error());
            }
            Ok(job)
        }
        pub fn assign(&self, process: HANDLE) -> io::Result<()> {
            if unsafe { AssignProcessToJobObject(self.0, process) } == 0 {
                return Err(io::Error::last_os_error());
            }
            let mut belongs = 0;
            if unsafe { IsProcessInJob(process, self.0, &mut belongs) } == 0 || belongs == 0 {
                return Err(io::Error::last_os_error());
            }
            Ok(())
        }
        pub fn terminate(&self) -> io::Result<()> {
            if unsafe { TerminateJobObject(self.0, 1) } == 0 {
                Err(io::Error::last_os_error())
            } else {
                Ok(())
            }
        }
        #[allow(dead_code)]
        pub fn process_ids(&self) -> io::Result<Vec<u32>> {
            #[repr(C)]
            struct ProcessIdList {
                assigned: u32,
                count: u32,
                ids: [usize; 32],
            }
            let mut list = ProcessIdList {
                assigned: 0,
                count: 0,
                ids: [0; 32],
            };
            if unsafe {
                QueryInformationJobObject(
                    self.0,
                    JobObjectBasicProcessIdList,
                    &mut list as *mut _ as _,
                    mem::size_of_val(&list) as u32,
                    ptr::null_mut(),
                )
            } == 0
            {
                return Err(io::Error::last_os_error());
            }
            let count = list.count as usize;
            if list.assigned as usize != count || count > list.ids.len() {
                return Err(io::Error::other("job process list is incomplete"));
            }
            Ok(list.ids[..count].iter().map(|id| *id as u32).collect())
        }
        pub fn active(&self) -> io::Result<usize> {
            let mut info: JOBOBJECT_BASIC_ACCOUNTING_INFORMATION = unsafe { mem::zeroed() };
            if unsafe {
                QueryInformationJobObject(
                    self.0,
                    JobObjectBasicAccountingInformation,
                    &mut info as *mut _ as _,
                    mem::size_of_val(&info) as u32,
                    ptr::null_mut(),
                )
            } == 0
            {
                return Err(io::Error::last_os_error());
            }
            Ok(info.ActiveProcesses as usize)
        }
    }
    pub struct HelperJob {
        _job: Job,
    }
    pub fn kill_children_with_helper() -> io::Result<HelperJob> {
        let job = Job::new()?;
        job.assign(unsafe { GetCurrentProcess() })?;
        HELPER_CONTAINED.store(true, Ordering::SeqCst);
        Ok(HelperJob { _job: job })
    }
    pub struct Scope {
        pub job: Arc<Job>,
        failed_signal: bool,
    }
    impl Scope {
        pub fn new() -> io::Result<Self> {
            if !HELPER_CONTAINED.load(Ordering::SeqCst) {
                return Err(io::Error::other("Helper containment is unavailable"));
            }
            Ok(Self {
                job: Arc::new(Job::new()?),
                failed_signal: false,
            })
        }
        pub fn observe(&mut self) -> Result<usize, &'static str> {
            let n = self.job.active().map_err(|_| "scope-unverified")?;
            if self.failed_signal {
                Err("signal-failed")
            } else {
                Ok(n)
            }
        }
        pub fn signal(&mut self, force: bool) -> Result<(), &'static str> {
            if force && self.job.terminate().is_err() {
                self.failed_signal = true;
                return Err("signal-failed");
            }
            Ok(())
        }
        pub fn name(&self) -> &'static str {
            "windows-job"
        }
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn failed_job_query_or_termination_cannot_become_a_zero_count() {
            let mut scope = Scope {
                job: Arc::new(Job(ptr::null_mut())),
                failed_signal: false,
            };
            assert_eq!(scope.observe(), Err("scope-unverified"));
            assert_eq!(scope.signal(true), Err("signal-failed"));
            assert!(scope.observe().is_err());
        }
    }
}
#[cfg(windows)]
pub use windows::{kill_children_with_helper, Job, Scope};
#[cfg(not(windows))]
pub fn kill_children_with_helper() -> Result<(), std::io::Error> {
    Ok(())
}
