//! Purpose-separated, original-PTY-owned editor transactions. No terminal input is generated here.
use crate::{
    foreground,
    local_control::{codec, ipc, wire_generated as w},
    outbox::{BrokerClass, BrokerPermit, Outbox},
};
use serde_json::{json, Value};
use std::{
    collections::{BTreeMap, HashMap},
    io::{self, Write},
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        mpsc, Arc, Mutex, Weak,
    },
    thread,
    time::{Duration, Instant},
};
/// Implemented by the original input queue; the asynchronous editor action retains its existing charge.
pub trait Owner: Send + Sync {
    fn foreground(&self) -> Option<i32>;
    fn release(&self, op: u32, bytes: usize);
}
#[derive(Clone)]
pub struct Service {
    core: Arc<Core>,
}
struct Core {
    out: Outbox,
    entries: Mutex<HashMap<u32, Arc<Binding>>>,
    runtime: Mutex<Option<Runtime>>,
    closing: AtomicBool,
    operations: Arc<AtomicUsize>,
}
struct Runtime {
    endpoint: String,
    worker: Option<thread::JoinHandle<io::Result<()>>>,
    outcome: Option<Result<(), (io::ErrorKind, String)>>,
}
pub struct Binding {
    pub sid: u32,
    pub id: String,
    pub identity: Value,
    recipe: Value,
    launch: foreground::Launch,
    token: String,
    cap: PathBuf,
    cap_id: Option<ipc::platform::Identity>,
    prepared: bool,
    out: Outbox,
    owner: Weak<dyn Owner>,
    state: Mutex<BindingState>,
    done: AtomicBool,
    operations: Arc<AtomicUsize>,
}
struct BindingState {
    root: Option<Arc<foreground::Capture>>,
    root_ended: bool,
    auth_checks: usize,
    cleanup: Option<thread::JoinHandle<io::Result<()>>>,
    cleanup_retry: Instant,
    removed: bool,
    source: Option<String>,
    closing: Option<&'static str>,
    ready: Option<BrokerPermit>,
    closed: Option<BrokerPermit>,
    closed_io: Option<Arc<AtomicBool>>,
    ops: BTreeMap<u32, Arc<Operation>>,
}
struct OperationSlot(Arc<AtomicUsize>);
impl Drop for OperationSlot {
    fn drop(&mut self) {
        self.0.fetch_sub(1, Ordering::AcqRel);
    }
}
pub struct Operation {
    _slot: OperationSlot,
    pub op: u32,
    pub total: usize,
    pub deadline: Instant,
    binding: Weak<Binding>,
    source: String,
    state: Mutex<OpState>,
}
struct OpState {
    body: Vec<u8>,
    ready: bool,
    claimed: bool,
    dispatched: bool,
    body_sent: bool,
    sending: bool,
    cancelled: Option<&'static str>,
    result: Option<Value>,
    app_result: bool,
    app_settled: bool,
    check: Option<mpsc::Receiver<Result<(), foreground::Rejection>>>,
    worker: Option<thread::JoinHandle<()>>,
    permits: Vec<BrokerPermit>,
    settle_io: Option<Arc<AtomicBool>>,
    released: bool,
    charged: bool,
}
fn outcome(state: &str, reason: &str) -> Value {
    json!({"state":state,"effect":state,"reason":reason})
}
fn base(kind: &str, b: &Binding) -> Value {
    json!({"type":kind,"version":1,"sid":b.sid,"editorId":b.id})
}
fn emit(
    mut permits: Vec<BrokerPermit>,
    out: &Outbox,
    sid: u32,
    value: Value,
) -> (Vec<BrokerPermit>, Option<Arc<AtomicBool>>) {
    let Some(permit) = permits.pop() else {
        return (permits, None);
    };
    let done = Arc::new(AtomicBool::new(false));
    if let Ok(body) = codec::encode_editor(&value, "native-to-node", None) {
        if permit.send_editor(sid, body, done.clone()).is_ok() {
            return (permits, Some(done));
        }
    }
    // A failed local outbox handoff is never delivery evidence. The original transport closes it.
    let _ = out;
    (permits, None)
}
impl Service {
    pub fn new(out: Outbox) -> Self {
        Self {
            core: Arc::new(Core {
                out,
                entries: Mutex::new(HashMap::new()),
                runtime: Mutex::new(None),
                closing: AtomicBool::new(false),
                operations: Arc::new(AtomicUsize::new(0)),
            }),
        }
    }
    pub fn enroll(
        &self,
        sid: u32,
        launch: &Value,
        guard: foreground::Launch,
        owner: Weak<dyn Owner>,
    ) -> io::Result<Arc<Binding>> {
        codec::check_editor_launch(launch).map_err(|_| io::ErrorKind::InvalidInput)?;
        if !foreground::supported() || self.core.closing.load(Ordering::Acquire) {
            return Err(io::ErrorKind::Unsupported.into());
        }
        let mut runtime = self.core.runtime.lock().unwrap();
        if self.core.closing.load(Ordering::Acquire) {
            return Err(io::ErrorKind::Unsupported.into());
        }
        if runtime.is_none() {
            let root = ipc::platform::runtime_root()?;
            let nonce = ipc::platform::nonce()?;
            let endpoint = ipc::platform::endpoint(&root, &nonce);
            let listener = ipc::platform::listen(&endpoint)?;
            let core = Arc::downgrade(&self.core);
            *runtime = Some(Runtime {
                endpoint,
                worker: Some(thread::spawn(move || run(core, listener))),
                outcome: None,
            });
        }
        let endpoint = runtime.as_ref().unwrap().endpoint.clone();
        let entries = self.core.entries.lock().unwrap();
        if entries.len() >= w::EDITOR_BINDINGS || entries.contains_key(&sid) {
            return Err(io::ErrorKind::WouldBlock.into());
        }
        drop(entries);
        let ready = self
            .core
            .out
            .reserve_broker(BrokerClass::EditorLife)
            .ok_or(io::ErrorKind::WouldBlock)?;
        let closed = self
            .core
            .out
            .reserve_broker(BrokerClass::EditorLife)
            .ok_or(io::ErrorKind::WouldBlock)?;
        let id = ipc::platform::nonce()?;
        let token = ipc::platform::nonce()?;
        let root = ipc::platform::runtime_root()?;
        let cap = root.join(format!("e{}.json", &id[..32]));
        let value = json!({"purpose":"huhu-editor","version":1,"endpoint":endpoint,"token":token,"sid":sid,"editorId":id,"identity":launch["identity"]});
        let bytes = serde_json::to_vec(&value)?;
        codec::parse_editor_capability(&bytes).map_err(|_| io::ErrorKind::InvalidInput)?;
        let mut file = ipc::platform::open_new(&cap)?;
        // Once a file was created, cleanup ownership survives even metadata/write failure.
        // An identity that cannot be observed is retained as an orphan, never blindly unlinked.
        let cap_id = ipc::platform::file_identity(&file).ok();
        let prepared = cap_id.is_some() && file.write_all(&bytes).is_ok();
        drop(file);
        let binding = Arc::new(Binding {
            sid,
            id,
            identity: launch["identity"].clone(),
            recipe: launch["recipe"].clone(),
            launch: guard,
            token,
            cap,
            cap_id,
            prepared,
            out: self.core.out.clone(),
            owner,
            state: Mutex::new(BindingState {
                root: None,
                root_ended: false,
                auth_checks: 0,
                cleanup: None,
                cleanup_retry: Instant::now(),
                removed: false,
                source: None,
                closing: None,
                ready: Some(ready),
                closed: Some(closed),
                closed_io: None,
                ops: BTreeMap::new(),
            }),
            done: AtomicBool::new(false),
            operations: self.core.operations.clone(),
        });
        self.core
            .entries
            .lock()
            .unwrap()
            .insert(sid, binding.clone());
        // Shutdown cannot let a newly started listener exit before its enrollment exists.
        drop(runtime);
        if self.core.closing.load(Ordering::Acquire) {
            binding.close("closed");
        }
        Ok(binding)
    }
    pub fn shutdown(&self) {
        self.core.closing.store(true, Ordering::Release);
        for b in self.core.entries.lock().unwrap().values() {
            b.close("closed");
        }
    }
    pub fn finish_shutdown(&self, deadline: Instant) -> io::Result<()> {
        loop {
            match self.core.runtime.try_lock() {
                Ok(mut guard) => {
                    let Some(runtime) = guard.as_mut() else {
                        return Ok(());
                    };
                    if runtime
                        .worker
                        .as_ref()
                        .is_some_and(|worker| worker.is_finished())
                    {
                        // is_finished avoids waiting for an active worker; join is the completion fence.
                        let result = runtime.worker.take().unwrap().join().unwrap_or_else(|_| {
                            Err(io::Error::other("editor listener thread panicked"))
                        });
                        runtime.outcome = Some(result.map_err(|e| (e.kind(), e.to_string())));
                    }
                    if let Some(result) = &runtime.outcome {
                        return result
                            .as_ref()
                            .map(|_| ())
                            .map_err(|(kind, message)| io::Error::new(*kind, message.clone()));
                    }
                }
                Err(std::sync::TryLockError::WouldBlock) => (),
                Err(std::sync::TryLockError::Poisoned(_)) => {
                    return Err(io::Error::other("editor runtime lock poisoned"));
                }
            }
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                return Err(io::Error::new(
                    io::ErrorKind::TimedOut,
                    "editor listener shutdown incomplete",
                ));
            }
            thread::sleep(remaining.min(Duration::from_millis(2)));
        }
    }
}
impl Binding {
    pub fn prepared(&self) -> bool {
        self.prepared
    }
    pub fn cap_path(&self) -> &std::path::Path {
        &self.cap
    }
    pub fn capture(&self, pid: u32) -> Result<(), foreground::Rejection> {
        let root = foreground::Capture::capture(pid, &self.recipe, self.launch.clone())?;
        self.state.lock().unwrap().root = Some(Arc::new(root));
        Ok(())
    }
    pub fn root_ended(&self) {
        let mut s = self.state.lock().unwrap();
        s.root_ended = true;
        s.closing.get_or_insert("closed");
    }
    pub fn close(&self, reason: &'static str) {
        self.state.lock().unwrap().closing.get_or_insert(reason);
    }
    pub fn cancel(&self, op: u32) {
        let action = self.state.lock().unwrap().ops.get(&op).cloned();
        if let Some(action) = action {
            action.cancel("cancelled");
        }
    }
    pub fn done(&self) -> bool {
        self.done.load(Ordering::Acquire)
    }
    pub fn begin(
        self: &Arc<Self>,
        op: u32,
        total: usize,
        source: &str,
        remaining: u64,
    ) -> Option<Arc<Operation>> {
        let mut n = self.operations.load(Ordering::Acquire);
        loop {
            if n >= 128 {
                return None;
            }
            match self.operations.compare_exchange_weak(
                n,
                n + 1,
                Ordering::AcqRel,
                Ordering::Acquire,
            ) {
                Ok(_) => break,
                Err(actual) => n = actual,
            }
        }
        let slot = OperationSlot(self.operations.clone());
        let mut permits = Vec::with_capacity(6);
        for _ in 0..6 {
            permits.push(self.out.reserve_broker(BrokerClass::EditorReceipt)?);
        }
        let action = Arc::new(Operation {
            _slot: slot,
            op,
            total,
            deadline: Instant::now() + Duration::from_millis(remaining.min(10000)),
            binding: Arc::downgrade(self),
            source: source.into(),
            state: Mutex::new(OpState {
                body: Vec::new(),
                ready: false,
                claimed: false,
                dispatched: false,
                body_sent: false,
                sending: false,
                cancelled: None,
                result: None,
                app_result: false,
                app_settled: false,
                check: None,
                worker: None,
                permits,
                settle_io: None,
                released: false,
                charged: false,
            }),
        });
        let s = self.state.lock().unwrap();
        if s.ops.contains_key(&op) {
            return None;
        }
        Some(action)
    }
    fn fresh(&self, peer: u32) -> Result<(), foreground::Rejection> {
        let root = self
            .state
            .lock()
            .unwrap()
            .root
            .clone()
            .ok_or(foreground::Rejection::NotReady)?;
        let owner = self.owner.upgrade().ok_or(foreground::Rejection::Closed)?;
        root.verify(owner.foreground(), peer)
    }
}
impl Operation {
    pub fn publish(self: &Arc<Self>) {
        if let Some(b) = self.binding.upgrade() {
            b.state.lock().unwrap().ops.insert(self.op, self.clone());
        }
    }
    pub fn charge(&self) {
        self.state.lock().unwrap().charged = true;
    }
    pub fn allocate(&self) {
        self.state.lock().unwrap().body = Vec::with_capacity(self.total);
    }
    pub fn part(&self, offset: usize, bytes: &[u8]) -> bool {
        let mut s = self.state.lock().unwrap();
        if s.ready
            || offset != s.body.len()
            || bytes.is_empty()
            || bytes.len() > w::EDITOR_FRAGMENT_BYTES
            || offset + bytes.len() > self.total
        {
            return false;
        }
        s.body.extend_from_slice(bytes);
        true
    }
    pub fn commit(&self) -> bool {
        let mut s = self.state.lock().unwrap();
        if s.ready || s.body.len() != self.total || codec::check_editor_body(&s.body).is_err() {
            return false;
        }
        s.ready = true;
        drop(s);
        self.stage("queued");
        true
    }
    pub fn ready(&self) -> bool {
        self.state.lock().unwrap().ready
    }
    pub fn expired(&self) -> bool {
        Instant::now() >= self.deadline
    }
    pub fn stage(&self, stage: &str) {
        let Some(b) = self.binding.upgrade() else {
            return;
        };
        let mut s = self.state.lock().unwrap();
        let mut v = base("editor-state", &b);
        v["op"] = json!(self.op);
        v["state"] = json!(stage);
        let permits = std::mem::take(&mut s.permits);
        s.permits = emit(permits, &b.out, b.sid, v).0;
    }
    pub fn cancel(&self, reason: &'static str) {
        let mut s = self.state.lock().unwrap();
        s.cancelled.get_or_insert(reason);
    }
    pub fn reject(&self, reason: &'static str) {
        self.cancel(reason);
        self.result(outcome("none", reason));
    }
    pub fn claim(self: &Arc<Self>) {
        let Some(b) = self.binding.upgrade() else {
            return;
        };
        {
            let mut s = self.state.lock().unwrap();
            if s.result.is_some() {
                return;
            }
            s.claimed = true;
            let (tx, rx) = mpsc::sync_channel(1);
            s.check = Some(rx);
            let binding = b.clone();
            s.worker = Some(thread::spawn(move || {
                let pid = binding
                    .state
                    .lock()
                    .unwrap()
                    .root
                    .as_ref()
                    .map(|r| r.pid())
                    .unwrap_or(0);
                let result = binding.fresh(pid);
                let _ = tx.send(result);
            }));
        }
        self.stage("claimed");
    }
    fn result(&self, result: Value) {
        let Some(b) = self.binding.upgrade() else {
            return;
        };
        let mut s = self.state.lock().unwrap();
        if s.result.is_some() {
            return;
        }
        let mut v = base("editor-result", &b);
        v["op"] = json!(self.op);
        v["result"] = result.clone();
        let permits = std::mem::take(&mut s.permits);
        s.permits = emit(permits, &b.out, b.sid, v).0;
        s.result = Some(result);
    }
}
struct Tx {
    header: Vec<u8>,
    at: usize,
    body: Option<Arc<Operation>>,
    offset: usize,
    part: usize,
}
impl Tx {
    fn metadata(value: Value) -> io::Result<Self> {
        let body = codec::encode_editor(&value, "native-to-app", None)
            .map_err(|_| io::ErrorKind::InvalidData)?;
        let mut bytes = Vec::with_capacity(body.len() + 5);
        bytes.extend_from_slice(&((body.len() + 1) as u32).to_be_bytes());
        bytes.push(1);
        bytes.extend_from_slice(&body);
        Ok(Self {
            header: bytes,
            at: 0,
            body: None,
            offset: 0,
            part: 0,
        })
    }
    fn poll(&mut self, stream: &mut ipc::Stream) -> io::Result<bool> {
        if let Some(op) = &self.body {
            let state = op.state.lock().unwrap();
            let closed = op
                .binding
                .upgrade()
                .is_none_or(|b| b.state.lock().unwrap().closing.is_some());
            if state.cancelled.is_some() || op.expired() || closed {
                return Err(io::ErrorKind::ConnectionAborted.into());
            }
        }
        if self.at < self.header.len() {
            match stream.write(&self.header[self.at..]) {
                Ok(0) => return Err(io::ErrorKind::WriteZero.into()),
                Ok(n) => {
                    self.at += n;
                    if let Some(op) = &self.body {
                        let mut state = op.state.lock().unwrap();
                        if !state.dispatched {
                            state.dispatched = true;
                            drop(state);
                            op.stage("dispatched");
                        }
                    }
                }
                Err(e)
                    if matches!(
                        e.kind(),
                        io::ErrorKind::WouldBlock | io::ErrorKind::Interrupted
                    ) =>
                {
                    return Ok(false)
                }
                Err(e) => return Err(e),
            }
            if self.at < self.header.len() {
                return Ok(false);
            }
        }
        let Some(op) = &self.body else {
            return Ok(true);
        };
        if self.part > 0 {
            let s = op.state.lock().unwrap();
            match stream.write(&s.body[self.offset..self.offset + self.part]) {
                Ok(0) => return Err(io::ErrorKind::WriteZero.into()),
                Ok(n) => {
                    self.offset += n;
                    self.part -= n;
                }
                Err(e)
                    if matches!(
                        e.kind(),
                        io::ErrorKind::WouldBlock | io::ErrorKind::Interrupted
                    ) =>
                {
                    return Ok(false)
                }
                Err(e) => return Err(e),
            }
            if self.part > 0 {
                return Ok(false);
            }
        }
        if self.offset == op.total {
            return Ok(true);
        }
        let n = (op.total - self.offset).min(w::EDITOR_FRAGMENT_BYTES);
        self.header.clear();
        self.header
            .extend_from_slice(&((n + 5) as u32).to_be_bytes());
        self.header.push(2);
        self.header.extend_from_slice(&op.op.to_be_bytes());
        self.at = 0;
        self.part = n;
        Ok(false)
    }
}
impl Drop for Tx {
    fn drop(&mut self) {
        if let Some(op) = &self.body {
            op.state.lock().unwrap().sending = false;
        }
    }
}
struct Connection {
    stream: ipc::Stream,
    reader: ipc::Reader,
    born: Instant,
    binding: Option<Arc<Binding>>,
    tx: Option<Tx>,
    auth_pending: Option<Value>,
    auth_check: Option<mpsc::Receiver<Result<(), foreground::Rejection>>>,
    auth_worker: Option<thread::JoinHandle<()>>,
    auth_binding: Option<Arc<Binding>>,
}
fn listener_can_stop(
    runtime: &Mutex<Option<Runtime>>,
    entries_empty: impl FnOnce() -> bool,
) -> io::Result<bool> {
    match runtime.try_lock() {
        // Enrollment holds runtime through insertion; sample entries only under this same lock.
        Ok(_runtime) => Ok(entries_empty()),
        Err(std::sync::TryLockError::WouldBlock) => Ok(false),
        Err(std::sync::TryLockError::Poisoned(_)) => {
            Err(io::Error::other("editor runtime lock poisoned"))
        }
    }
}
fn run(weak: Weak<Core>, listener: ipc::platform::Listener) -> io::Result<()> {
    let mut connections: Vec<Connection> = Vec::new();
    loop {
        let Some(core) = weak.upgrade() else { break };
        let unauth = connections.iter().filter(|c| c.binding.is_none()).count();
        if unauth < w::EDITOR_UNAUTHENTICATED_CONNECTIONS && connections.len() < 34 {
            match listener.accept() {
                Ok(stream) => connections.push(Connection {
                    stream,
                    reader: ipc::Reader::new(w::EDITOR_METADATA_BYTES + 1),
                    born: Instant::now(),
                    binding: None,
                    tx: None,
                    auth_pending: None,
                    auth_check: None,
                    auth_worker: None,
                    auth_binding: None,
                }),
                Err(e) if e.kind() == io::ErrorKind::WouldBlock => (),
                Err(_) => (),
            }
        }
        let mut i = 0;
        while i < connections.len() {
            if poll_connection(&core, &mut connections[i]).is_err() {
                if let Some(b) = &connections[i].binding {
                    b.close("transport-lost");
                }
                connections.swap_remove(i);
            } else {
                i += 1;
            }
        }
        let bindings: Vec<_> = core.entries.lock().unwrap().values().cloned().collect();
        for b in bindings {
            let connected = connections
                .iter()
                .any(|c| c.binding.as_ref().is_some_and(|v| Arc::ptr_eq(v, &b)));
            tick(&b, connected);
            let mut s = b.state.lock().unwrap();
            if s.root_ended {
                connections.retain(|c| !c.binding.as_ref().is_some_and(|v| Arc::ptr_eq(v, &b)));
            }
            if s.closing.is_some()
                && s.ops.is_empty()
                && s.auth_checks == 0
                && !connections
                    .iter()
                    .any(|c| c.binding.as_ref().is_some_and(|v| Arc::ptr_eq(v, &b)))
            {
                if s.cleanup
                    .as_ref()
                    .is_some_and(|worker| worker.is_finished())
                {
                    let result = s.cleanup.take().unwrap().join();
                    s.removed = matches!(result, Ok(Ok(())));
                    s.cleanup_retry = Instant::now() + Duration::from_millis(250);
                }
                if !s.removed && s.cleanup.is_none() && Instant::now() >= s.cleanup_retry {
                    if let Some(id) = b.cap_id.clone() {
                        let path = b.cap.clone();
                        s.cleanup = Some(thread::spawn(move || {
                            ipc::platform::remove_identity(&path, &id)
                        }));
                    }
                }
                if s.closed_io.is_none() && s.removed {
                    let mut v = base("editor-closed", &b);
                    v["reason"] = json!(s.closing.unwrap());
                    let permits = s.closed.take().into_iter().collect();
                    s.closed_io = emit(permits, &b.out, b.sid, v).1;
                    s.ready.take();
                }
                if s.closed_io
                    .as_ref()
                    .is_some_and(|f| f.load(Ordering::Acquire))
                    || (core.out.is_closed() && s.removed && s.cleanup.is_none())
                {
                    b.done.store(true, Ordering::Release);
                    drop(s);
                    core.entries.lock().unwrap().remove(&b.sid);
                }
            }
        }
        if core.closing.load(Ordering::Acquire)
            && listener_can_stop(&core.runtime, || core.entries.lock().unwrap().is_empty())?
        {
            break;
        }
        drop(core);
        thread::sleep(Duration::from_millis(2));
    }
    drop(connections);
    listener.close()
}
fn poll_connection(core: &Core, c: &mut Connection) -> io::Result<()> {
    if c.binding.is_none() {
        if c.auth_worker
            .as_ref()
            .is_some_and(|worker| !worker.is_finished())
        {
            return Ok(());
        }
        if let Some(worker) = c.auth_worker.take() {
            let result = worker.join();
            if let Some(b) = c.auth_binding.take() {
                b.state.lock().unwrap().auth_checks -= 1;
            }
            result.map_err(|_| io::ErrorKind::Other)?;
        }
        if c.born.elapsed() > Duration::from_millis(w::EDITOR_HANDSHAKE_MS as u64) {
            return Err(io::ErrorKind::TimedOut.into());
        }
        if c.auth_pending.is_none() {
            if let Some(bytes) = c.reader.poll(&mut c.stream)? {
                if bytes.first() != Some(&1) {
                    return Err(io::ErrorKind::InvalidData.into());
                }
                c.auth_pending = Some(
                    codec::parse_editor(&bytes[1..], "app-to-native", None)
                        .map_err(|_| io::ErrorKind::InvalidData)?,
                );
            }
        }
        if let Some(v) = &c.auth_pending {
            if v["type"] != "editor-auth" {
                return Err(io::ErrorKind::InvalidData.into());
            }
            let b = core
                .entries
                .lock()
                .unwrap()
                .get(&(v["sid"].as_u64().unwrap() as u32))
                .cloned()
                .ok_or(io::ErrorKind::PermissionDenied)?;
            if v["editorId"] != b.id || v["token"] != b.token || v["identity"] != b.identity {
                return Err(io::ErrorKind::PermissionDenied.into());
            }
            {
                let s = b.state.lock().unwrap();
                if s.closing.is_some() || s.source.is_some() {
                    return Err(io::ErrorKind::PermissionDenied.into());
                }
                if s.root.is_none() {
                    return Ok(());
                }
            }
            let peer = ipc::platform::editor_peer_pid(&c.stream)?;
            if c.auth_check.is_none() {
                let (tx, rx) = mpsc::sync_channel(1);
                c.auth_check = Some(rx);
                let captured = b.clone();
                c.auth_binding = Some(b.clone());
                captured.state.lock().unwrap().auth_checks += 1;
                c.auth_worker = Some(thread::spawn(move || {
                    let result = captured.fresh(peer);
                    let _ = tx.send(result);
                }));
                return Ok(());
            }
            match c.auth_check.as_ref().unwrap().try_recv() {
                Ok(Ok(())) => (),
                Ok(Err(_)) | Err(mpsc::TryRecvError::Disconnected) => {
                    return Err(io::ErrorKind::PermissionDenied.into())
                }
                Err(mpsc::TryRecvError::Empty) => return Ok(()),
            }
            c.auth_check = None;
            let source = v["sourceInstance"].as_str().unwrap().to_owned();
            let mut s = b.state.lock().unwrap();
            if s.closing.is_some() || s.root_ended || s.source.is_some() {
                return Err(io::ErrorKind::PermissionDenied.into());
            }
            s.source = Some(source.clone());
            let mut ack = base("editor-authenticated", &b);
            ack["identity"] = b.identity.clone();
            ack["sourceInstance"] = json!(source);
            ack["profileId"] = b.recipe["profileId"].clone();
            c.tx = Some(Tx::metadata(ack)?);
            let mut ready = base("editor-ready", &b);
            ready["identity"] = b.identity.clone();
            ready["sourceInstance"] = json!(source);
            ready["provider"] = json!("pi");
            ready["profileId"] = b.recipe["profileId"].clone();
            let permits = s.ready.take().into_iter().collect();
            let _ = emit(permits, &b.out, b.sid, ready);
            drop(s);
            c.binding = Some(b);
            c.reader = ipc::Reader::new(w::EDITOR_METADATA_BYTES + 1);
            c.auth_pending = None;
        }
        return Ok(());
    }
    let b = c.binding.as_ref().unwrap().clone();
    if let Some(bytes) = c.reader.poll(&mut c.stream)? {
        c.reader = ipc::Reader::new(w::EDITOR_METADATA_BYTES + 1);
        if bytes.first() != Some(&1) {
            return Err(io::ErrorKind::InvalidData.into());
        }
        let expected = json!({"sid":b.sid,"editorId":b.id});
        let v = codec::parse_editor(&bytes[1..], "app-to-native", Some(&expected))
            .map_err(|_| io::ErrorKind::InvalidData)?;
        let op = v["op"].as_u64().ok_or(io::ErrorKind::InvalidData)? as u32;
        let action = b
            .state
            .lock()
            .unwrap()
            .ops
            .get(&op)
            .cloned()
            .ok_or(io::ErrorKind::InvalidData)?;
        let mut s = action.state.lock().unwrap();
        if !s.dispatched || !s.body_sent {
            return Err(io::ErrorKind::InvalidData.into());
        }
        match v["type"].as_str() {
            Some("editor-app-result") if !s.app_result => {
                s.app_result = true;
                drop(s);
                action.result(v["result"].clone());
            }
            Some("editor-app-settled") if s.app_result && !s.app_settled => s.app_settled = true,
            _ => return Err(io::ErrorKind::InvalidData.into()),
        }
    }
    if let Some(tx) = &mut c.tx {
        if tx.poll(&mut c.stream)? {
            if let Some(op) = &tx.body {
                op.state.lock().unwrap().body_sent = true;
            }
            c.tx = None;
        }
    }
    let s = b.state.lock().unwrap();
    let closing = s.closing;
    let action = s
        .ops
        .values()
        .find(|o| o.state.lock().unwrap().claimed)
        .cloned();
    drop(s);
    if let Some(action) = action {
        let mut s = action.state.lock().unwrap();
        if !s.dispatched && s.result.is_none() && c.tx.is_none() {
            if s.worker.as_ref().is_some_and(|h| !h.is_finished()) {
                return Ok(());
            }
            if let Some(worker) = s.worker.take() {
                if worker.join().is_err() {
                    drop(s);
                    action.reject("not-ready");
                    return Ok(());
                }
            }
            let check = s.check.as_ref().and_then(|r| r.try_recv().ok());
            if let Some(result) = check {
                s.check = None;
                if let Err(reason) = result {
                    drop(s);
                    action.reject(reason.reason());
                    return Ok(());
                }
                if closing.is_some() || s.cancelled.is_some() || action.expired() {
                    let reason = s.cancelled.unwrap_or(if action.expired() {
                        "expired"
                    } else {
                        "closed"
                    });
                    drop(s);
                    action.reject(reason);
                    return Ok(());
                }
                if b.state.lock().unwrap().source.as_deref() != Some(action.source.as_str()) {
                    drop(s);
                    action.reject("source-changed");
                    return Ok(());
                }
                let mut deliver = base("editor-deliver", &b);
                deliver["op"] = json!(action.op);
                deliver["sourceInstance"] = json!(action.source);
                deliver["totalBytes"] = json!(action.total);
                deliver["remainingMs"] = json!(action
                    .deadline
                    .saturating_duration_since(Instant::now())
                    .as_millis()
                    .max(1)
                    .min(10000) as u64);
                let mut tx = Tx::metadata(deliver)?;
                tx.body = Some(action.clone());
                c.tx = Some(tx);
                s.sending = true;
                drop(s);
                return Ok(());
            }
        }
        if s.dispatched && s.result.is_some() && s.app_result && s.app_settled && c.tx.is_none() {
            return Ok(());
        }
        if s.dispatched
            && (s.cancelled.is_some() || closing.is_some() || action.expired())
            && s.result.is_none()
        {
            drop(s);
            action.result(outcome(
                "unknown",
                if action.expired() {
                    "timeout"
                } else {
                    "adapter-lost"
                },
            ));
            b.close("closed");
        }
    } else if closing.is_some() && c.tx.is_none() {
        let close = base("editor-close", &b);
        let mut tx = Tx::metadata(close)?;
        let _ = tx.poll(&mut c.stream);
        return Err(io::ErrorKind::ConnectionAborted.into());
    }
    Ok(())
}
fn tick(b: &Arc<Binding>, connected: bool) {
    let (ops, closing, root_ended) = {
        let s = b.state.lock().unwrap();
        (
            s.ops.values().cloned().collect::<Vec<_>>(),
            s.closing,
            s.root_ended,
        )
    };
    for action in ops {
        let mut s = action.state.lock().unwrap();
        if !s.dispatched
            && s.result.is_none()
            && (s.cancelled.is_some() || closing.is_some() || action.expired())
        {
            let reason = s.cancelled.unwrap_or(if action.expired() {
                "expired"
            } else {
                "closed"
            });
            drop(s);
            action.reject(reason);
            s = action.state.lock().unwrap();
        }
        if s.dispatched && s.result.is_none() && (!connected || root_ended) {
            drop(s);
            action.result(outcome("unknown", "transport-lost"));
            s = action.state.lock().unwrap();
        }
        let worker_finished = s.worker.as_ref().is_none_or(|h| h.is_finished());
        if worker_finished {
            if let Some(worker) = s.worker.take() {
                let _ = worker.join();
            }
        }
        let worker_done = if !worker_finished {
            false
        } else if s.result.is_none() {
            s.check.is_none()
        } else {
            match s.check.as_ref().map(|rx| rx.try_recv()) {
                Some(Ok(_)) | Some(Err(mpsc::TryRecvError::Disconnected)) => {
                    s.check = None;
                    true
                }
                Some(Err(mpsc::TryRecvError::Empty)) => false,
                None => true,
            }
        };
        let actual = if s.dispatched {
            s.app_result && s.app_settled && !s.sending || root_ended && !connected && !s.sending
        } else {
            worker_done && !s.sending
        };
        // The body/user gate settles at the real app+local-IO fence. The independent
        // metadata/receipt and Session binding reservations remain until stdout completes.
        if s.result.is_some() && actual && !s.released {
            s.body = Vec::new();
            s.released = true;
            let charged = s.charged;
            drop(s);
            if charged {
                if let Some(owner) = b.owner.upgrade() {
                    owner.release(action.op, action.total);
                }
            }
            s = action.state.lock().unwrap();
        }
        if s.released && s.settle_io.is_none() {
            let mut value = base("editor-settled", b);
            value["op"] = json!(action.op);
            let permits = std::mem::take(&mut s.permits);
            let (rest, done) = emit(permits, &b.out, b.sid, value);
            s.permits = rest;
            s.settle_io = done;
        }
        if s.released
            && (s
                .settle_io
                .as_ref()
                .is_some_and(|f| f.load(Ordering::Acquire))
                || b.out.is_closed())
        {
            drop(s);
            b.state.lock().unwrap().ops.remove(&action.op);
        }
    }
}

#[cfg(test)]
mod shutdown_tests {
    use super::*;

    #[test]
    fn listener_rechecks_empty_under_runtime_after_inflight_enrollment() {
        let service = Service::new(Outbox::new());
        let guard = service.core.runtime.lock().unwrap();
        // A controlled map predicate represents insertion while enrollment owns runtime.
        let empty = Arc::new(AtomicBool::new(true));
        let worker_empty = empty.clone();
        let observing = service.clone();
        let (sample, sampled) = mpsc::channel();
        let (resume, resumed) = mpsc::channel();
        let observer = thread::spawn(move || {
            listener_can_stop(&observing.core.runtime, || {
                let was_empty = worker_empty.load(Ordering::Acquire);
                sample.send(was_empty).unwrap();
                resumed.recv().unwrap();
                was_empty
            })
            .unwrap()
        });
        let prior_sample = sampled.recv_timeout(Duration::from_millis(200));
        empty.store(false, Ordering::Release);
        drop(guard);
        let _ = resume.send(());
        let stopped = observer.join().unwrap();
        assert!(
            !stopped,
            "stale empty observation let listener abandon inserted enrollment: {prior_sample:?}"
        );
        assert!(!listener_can_stop(&service.core.runtime, || {
            assert!(matches!(
                service.core.runtime.try_lock(),
                Err(std::sync::TryLockError::WouldBlock)
            ));
            empty.load(Ordering::Acquire)
        })
        .unwrap());
    }

    #[test]
    fn shutdown_runtime_lock_contention_obeys_the_original_deadline() {
        let service = Service::new(Outbox::new());
        let holder = service.clone();
        let (held, holding) = mpsc::channel();
        let (release, released) = mpsc::channel();
        let lock_worker = thread::spawn(move || {
            let _guard = holder.core.runtime.lock().unwrap();
            held.send(()).unwrap();
            released.recv().unwrap();
        });
        holding.recv_timeout(Duration::from_secs(1)).unwrap();
        let closing = service.clone();
        let (done, completed) = mpsc::channel();
        let close_worker = thread::spawn(move || {
            let deadline = Instant::now() + Duration::from_millis(30);
            closing.shutdown();
            done.send(closing.finish_shutdown(deadline)).unwrap();
        });
        let observed = completed.recv_timeout(Duration::from_millis(200));
        release.send(()).unwrap();
        lock_worker.join().unwrap();
        close_worker.join().unwrap();
        assert!(
            observed.is_ok(),
            "runtime lock blocked beyond the shutdown deadline"
        );
        assert_eq!(
            observed.unwrap().unwrap_err().kind(),
            io::ErrorKind::TimedOut
        );
        service.finish_shutdown(Instant::now()).unwrap();
    }

    #[test]
    fn shutdown_deadline_keeps_unfinished_worker_owned_until_join() {
        let service = Service::new(Outbox::new());
        let (release, wait) = mpsc::channel();
        *service.core.runtime.lock().unwrap() = Some(Runtime {
            endpoint: "controlled-worker-no-endpoint".into(),
            worker: Some(thread::spawn(move || {
                wait.recv().unwrap();
                Ok(())
            })),
            outcome: None,
        });
        service.shutdown();
        let error = service.finish_shutdown(Instant::now()).unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::TimedOut);
        {
            let guard = service.core.runtime.lock().unwrap();
            let runtime = guard.as_ref().unwrap();
            assert!(runtime.worker.is_some());
            assert!(runtime.outcome.is_none());
        }
        release.send(()).unwrap();
        service
            .finish_shutdown(Instant::now() + Duration::from_secs(1))
            .unwrap();
        assert!(service
            .core
            .runtime
            .lock()
            .unwrap()
            .as_ref()
            .unwrap()
            .worker
            .is_none());
        service.finish_shutdown(Instant::now()).unwrap();
    }

    #[test]
    fn shutdown_join_failure_is_retained_for_repeated_observation() {
        let service = Service::new(Outbox::new());
        *service.core.runtime.lock().unwrap() = Some(Runtime {
            endpoint: "controlled-panicking-worker-no-endpoint".into(),
            worker: Some(thread::spawn(|| panic!("controlled listener failure"))),
            outcome: None,
        });
        service.shutdown();
        let error = service
            .finish_shutdown(Instant::now() + Duration::from_secs(1))
            .unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::Other);
        assert!(error.to_string().contains("listener thread panicked"));
        assert_eq!(
            service
                .finish_shutdown(Instant::now())
                .unwrap_err()
                .to_string(),
            error.to_string()
        );
    }
}
