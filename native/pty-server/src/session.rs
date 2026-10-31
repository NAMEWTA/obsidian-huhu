//! Pseudo-terminal sessions; root exit and bounded cleanup are separate evidence.
use crate::{editor, frame, job};
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Condvar, Mutex,
    },
    thread,
    time::{Duration, Instant},
};
pub const PAUSE_AT: u64 = 1024 * 1024;
pub const RESUME_AT: u64 = 256 * 1024;
const READ_CHUNK: usize = 64 * 1024;
const GRACE: Duration = Duration::from_secs(2);
const DRAIN: Duration = Duration::from_secs(3);
pub const STOP_BUDGET: Duration = Duration::from_secs(8);
pub use crate::outbox::Outbox;
use crate::outbox::{ReplyFailure, ReplySlot};
pub fn control(out: &Outbox, message: Value) {
    if let Ok(bytes) = crate::outbox::encode_json(&message, 8192) {
        let _ = out.send(bytes);
    }
}

#[derive(Default)]
struct OutputBudget {
    credit: u64,
    peak: u64,
    readers: usize,
    reader_peak: usize,
    abandoned: u64,
}
struct ReaderReserve(Arc<Mutex<OutputBudget>>);
impl ReaderReserve {
    fn new(budget: Arc<Mutex<OutputBudget>>) -> Self {
        let mut b = budget.lock().unwrap();
        b.readers += READ_CHUNK;
        b.reader_peak = b.reader_peak.max(b.readers);
        drop(b);
        Self(budget)
    }
}
impl Drop for ReaderReserve {
    fn drop(&mut self) {
        self.0.lock().unwrap().readers -= READ_CHUNK;
    }
}
pub struct Flow {
    budget: Arc<Mutex<OutputBudget>>,
    state: Mutex<(u64, bool, bool)>,
    changed: Condvar,
}
impl Flow {
    fn with_budget(budget: Arc<Mutex<OutputBudget>>) -> Self {
        Self {
            budget,
            state: Mutex::new((0, false, false)),
            changed: Condvar::new(),
        }
    }
    pub fn wait_for_credit(&self) -> bool {
        let mut state = self.state.lock().unwrap();
        if state.0 >= PAUSE_AT {
            while state.0 > RESUME_AT && !state.1 && !state.2 {
                state = self.changed.wait(state).unwrap();
            }
        }
        !state.1
    }
    pub fn sent(&self, n: u64) {
        let mut s = self.state.lock().unwrap();
        s.0 += n;
        let mut b = self.budget.lock().unwrap();
        b.credit += n;
        b.peak = b.peak.max(b.credit);
    }
    pub fn acknowledged(&self, n: u64) {
        let mut s = self.state.lock().unwrap();
        let n = n.min(s.0);
        s.0 -= n;
        self.budget.lock().unwrap().credit -= n;
        self.changed.notify_all();
    }
    pub fn close(&self) {
        self.state.lock().unwrap().1 = true;
        self.changed.notify_all();
    }
    fn drain(&self) {
        self.state.lock().unwrap().2 = true;
        self.changed.notify_all();
    }
    fn abandon(&self) {
        let mut s = self.state.lock().unwrap();
        let mut b = self.budget.lock().unwrap();
        b.credit -= s.0;
        b.abandoned += s.0;
        s.0 = 0;
        s.1 = true;
        self.changed.notify_all();
    }
    /// Once the stdin loop has ended (EOF or `shutdown`) no acknowledgement is read.
    /// Release the credit the client cannot return, without claiming truncation.
    fn forget(&self) {
        let mut s = self.state.lock().unwrap();
        self.budget.lock().unwrap().credit -= s.0;
        s.0 = 0;
        self.changed.notify_all();
    }
    fn outstanding(&self) -> u64 {
        self.state.lock().unwrap().0
    }
    fn closed(&self) -> bool {
        self.state.lock().unwrap().1
    }
    fn discard(&self) -> bool {
        let s = self.state.lock().unwrap();
        s.2 && s.0 >= PAUSE_AT
    }
}
#[derive(serde::Serialize, serde::Deserialize)]
pub struct SpawnRequest {
    pub file: String,
    pub args: Vec<String>,
    pub cwd: Option<String>,
    pub env: HashMap<String, String>,
    pub cols: u16,
    pub rows: u16,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub editor: Option<Value>,
}
#[derive(Debug)]
pub struct SpawnFailure {
    pub code: &'static str,
    pub effect: &'static str,
    pub message: String,
}
impl SpawnFailure {
    pub fn before_spawn(code: &'static str, error: impl std::fmt::Display) -> Self {
        Self {
            code,
            effect: "none",
            message: error.to_string(),
        }
    }
}
fn prepare_before_spawn<R, W, C>(
    reader: impl FnOnce() -> Result<R, SpawnFailure>,
    writer: impl FnOnce() -> Result<W, SpawnFailure>,
    spawn: impl FnOnce() -> Result<C, SpawnFailure>,
) -> Result<(R, W, C), SpawnFailure> {
    let r = reader()?;
    let w = writer()?;
    Ok((r, w, spawn()?))
}
#[derive(Default)]
pub struct Stop {
    pub at: Option<Instant>,
    pub force: bool,
    pub request_id: Option<String>,
}
struct Root {
    state: &'static str,
    code: Option<u32>,
    signal: Option<String>,
    at: Option<Instant>,
}
#[derive(Default)]
struct InputBudget {
    bytes: usize,
    operations: usize,
    reply_bytes: usize,
    replies: usize,
    peak_bytes: usize,
    peak_operations: usize,
    reply_peak: usize,
    replies_peak: usize,
}
struct UserOperation {
    op: Option<u32>,
    data: Vec<u8>,
    total: usize,
    ready: bool,
    born: Instant,
}
enum UserAction {
    Write(UserOperation),
    Resize(Option<u32>, PtySize),
    Editor(Arc<editor::Operation>),
}
impl UserAction {
    fn op(&self) -> Option<u32> {
        match self {
            Self::Write(v) => v.op,
            Self::Resize(op, _) => *op,
            Self::Editor(v) => Some(v.op),
        }
    }
    fn bytes(&self) -> usize {
        match self {
            Self::Write(v) => v.total,
            Self::Editor(v) => v.total,
            _ => 0,
        }
    }
    fn kind(&self) -> &'static str {
        if matches!(self, Self::Editor(_)) {
            "editor-state"
        } else if matches!(self, Self::Write(_)) {
            "input-state"
        } else {
            "resize-state"
        }
    }
}
struct InputState {
    queue: std::collections::VecDeque<UserAction>,
    replies: std::collections::VecDeque<Vec<u8>>,
    /// Host answers for the console, written before any user-visible reply.
    handoffs: std::collections::VecDeque<Vec<u8>>,
    bytes: usize,
    count: usize,
    reply_bytes: usize,
    claimed: Option<(u32, &'static str)>,
    recent: std::collections::BTreeMap<u32, (&'static str, &'static str, Option<&'static str>)>,
    last_op: u32,
    closed: bool,
    ended: bool,
    user_ready: bool,
}
struct InputQueue {
    sid: u32,
    out: Outbox,
    budget: Arc<Mutex<InputBudget>>,
    state: Mutex<InputState>,
    changed: Condvar,
    reply_slot: Arc<ReplySlot>,
    settlement_required: AtomicBool,
    reply_closed: AtomicBool,
    editor: Mutex<Option<Arc<editor::Binding>>>,
    master: Mutex<Option<std::sync::Weak<Mutex<Option<Box<dyn MasterPty + Send>>>>>>,
}
enum ClaimedInput {
    User(UserAction),
    Reply(Vec<u8>),
    /// Console handshake. Never becomes a client frame, even when the write fails.
    Handoff(Vec<u8>),
}
impl InputQueue {
    fn new(sid: u32, out: Outbox, budget: Arc<Mutex<InputBudget>>) -> Option<Arc<Self>> {
        let reply_slot = out.reserve_reply(sid)?;
        Some(Arc::new(Self {
            sid,
            out,
            budget,
            state: Mutex::new(InputState {
                queue: Default::default(),
                replies: Default::default(),
                handoffs: Default::default(),
                bytes: 0,
                count: 0,
                reply_bytes: 0,
                claimed: None,
                recent: Default::default(),
                last_op: 0,
                closed: false,
                ended: false,
                user_ready: false,
            }),
            changed: Condvar::new(),
            reply_slot,
            settlement_required: AtomicBool::new(false),
            reply_closed: AtomicBool::new(false),
            editor: Mutex::new(None),
            master: Mutex::new(None),
        }))
    }
    fn editor_control(&self, message: &Value) {
        let binding = self.editor.lock().unwrap().clone();
        let Some(binding) = binding else { return };
        if message["editorId"] != binding.id {
            return;
        }
        let op = message["op"].as_u64().unwrap_or(0) as u32;
        match message["type"].as_str() {
            Some("editor-begin") => {
                let mut budget = self.budget.lock().unwrap();
                let mut state = self.state.lock().unwrap();
                if op <= state.last_op {
                    return;
                }
                state.last_op = op;
                let total = message["totalBytes"].as_u64().unwrap() as usize;
                let Some(action) = binding.begin(
                    op,
                    total,
                    message["sourceInstance"].as_str().unwrap(),
                    message["remainingMs"].as_u64().unwrap(),
                ) else {
                    return;
                };
                if state.closed || !Self::room(&state, &budget, total) {
                    action.publish();
                    action.reject(if state.closed { "closed" } else { "capacity" });
                    return;
                }
                Self::charge(&mut state, &mut budget, total);
                action.charge();
                action.allocate();
                state.queue.push_back(UserAction::Editor(action.clone()));
                action.publish();
                action.stage("reserved");
                self.changed.notify_all();
            }
            Some("editor-commit") => self.commit(op),
            Some("editor-cancel") => {
                self.cancel(op);
                binding.cancel(op);
            }
            Some("editor-close") => binding.close("closed"),
            _ => (),
        }
    }
    fn editor_done(&self) -> bool {
        self.editor
            .lock()
            .unwrap()
            .as_ref()
            .is_none_or(|b| b.done())
    }
    fn close_replies(&self) {
        self.reply_closed.store(true, Ordering::SeqCst);
    }
    fn settle_replies(&self, writer_done: bool) -> bool {
        if !self.settlement_required.load(Ordering::SeqCst) {
            return true;
        }
        if !writer_done
            || !self.reply_closed.load(Ordering::SeqCst)
            || !self.state.lock().unwrap().ended
        {
            return false;
        }
        self.out.reply_settled(self.sid).is_ok()
    }
    fn notice(
        &self,
        op: u32,
        kind: &'static str,
        state: &'static str,
        reason: Option<&'static str>,
    ) {
        if kind == "editor-state" {
            return;
        }
        let mut message = json!({"type":kind,"sid":self.sid,"op":op,"state":state});
        if let Some(reason) = reason {
            message["reason"] = json!(reason);
        }
        control(&self.out, message);
    }
    fn remember(
        &self,
        s: &mut InputState,
        op: u32,
        kind: &'static str,
        state: &'static str,
        reason: Option<&'static str>,
    ) {
        s.recent.insert(op, (kind, state, reason));
        while s.recent.len() > 64 {
            s.recent.pop_first();
        }
        self.notice(op, kind, state, reason);
        self.out.finish_input(self.sid, op);
    }
    fn existing(&self, s: &InputState, op: u32) {
        if let Some((kind, state, reason)) = s.recent.get(&op) {
            self.notice(op, kind, state, *reason);
        } else if s.claimed.is_some_and(|(id, _)| id == op) {
            self.notice(
                op,
                s.claimed.unwrap().1,
                if s.claimed.unwrap().1 == "resize-state" {
                    "queued"
                } else {
                    "started"
                },
                None,
            );
        } else if let Some(action) = s.queue.iter().find(|v| v.op() == Some(op)) {
            self.notice(
                op,
                action.kind(),
                if matches!(action,UserAction::Write(v) if !v.ready) {
                    "reserved"
                } else {
                    "queued"
                },
                None,
            );
        } else {
            self.notice(op, "input-state", "unknown", Some("expired"));
        }
    }
    fn room(s: &InputState, b: &InputBudget, bytes: usize) -> bool {
        s.count < frame::SESSION_QUEUED_OPERATIONS
            && b.operations < frame::HELPER_QUEUED_OPERATIONS
            && s.bytes + bytes <= frame::SESSION_QUEUED_BYTES
            && b.bytes + bytes <= frame::HELPER_QUEUED_BYTES
    }
    fn charge(s: &mut InputState, b: &mut InputBudget, bytes: usize) {
        s.count += 1;
        s.bytes += bytes;
        b.operations += 1;
        b.bytes += bytes;
        b.peak_bytes = b.peak_bytes.max(b.bytes);
        b.peak_operations = b.peak_operations.max(b.operations);
    }
    fn uncharge(s: &mut InputState, b: &mut InputBudget, bytes: usize) {
        s.count -= 1;
        s.bytes -= bytes;
        b.operations -= 1;
        b.bytes -= bytes;
    }
    fn begin(&self, op: u32, total: usize) {
        let mut b = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        if op <= s.last_op {
            self.existing(&s, op);
            return;
        }
        s.last_op = op;
        let reason = if s.closed {
            Some("closed")
        } else if total == 0 || total > frame::OPERATION_BYTES {
            Some("invalid")
        } else if !Self::room(&s, &b, total) || !self.out.reserve_input(self.sid, op) {
            Some("capacity")
        } else {
            None
        };
        if let Some(reason) = reason {
            self.remember(&mut s, op, "input-state", "none", Some(reason));
            return;
        }
        Self::charge(&mut s, &mut b, total);
        s.queue.push_back(UserAction::Write(UserOperation {
            op: Some(op),
            data: Vec::with_capacity(total),
            total,
            ready: false,
            born: Instant::now(),
        }));
        self.notice(op, "input-state", "reserved", None);
        self.changed.notify_all();
    }
    fn part(&self, op: u32, offset: usize, bytes: &[u8]) {
        let mut b = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        let Some(at) = s.queue.iter().position(|v| v.op() == Some(op)) else {
            self.existing(&s, op);
            return;
        };
        if let UserAction::Editor(v) = &s.queue[at] {
            let valid = v.part(offset, bytes);
            if !valid {
                v.reject("invalid");
                s.queue.remove(at);
            }
            return;
        }
        let valid = matches!(&s.queue[at],UserAction::Write(v) if !v.ready && offset==v.data.len() && offset+bytes.len()<=v.total && !bytes.is_empty() && bytes.len()<=frame::FRAGMENT_BYTES);
        if valid {
            if let UserAction::Write(v) = &mut s.queue[at] {
                v.data.extend_from_slice(bytes);
            }
        } else {
            let action = s.queue.remove(at).unwrap();
            Self::uncharge(&mut s, &mut b, action.bytes());
            self.remember(&mut s, op, action.kind(), "none", Some("invalid"));
            self.changed.notify_all();
        }
    }
    fn commit(&self, op: u32) {
        let mut b = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        let Some(at) = s.queue.iter().position(|v| v.op() == Some(op)) else {
            self.existing(&s, op);
            return;
        };
        if let UserAction::Editor(v) = &s.queue[at] {
            if !v.commit() {
                v.reject("invalid");
                s.queue.remove(at);
            }
            self.changed.notify_all();
            return;
        }
        if let UserAction::Write(v) = &mut s.queue[at] {
            if !v.ready && v.data.len() == v.total {
                v.ready = true;
                self.notice(op, "input-state", "queued", None);
                self.changed.notify_all();
                return;
            }
        }
        let action = s.queue.remove(at).unwrap();
        Self::uncharge(&mut s, &mut b, action.bytes());
        self.remember(&mut s, op, action.kind(), "none", Some("invalid"));
        self.changed.notify_all();
    }
    fn cancel(&self, op: u32) {
        let mut b = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        if let Some(at) = s.queue.iter().position(|v| v.op() == Some(op)) {
            let action = s.queue.remove(at).unwrap();
            if let UserAction::Editor(v) = &action {
                v.reject("cancelled");
                self.changed.notify_all();
                return;
            }
            Self::uncharge(&mut s, &mut b, action.bytes());
            self.remember(&mut s, op, action.kind(), "none", Some("cancelled"));
            self.changed.notify_all();
        } else {
            self.existing(&s, op);
        }
    }
    fn resize(&self, op: Option<u32>, grid: PtySize) -> Result<(), String> {
        let mut b = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        if let Some(op) = op {
            if op <= s.last_op {
                self.existing(&s, op);
                return Ok(());
            }
            s.last_op = op;
        }
        if s.closed || !Self::room(&s, &b, 0) {
            if let Some(op) = op {
                let reason = if s.closed { "closed" } else { "capacity" };
                self.remember(&mut s, op, "resize-state", "none", Some(reason));
            }
            return Err("native resize capacity or closed".into());
        }
        if let Some(op) = op {
            if !self.out.reserve_input(self.sid, op) {
                self.remember(&mut s, op, "resize-state", "none", Some("capacity"));
                return Err("native result slot capacity".into());
            }
        }
        // Only the contiguous tail may be replaced. A user input placeholder is an ordering barrier.
        if matches!(s.queue.back(), Some(UserAction::Resize(_, _))) {
            if let Some(UserAction::Resize(old, _)) = s.queue.pop_back() {
                Self::uncharge(&mut s, &mut b, 0);
                if let Some(old) = old {
                    self.remember(&mut s, old, "resize-state", "superseded", None);
                }
            }
        }
        Self::charge(&mut s, &mut b, 0);
        s.queue.push_back(UserAction::Resize(op, grid));
        if let Some(op) = op {
            self.notice(op, "resize-state", "queued", None);
        }
        self.changed.notify_all();
        Ok(())
    }
    fn legacy(&self, bytes: &[u8]) -> Result<(), String> {
        if bytes.is_empty() || bytes.len() > frame::OPERATION_BYTES {
            return Err("native input capacity exceeded".into());
        }
        let mut b = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        if s.closed || s.queue.len() >= 2 || !Self::room(&s, &b, bytes.len()) {
            return Err("native input capacity or closed".into());
        }
        Self::charge(&mut s, &mut b, bytes.len());
        s.queue.push_back(UserAction::Write(UserOperation {
            op: None,
            data: bytes.to_vec(),
            total: bytes.len(),
            ready: true,
            born: Instant::now(),
        }));
        self.changed.notify_all();
        Ok(())
    }
    fn reject_reply(&self, failure: ReplyFailure) -> ReplyFailure {
        let _ = self.out.reply_failure(self.sid, failure);
        failure
    }
    fn reply(&self, bytes: &[u8]) -> Result<(), ReplyFailure> {
        if self.reply_slot.failed() {
            return Err(ReplyFailure::Closed);
        }
        if bytes.is_empty() {
            return Err(self.reject_reply(ReplyFailure::Invalid));
        }
        if bytes.len() > frame::REPLY_FRAME_BYTES {
            return Err(self.reject_reply(ReplyFailure::Capacity));
        }
        let mut b = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        if s.ended || self.reply_slot.failed() {
            return Err(self.reject_reply(ReplyFailure::Closed));
        }
        if s.replies.len() >= 64
            || b.replies >= 512
            || s.reply_bytes + bytes.len() > frame::SESSION_REPLY_BYTES
            || b.reply_bytes + bytes.len() > frame::HELPER_REPLY_BYTES
        {
            return Err(self.reject_reply(ReplyFailure::Capacity));
        }
        s.reply_bytes += bytes.len();
        b.reply_bytes += bytes.len();
        b.replies += 1;
        b.reply_peak = b.reply_peak.max(b.reply_bytes);
        b.replies_peak = b.replies_peak.max(b.replies);
        s.replies.push_back(bytes.to_vec());
        self.changed.notify_all();
        Ok(())
    }
    /// Queue a console handshake. Failure stays silent: this is not a user reply.
    fn console_reply(&self, bytes: &[u8]) -> bool {
        if bytes.is_empty() || bytes.len() > 32 {
            return false;
        }
        let mut state = self.state.lock().unwrap();
        if state.ended || state.closed || state.handoffs.len() >= 8 {
            return false;
        }
        state.handoffs.push_back(bytes.to_vec());
        drop(state);
        self.changed.notify_all();
        true
    }
    fn ready(&self) {
        self.state.lock().unwrap().user_ready = true;
        self.changed.notify_all();
    }
    fn claim(&self) -> Option<ClaimedInput> {
        loop {
            let mut s = self.state.lock().unwrap();
            if let Some(bytes) = s.handoffs.pop_front() {
                return Some(ClaimedInput::Handoff(bytes));
            }
            if let Some(bytes) = s.replies.pop_front() {
                return Some(ClaimedInput::Reply(bytes));
            }
            if let Some(UserAction::Editor(v)) = s.queue.front() {
                if v.expired() {
                    let op = v.op;
                    drop(s);
                    self.cancel(op);
                    continue;
                }
            }
            if matches!(s.queue.front(),Some(UserAction::Editor(v)) if !v.ready()) {
                let _ = self
                    .changed
                    .wait_timeout(s, Duration::from_millis(10))
                    .unwrap();
                continue;
            }
            if matches!(s.queue.front(),Some(UserAction::Write(v)) if !v.ready) {
                let expired = matches!(s.queue.front(),Some(UserAction::Write(v)) if v.born.elapsed()>=Duration::from_secs(5));
                if expired {
                    let op = s.queue.front().unwrap().op().unwrap();
                    drop(s);
                    self.cancel(op);
                    continue;
                }
            } else if s.user_ready && s.claimed.is_none() {
                if let Some(action) = s.queue.pop_front() {
                    if let Some(op) = action.op() {
                        s.claimed = Some((op, action.kind()));
                        if matches!(action, UserAction::Write(_)) {
                            self.notice(op, action.kind(), "started", None);
                        }
                    }
                    return Some(ClaimedInput::User(action));
                }
            }
            if s.ended {
                return None;
            }
            let _ = self
                .changed
                .wait_timeout(s, Duration::from_millis(50))
                .unwrap();
        }
    }
    fn completed(&self, action: ClaimedInput, ok: bool) {
        let (bytes, reply, op, kind) = match &action {
            ClaimedInput::Handoff(_) => {
                drop(action);
                return;
            }
            ClaimedInput::Reply(bytes) => (bytes.len(), true, None, "input-state"),
            ClaimedInput::User(action) => (action.bytes(), false, action.op(), action.kind()),
        };
        drop(action); // Return allocation ownership before returning admission bytes/slots.
        let mut b = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        if reply {
            if !ok {
                self.reject_reply(ReplyFailure::WriteFailed);
            }
            s.reply_bytes -= bytes;
            b.reply_bytes -= bytes;
            b.replies -= 1;
        } else {
            Self::uncharge(&mut s, &mut b, bytes);
            s.claimed = None;
            if let Some(op) = op {
                self.remember(
                    &mut s,
                    op,
                    kind,
                    if ok {
                        if kind == "input-state" {
                            "written"
                        } else {
                            "applied"
                        }
                    } else {
                        "unknown"
                    },
                    if ok { None } else { Some("write-failed") },
                );
            }
        }
    }

    fn close(&self, ended: bool) {
        let mut b = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        s.closed = true;
        s.ended |= ended;
        s.handoffs.clear();
        while let Some(action) = s.queue.pop_front() {
            if let UserAction::Editor(v) = &action {
                v.reject("closed");
                continue;
            }
            Self::uncharge(&mut s, &mut b, action.bytes());
            if let Some(op) = action.op() {
                self.remember(&mut s, op, action.kind(), "none", Some("closed"));
            }
        }
        if ended {
            if !s.replies.is_empty() {
                self.reject_reply(ReplyFailure::Closed);
            }
            while let Some(bytes) = s.replies.pop_front() {
                s.reply_bytes -= bytes.len();
                b.reply_bytes -= bytes.len();
                b.replies -= 1;
            }
        }
        self.changed.notify_all();
    }
}

impl editor::Owner for InputQueue {
    fn foreground(&self) -> Option<i32> {
        #[cfg(unix)]
        {
            let master = self.master.lock().unwrap().as_ref()?.upgrade()?;
            let locked = master.try_lock().ok()?;
            locked.as_ref()?.process_group_leader()
        }
        #[cfg(not(unix))]
        {
            None
        }
    }
    fn release(&self, op: u32, bytes: usize) {
        let mut budget = self.budget.lock().unwrap();
        let mut s = self.state.lock().unwrap();
        s.queue
            .retain(|a| !matches!(a,UserAction::Editor(v)if v.op==op));
        Self::uncharge(&mut s, &mut budget, bytes);
        if s.claimed.is_some_and(|(id, _)| id == op) {
            s.claimed = None;
        }
        self.changed.notify_all();
    }
}

struct StreamDrain {
    reader_done: Arc<AtomicBool>,
    writer_done: Arc<AtomicBool>,
    master_done: Arc<AtomicBool>,
}
impl StreamDrain {
    fn new() -> Arc<Self> {
        Arc::new(Self {
            reader_done: Arc::new(AtomicBool::new(true)),
            writer_done: Arc::new(AtomicBool::new(true)),
            master_done: Arc::new(AtomicBool::new(true)),
        })
    }
}
// The completion flag owns the handle, including during unwinding. Publishing before
// a potentially blocking platform Drop would release a live resource reservation.
struct CompleteAfterDrop<T> {
    resource: Option<T>,
    done: Arc<AtomicBool>,
}
impl<T> CompleteAfterDrop<T> {
    fn new(resource: T, done: Arc<AtomicBool>) -> Self {
        Self {
            resource: Some(resource),
            done,
        }
    }
}
impl<T> Drop for CompleteAfterDrop<T> {
    fn drop(&mut self) {
        drop(self.resource.take());
        self.done.store(true, Ordering::SeqCst);
    }
}
#[derive(Clone)]
struct Pending {
    stop: Arc<Mutex<Stop>>,
    input: Arc<InputQueue>,
    flow: Arc<Flow>,
    drain: Arc<StreamDrain>,
    truncated: Arc<AtomicBool>,
}
pub struct SpawnTicket {
    pending: Pending,
}
struct StartupBytes {
    live: bool,
    buffered: Vec<u8>,
}
/// ConPTY can ask for the cursor and device attributes before the real program exists.
/// Answer locally and drop the query so it is neither user output nor a second reply.
#[cfg(any(windows, test))]
fn take_console_handoffs(buffer: &mut Vec<u8>) -> Vec<&'static [u8]> {
    fn take(
        buffer: &mut Vec<u8>,
        needle: &[u8],
        reply: &'static [u8],
        out: &mut Vec<&'static [u8]>,
    ) {
        while let Some(at) = buffer.windows(needle.len()).position(|window| window == needle) {
            buffer.drain(at..at + needle.len());
            out.push(reply);
        }
    }
    let mut replies = Vec::new();
    take(buffer, b"\x1b[6n", b"\x1b[1;1R", &mut replies);
    take(buffer, b"\x1b[?6n", b"\x1b[1;1R", &mut replies);
    take(buffer, b"\x1b[5n", b"\x1b[0n", &mut replies);
    take(buffer, b"\x1b[0c", b"\x1b[?1;0c", &mut replies);
    take(buffer, b"\x1b[c", b"\x1b[?1;0c", &mut replies);
    replies
}
struct Streams {
    master: Arc<Mutex<Option<Box<dyn MasterPty + Send>>>>,
    flow: Arc<Flow>,
    drain: Arc<StreamDrain>,
    close_started: AtomicBool,
    truncated: Arc<AtomicBool>,
    output_gate: Mutex<()>,
    /// Bytes read before the child exists. Success flushes them once; failure drops them.
    startup: Mutex<StartupBytes>,
}
struct Session {
    io: Arc<Streams>,
    input: Arc<InputQueue>,
    scope: Mutex<job::Scope>,
    exited: Arc<AtomicBool>,
    root: Mutex<Root>,
    stop: Arc<Mutex<Stop>>,
    sequence: Mutex<(u64, Option<Value>)>,
}
#[derive(Clone)]
pub struct Sessions {
    closing: Arc<AtomicBool>,
    reply_settlement: Arc<AtomicBool>,
    out: Outbox,
    live: Arc<Mutex<HashMap<u32, Arc<Session>>>>,
    pending: Arc<Mutex<HashMap<u32, Pending>>>,
    input_budget: Arc<Mutex<InputBudget>>,
    output_budget: Arc<Mutex<OutputBudget>>,
    slot_peak: Arc<std::sync::atomic::AtomicUsize>,
    editor: editor::Service,
    editor_enabled: Arc<AtomicBool>,
}
#[cfg(unix)]
fn nonblocking_master(master: &dyn MasterPty) -> Result<(), SpawnFailure> {
    let fd = master.as_raw_fd().ok_or_else(|| {
        SpawnFailure::before_spawn("pty-unavailable", "native PTY descriptor unavailable")
    })?;
    // dup reader/writer descriptors share this open-file description. Both loops handle EAGAIN/EINTR.
    let flags = unsafe { libc::fcntl(fd, libc::F_GETFL) };
    if flags < 0 || unsafe { libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK) } < 0 {
        return Err(SpawnFailure::before_spawn(
            "pty-unavailable",
            std::io::Error::last_os_error(),
        ));
    }
    Ok(())
}
/// A private duplicate of the nonblocking master, used only to wait for readability.
/// macOS hands out a PTY's output in small pieces; a fixed sleep after each empty
/// read capped a flood at tens of KiB per second. The duplicate closes with the reader.
#[cfg(unix)]
fn readiness_handle(master: &dyn MasterPty) -> Option<std::os::fd::OwnedFd> {
    use std::os::fd::FromRawFd;
    let fd = master.as_raw_fd()?;
    let copy = unsafe { libc::fcntl(fd, libc::F_DUPFD_CLOEXEC, 0) };
    (copy >= 0).then(|| unsafe { std::os::fd::OwnedFd::from_raw_fd(copy) })
}
/// Wait up to `wait` for output. `select` also works for terminals on macOS, where
/// `poll` does not. Without a usable descriptor this is a fixed sleep.
#[cfg(unix)]
fn wait_readable(handle: Option<&std::os::fd::OwnedFd>, wait: Duration) {
    use std::os::fd::AsRawFd;
    let Some(fd) = handle
        .map(|handle| handle.as_raw_fd())
        .filter(|fd| (*fd as usize) < libc::FD_SETSIZE as usize)
    else {
        thread::sleep(wait);
        return;
    };
    unsafe {
        let mut read: libc::fd_set = std::mem::zeroed();
        libc::FD_ZERO(&mut read);
        libc::FD_SET(fd, &mut read);
        let mut timeout = libc::timeval {
            tv_sec: 0,
            tv_usec: wait.as_micros().min(999_999) as libc::suseconds_t,
        };
        if libc::select(
            fd + 1,
            &mut read,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            &mut timeout,
        ) < 0
        {
            thread::sleep(wait);
        }
    }
}
/// How a coalesced read ended besides running out of immediately available output.
#[cfg(unix)]
enum ReadEnd {
    Eof,
    Failed,
}
/// After a small first read, keep draining the PTY into the same chunk for up to
/// `PTY_COALESCE` or until it holds `PTY_COALESCE_BYTES`. A line-at-a-time producer
/// then arrives as one frame per window, as it did with the former fixed 5 ms sleep,
/// while the kernel buffer is still emptied as soon as it is readable, so a producer
/// blocked on macOS's small PTY buffer is not throttled by the window. A read that is
/// already that large is forwarded as is and a coalesced chunk never grows past the
/// limit, so a flood keeps its kernel-sized frames.
#[cfg(unix)]
fn coalesce(
    reader: &mut dyn std::io::Read,
    buffer: &mut [u8],
    mut filled: usize,
    readiness: Option<&std::os::fd::OwnedFd>,
    closed: impl Fn() -> bool,
) -> (usize, Option<ReadEnd>) {
    const PTY_COALESCE: Duration = Duration::from_millis(5);
    const PTY_COALESCE_BYTES: usize = 2048;
    let until = Instant::now() + PTY_COALESCE;
    let limit = PTY_COALESCE_BYTES.min(buffer.len());
    while filled < limit && !closed() {
        match reader.read(&mut buffer[filled..limit]) {
            Ok(0) => return (filled, Some(ReadEnd::Eof)),
            Ok(n) => filled += n,
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => {}
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                let now = Instant::now();
                if now >= until {
                    break;
                }
                wait_readable(readiness, until - now);
            }
            Err(_) => return (filled, Some(ReadEnd::Failed)),
        }
    }
    (filled, None)
}
fn write_captured(writer: &mut dyn Write, bytes: &[u8], cancelled: impl Fn() -> bool) -> bool {
    #[cfg(windows)]
    {
        let _ = cancelled;
        return writer.write_all(bytes).and_then(|_| writer.flush()).is_ok();
    }
    #[cfg(unix)]
    {
        let deadline = Instant::now() + Duration::from_secs(10);
        let mut offset = 0;
        while offset < bytes.len() {
            if cancelled() || Instant::now() >= deadline {
                return false;
            }
            match writer.write(&bytes[offset..(offset + 16 * 1024).min(bytes.len())]) {
                Ok(0) => return false,
                Ok(n) => offset += n,
                Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(5))
                }
                Err(_) => return false,
            }
        }
        writer.flush().is_ok()
    }
}
fn write_inputs(
    input: Box<dyn Write + Send>,
    input_queue: Arc<InputQueue>,
    input_master: Arc<Mutex<Option<Box<dyn MasterPty + Send>>>>,
    writer_done: Arc<AtomicBool>,
) {
    let mut owned = CompleteAfterDrop::new(input, writer_done);
    while let Some(action) = input_queue.claim() {
        if let ClaimedInput::User(UserAction::Editor(value)) = action {
            value.claim();
            continue;
        }
        let input = owned.resource.as_mut().unwrap();
        let handoff = matches!(action, ClaimedInput::Handoff(_));
        let ok = match &action {
            ClaimedInput::User(UserAction::Write(value)) => {
                write_captured(&mut **input, &value.data, || {
                    input_queue.state.lock().unwrap().closed
                })
            }
            ClaimedInput::Reply(bytes) => write_captured(&mut **input, bytes, || {
                input_queue.state.lock().unwrap().ended
            }),
            ClaimedInput::Handoff(bytes) => write_captured(&mut **input, bytes, || {
                input_queue.state.lock().unwrap().closed
            }),
            ClaimedInput::User(UserAction::Editor(_)) => unreachable!(),
            ClaimedInput::User(UserAction::Resize(_, size)) => input_master
                .lock()
                .unwrap()
                .as_ref()
                .is_some_and(|master| master.resize(*size).is_ok()),
        };
        input_queue.completed(action, ok);
        if !ok && !handoff {
            input_queue.close(true);
            break;
        }
    }
    drop(owned);
}
struct OpenedPty {
    master: Box<dyn MasterPty + Send>,
    slave: Box<dyn portable_pty::SlavePty + Send>,
}
fn open_session_pty(cols: u16, rows: u16) -> Result<OpenedPty, SpawnFailure> {
    let pair = native_pty_system()
        .openpty(size(cols, rows))
        .map_err(|e| SpawnFailure::before_spawn("pty-unavailable", e))?;
    Ok(OpenedPty {
        master: pair.master,
        slave: pair.slave,
    })
}
fn size(cols: u16, rows: u16) -> PtySize {
    PtySize {
        cols: cols.max(1),
        rows: rows.max(1),
        pixel_width: 0,
        pixel_height: 0,
    }
}
fn close_streams(streams: &Streams) {
    if streams.close_started.swap(true, Ordering::SeqCst) {
        return;
    }
    let master = streams.master.clone();
    let done = streams.drain.master_done.clone();
    thread::spawn(move || {
        let owned = master.lock().unwrap().take();
        drop(CompleteAfterDrop::new(owned, done));
    });
}
fn close_master(session: &Session) {
    close_streams(&session.io);
}

fn publish(
    out: &Outbox,
    id: u32,
    session: &Session,
    cleanup: &str,
    reason: Option<&str>,
    remaining: Option<usize>,
    output: &str,
) {
    let root = session.root.lock().unwrap();
    let mut evidence = json!({"root":{"state":root.state,"code":root.code,"signal":root.signal},"cleanup":{"state":cleanup,"scope":session.scope.lock().unwrap().name(),"remainingKnown":remaining},"output":output});
    if let Some(reason) = reason {
        evidence["cleanup"]["reason"] = json!(reason);
    }
    drop(root);
    let request_id = session.stop.lock().unwrap().request_id.clone();
    let snapshot = json!({"evidence":evidence,"requestId":request_id});
    let mut sequence = session.sequence.lock().unwrap();
    if sequence.1.as_ref() == Some(&snapshot) {
        return;
    }
    sequence.0 += 1;
    sequence.1 = Some(snapshot);
    let mut notice = json!({"type":"terminal-termination","version":1,"sid":id,"sequence":sequence.0,"evidence":evidence});
    if let Some(request) = request_id {
        notice["requestId"] = json!(request);
    }
    control(out, notice);
}
impl Sessions {
    pub fn new(out: impl Into<Outbox>) -> Self {
        let out = out.into();
        Self {
            closing: Arc::new(AtomicBool::new(false)),
            reply_settlement: Arc::new(AtomicBool::new(false)),
            editor: editor::Service::new(out.clone()),
            editor_enabled: Arc::new(AtomicBool::new(false)),
            out,
            live: Arc::new(Mutex::new(HashMap::new())),
            pending: Arc::new(Mutex::new(HashMap::new())),
            input_budget: Arc::new(Mutex::new(InputBudget::default())),
            output_budget: Arc::new(Mutex::new(OutputBudget::default())),
            slot_peak: Arc::new(std::sync::atomic::AtomicUsize::new(0)),
        }
    }
    pub fn enable_editor(&self) {
        if crate::foreground::supported() {
            self.editor_enabled.store(true, Ordering::Release);
        }
    }
    pub fn editor_enabled(&self) -> bool {
        self.editor_enabled.load(Ordering::Acquire)
    }
    pub fn editor_control(&self, message: &Value) {
        if let Some(queue) = self.input_queue(message["sid"].as_u64().unwrap() as u32) {
            queue.editor_control(message);
        }
    }
    pub fn enable_reply_settlement(&self) {
        self.reply_settlement.store(true, Ordering::SeqCst);
    }
    pub fn reply_settlement(&self) -> bool {
        self.reply_settlement.load(Ordering::SeqCst)
    }
    pub fn close_replies(&self, id: u32) {
        if self.reply_settlement() {
            if let Some(queue) = self.input_queue(id) {
                if queue.state.lock().unwrap().ended {
                    queue.close_replies();
                }
            }
        }
    }
    #[cfg(test)]
    pub fn spawn(&self, id: u32, request: SpawnRequest) -> Result<Option<u32>, SpawnFailure> {
        let ticket = self.reserve(id)?;
        self.spawn_reserved(id, request, ticket)
    }
    #[cfg(test)]
    pub fn reserve(&self, id: u32) -> Result<SpawnTicket, SpawnFailure> {
        self.reserve_for_wire(id).map_err(|(failure, _)| failure)
    }
    /// The boolean proves only this request acquired no queue, with no older SID owner.
    /// Capture it under the same admission locks; zero output alone is not evidence.
    pub fn reserve_for_wire(&self, id: u32) -> Result<SpawnTicket, (SpawnFailure, bool)> {
        let mut pending = self.pending.lock().unwrap();
        let live = self.live.lock().unwrap();
        let owned =
            pending.contains_key(&id) || live.contains_key(&id) || self.out.has_reply_owner(id);
        if id == 0 || self.closing.load(Ordering::SeqCst) {
            return Err((
                SpawnFailure::before_spawn("program-rejected", "native host is closing"),
                id != 0 && !owned,
            ));
        }
        if owned {
            return Err((
                SpawnFailure {
                    code: "session-conflict",
                    effect: "unknown",
                    message: format!("session {id} already exists"),
                },
                false,
            ));
        }
        if pending.len() + live.len() >= 32 {
            return Err((
                SpawnFailure::before_spawn("pty-unavailable", "native session capacity exceeded"),
                true,
            ));
        }
        let input =
            InputQueue::new(id, self.out.clone(), self.input_budget.clone()).ok_or_else(|| {
                (
                    SpawnFailure::before_spawn(
                        "pty-unavailable",
                        "native reply result capacity exceeded",
                    ),
                    !self.out.has_reply_owner(id),
                )
            })?;
        input
            .settlement_required
            .store(self.reply_settlement(), Ordering::SeqCst);
        let pending_session = Pending {
            stop: Arc::new(Mutex::new(Stop::default())),
            input,
            flow: Arc::new(Flow::with_budget(self.output_budget.clone())),
            drain: StreamDrain::new(),
            truncated: Arc::new(AtomicBool::new(false)),
        };
        self.slot_peak
            .fetch_max(pending.len() + live.len() + 1, Ordering::SeqCst);
        pending.insert(id, pending_session.clone());
        Ok(SpawnTicket {
            pending: pending_session,
        })
    }
    pub fn spawn_reserved(
        &self,
        id: u32,
        request: SpawnRequest,
        ticket: SpawnTicket,
    ) -> Result<Option<u32>, SpawnFailure> {
        let pending = ticket.pending.clone();
        let result = self.spawn_inner(id, request, ticket);
        if result.is_err() {
            pending.input.close(true);
            if let Some(binding) = pending.input.editor.lock().unwrap().as_ref() {
                binding.root_ended();
            }
            self.retire_pending(id, pending);
        } else {
            self.pending.lock().unwrap().remove(&id);
        }
        result
    }
    fn retire_pending(&self, id: u32, pending: Pending) {
        let drained = |pending: &Pending| {
            pending.drain.reader_done.load(Ordering::SeqCst)
                && pending.drain.writer_done.load(Ordering::SeqCst)
                && pending.drain.master_done.load(Ordering::SeqCst)
                && pending.flow.outstanding() == 0
                && pending.input.editor_done()
                && pending
                    .input
                    .settle_replies(pending.drain.writer_done.load(Ordering::SeqCst))
        };
        // A zero-output failure can finish local handle teardown before publishing
        // typed-none, preserving immediate SID reuse without freeing a live slot.
        // Only this spawn worker waits; stdin/control and other sessions stay free.
        let until = Instant::now() + Duration::from_millis(100);
        while pending.flow.outstanding() == 0 && !drained(&pending) && Instant::now() < until {
            thread::sleep(Duration::from_millis(2));
        }
        if drained(&pending) {
            self.pending.lock().unwrap().remove(&id);
            return;
        }
        let entries = self.pending.clone();
        thread::spawn(move || {
            while !drained(&pending) {
                thread::sleep(Duration::from_millis(20));
            }
            entries.lock().unwrap().remove(&id);
        });
    }
    fn spawn_inner(
        &self,
        id: u32,
        request: SpawnRequest,
        ticket: SpawnTicket,
    ) -> Result<Option<u32>, SpawnFailure> {
        let stop = ticket.pending.stop;
        let opened = open_session_pty(request.cols, request.rows)?;
        if request
            .cwd
            .as_ref()
            .is_some_and(|cwd| !cwd.is_empty() && !std::path::Path::new(cwd).is_dir())
        {
            return Err(SpawnFailure::before_spawn(
                "directory-unavailable",
                "working directory does not exist",
            ));
        }
        let enrolled = if self.editor_enabled() {
            if let Some(launch) = &request.editor {
                let guard = crate::foreground::validate_launch(
                    &request.file,
                    &request.args,
                    request.cwd.as_deref(),
                    &request.env,
                    &launch["recipe"],
                )
                .map_err(|e| SpawnFailure::before_spawn("program-rejected", e.reason()))?;
                let owner: Arc<dyn editor::Owner> = ticket.pending.input.clone();
                let binding = self
                    .editor
                    .enroll(id, launch, guard, Arc::downgrade(&owner))
                    .map_err(|e| SpawnFailure::before_spawn("pty-unavailable", e))?;
                *ticket.pending.input.editor.lock().unwrap() = Some(binding.clone());
                if !binding.prepared() {
                    return Err(SpawnFailure::before_spawn(
                        "pty-unavailable",
                        "private editor capability could not be prepared",
                    ));
                }
                Some(binding)
            } else {
                None
            }
        } else {
            None
        };
        let mut command = CommandBuilder::new(&request.file);
        command.args(&request.args);
        if let Some(cwd) = request.cwd.as_ref().filter(|s| !s.is_empty()) {
            command.cwd(cwd);
        }
        for (key, value) in &request.env {
            command.env(key, value);
        }
        #[cfg(unix)]
        if let Some(binding) = &enrolled {
            command.env("HUHU_EDITOR_CAPABILITY_FILE", binding.cap_path());
        }
        if self.closing.load(Ordering::SeqCst) || stop.lock().unwrap().at.is_some() {
            return Err(SpawnFailure::before_spawn(
                "program-rejected",
                "session cancelled before spawn",
            ));
        }
        #[cfg(windows)]
        let scope =
            job::Scope::new().map_err(|e| SpawnFailure::before_spawn("pty-unavailable", e))?;
        #[cfg(unix)]
        nonblocking_master(&*opened.master)?;
        #[cfg(unix)]
        let readiness = readiness_handle(&*opened.master);
        #[cfg(windows)]
        let readiness = ();
        let (reader, input, ()) = prepare_before_spawn(
            || {
                opened
                    .master
                    .try_clone_reader()
                    .map_err(|e| SpawnFailure::before_spawn("pty-unavailable", e))
            },
            || {
                opened
                    .master
                    .take_writer()
                    .map_err(|e| SpawnFailure::before_spawn("pty-unavailable", e))
            },
            || Ok(()),
        )?;
        ticket
            .pending
            .drain
            .reader_done
            .store(false, Ordering::SeqCst);
        ticket
            .pending
            .drain
            .writer_done
            .store(false, Ordering::SeqCst);
        ticket
            .pending
            .drain
            .master_done
            .store(false, Ordering::SeqCst);
        let streams = Arc::new(Streams {
            master: Arc::new(Mutex::new(Some(opened.master))),
            flow: ticket.pending.flow,
            drain: ticket.pending.drain.clone(),
            close_started: AtomicBool::new(false),
            truncated: ticket.pending.truncated.clone(),
            output_gate: Mutex::new(()),
            startup: Mutex::new(StartupBytes {
                live: false,
                buffered: Vec::new(),
            }),
        });
        *ticket.pending.input.master.lock().unwrap() = Some(Arc::downgrade(&streams.master));
        // ConPTY can require a parser/device reply before the gated bootstrap itself starts.
        // Both directions must therefore run during bootstrap, without exposing user code early.
        let input_master = streams.master.clone();
        let input_queue = ticket.pending.input.clone();
        let writer_done = streams.drain.writer_done.clone();
        thread::spawn(move || write_inputs(input, input_queue, input_master, writer_done));
        let read_io = streams.clone();
        let out = self.out.clone();
        let startup_input = ticket.pending.input.clone();
        thread::spawn(move || {
            let reserve = ReaderReserve::new(read_io.flow.budget.clone());
            let mut owned = CompleteAfterDrop::new(
                (reader, vec![0u8; READ_CHUNK], reserve, readiness),
                read_io.drain.reader_done.clone(),
            );
            #[cfg(unix)]
            let mut ended: Option<ReadEnd> = None;
            loop {
                // A coalesced read that already met EOF or an error ends after its bytes.
                #[cfg(unix)]
                match ended.take() {
                    Some(ReadEnd::Eof) => break,
                    Some(ReadEnd::Failed) => {
                        read_io.truncated.store(true, Ordering::SeqCst);
                        break;
                    }
                    None => {}
                }
                if !read_io.flow.wait_for_credit() {
                    break;
                }
                let (reader, buffer, _, _readiness) = owned.resource.as_mut().unwrap();
                match reader.read(buffer) {
                    Ok(0) => break,
                    Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        #[cfg(unix)]
                        wait_readable(_readiness.as_ref(), Duration::from_millis(5));
                        #[cfg(windows)]
                        thread::sleep(Duration::from_millis(5));
                        continue;
                    }
                    Err(_) => {
                        read_io.truncated.store(true, Ordering::SeqCst);
                        break;
                    }
                    Ok(n) => {
                        #[cfg(unix)]
                        let n = {
                            let closed = || read_io.flow.closed();
                            let (n, end) =
                                coalesce(&mut **reader, buffer, n, _readiness.as_ref(), closed);
                            ended = end;
                            n
                        };
                        if read_io.flow.closed() {
                            break;
                        }
                        if read_io.flow.discard() {
                            read_io.truncated.store(true, Ordering::SeqCst);
                            continue;
                        }
                        let held = {
                            let mut startup = read_io.startup.lock().unwrap();
                            if startup.live {
                                None
                            } else {
                                // ConPTY can emit a device query before CreateProcess.
                                // Hold it so a missing program is not published as child output.
                                // Answer the query or the console host waits out the launch.
                                let replies = if startup.buffered.len().saturating_add(n) > 64 * 1024
                                {
                                    startup.buffered.clear();
                                    read_io.truncated.store(true, Ordering::SeqCst);
                                    Vec::new()
                                } else {
                                    startup.buffered.extend_from_slice(&buffer[..n]);
                                    #[cfg(windows)]
                                    {
                                        take_console_handoffs(&mut startup.buffered)
                                    }
                                    #[cfg(not(windows))]
                                    {
                                        Vec::new()
                                    }
                                };
                                Some(replies)
                            }
                        };
                        if let Some(replies) = held {
                            for reply in replies {
                                let _ = startup_input.console_reply(reply);
                            }
                            continue;
                        }
                        read_io.flow.sent(n as u64);
                        if out
                            .output(
                                id,
                                &buffer[..n],
                                || read_io.flow.closed(),
                                &read_io.output_gate,
                            )
                            .is_err()
                        {
                            read_io.flow.acknowledged(n as u64);
                            read_io.truncated.store(true, Ordering::SeqCst);
                            break;
                        }
                    }
                }
            }
            drop(owned);
        });
        // portable-pty resolves the executable and passes it as lpApplicationName.
        // A missing image fails inside CreateProcess with no process. Those os errors
        // stay program-rejected/none. The helper detaches from the parent console
        // before this call; otherwise an existing console program stays inside
        // CreateProcess on that console lock.
        let child_result = (|| {
            #[cfg(windows)]
            crate::bootstrap::detach_parent_console();
            let child = opened.slave.spawn_command(command).map_err(|error| {
                #[cfg(windows)]
                {
                    SpawnFailure::before_spawn(
                        crate::bootstrap::spawn_failure_code(&error.to_string()),
                        error,
                    )
                }
                #[cfg(unix)]
                {
                    SpawnFailure::before_spawn("program-rejected", error)
                }
            })?;
            #[cfg(windows)]
            let child = {
                let mut child = child;
                crate::bootstrap::contain(&mut *child, &scope.job)?;
                child
            };
            Ok(child)
        })();
        drop(opened.slave);
        let mut child = match child_result {
            Ok(child) => child,
            Err(error) => {
                streams.startup.lock().unwrap().buffered.clear();
                // ClosePseudoConsole can emit a final cursor query. The reader must still be
                // running to answer it; closing the flow first drops that query and stalls
                // the next session behind the console host.
                close_streams(&streams);
                let deadline = Instant::now() + Duration::from_secs(2);
                while !streams.drain.master_done.load(Ordering::SeqCst)
                    && Instant::now() < deadline
                {
                    thread::sleep(Duration::from_millis(5));
                }
                streams.flow.close();
                return Err(error);
            }
        };
        let prelude = {
            let mut startup = streams.startup.lock().unwrap();
            startup.live = true;
            std::mem::take(&mut startup.buffered)
        };
        if !prelude.is_empty() {
            streams.flow.sent(prelude.len() as u64);
            if self
                .out
                .output(id, &prelude, || streams.flow.closed(), &streams.output_gate)
                .is_err()
            {
                streams.flow.acknowledged(prelude.len() as u64);
                streams.truncated.store(true, Ordering::SeqCst);
            }
        }
        ticket.pending.input.ready();
        let pid = child.process_id();
        if let Some(binding) = &enrolled {
            if pid.and_then(|pid| binding.capture(pid).ok()).is_none() {
                binding.close("closed");
            }
        }
        #[cfg(unix)]
        let scope = job::Scope::capture(pid);
        let session = Arc::new(Session {
            io: streams,
            input: ticket.pending.input,
            scope: Mutex::new(scope),
            exited: Arc::new(AtomicBool::new(false)),
            root: Mutex::new(Root {
                state: "running",
                code: None,
                signal: None,
                at: None,
            }),
            stop,
            sequence: Mutex::new((0, None)),
        });
        self.live.lock().unwrap().insert(id, session.clone());
        let watched = session.clone();
        thread::spawn(move || {
            let result = child.wait();
            let mut root = watched.root.lock().unwrap();
            root.at = Some(Instant::now());
            match result {
                Ok(status) => {
                    root.state = "exited";
                    if let Some(binding) = watched.input.editor.lock().unwrap().as_ref() {
                        binding.root_ended();
                    }
                    root.code = Some(status.exit_code());
                    root.signal = status.signal().map(str::to_owned);
                }
                Err(_) => root.state = "unknown",
            }
            watched.exited.store(true, Ordering::SeqCst);
        });
        let out = self.out.clone();
        let live = self.live.clone();
        thread::spawn(move || {
            let mut graceful = false;
            let mut numeric = false;
            let mut finalized = false;
            loop {
                let now = Instant::now();
                let (stop_at, force) = {
                    let stop = session.stop.lock().unwrap();
                    (stop.at, stop.force)
                };
                let (root_at, root_state) = {
                    let root = session.root.lock().unwrap();
                    (root.at, root.state)
                };
                let deadline = stop_at.or(root_at).map(|at| at + STOP_BUDGET);
                let expired = deadline.is_some_and(|at| now >= at);
                if stop_at.is_some() {
                    session.io.flow.drain();
                    if !graceful {
                        let _ = session.scope.lock().unwrap().signal(false);
                        graceful = true;
                        #[cfg(windows)]
                        close_master(&session);
                    }
                    if !expired && (force || now.duration_since(stop_at.unwrap()) >= GRACE) {
                        let _ = session.scope.lock().unwrap().signal(true);
                    }
                }
                let observed = session.scope.lock().unwrap().observe();
                let confirmed = root_state == "exited" && matches!(observed, Ok(0));
                // A pseudoconsole stays open after its last client exits: the output pipe
                // reaches EOF only after ClosePseudoConsole, which also flushes the final
                // screen bytes. Close it as soon as the session job is empty so the reader
                // drains to EOF instead of waiting out DRAIN and reporting truncation.
                #[cfg(windows)]
                if confirmed && !numeric {
                    close_master(&session);
                }
                let output = if session.io.drain.reader_done.load(Ordering::SeqCst) {
                    if session.io.truncated.load(Ordering::SeqCst) {
                        "truncated"
                    } else {
                        "drained"
                    }
                } else {
                    "unknown"
                };
                let mut send_exit = false;
                if let Some(at) = root_at {
                    session.io.flow.drain();
                    if !numeric
                        && (output != "unknown" || now.duration_since(at) >= DRAIN || expired)
                    {
                        let _gate = session.io.output_gate.lock().unwrap();
                        if output == "unknown" {
                            session.io.truncated.store(true, Ordering::SeqCst);
                            session.io.flow.close();
                            close_master(&session);
                        }
                        send_exit = true;
                        numeric = true;
                    }
                }
                let output = if session.io.truncated.load(Ordering::SeqCst) {
                    "truncated"
                } else {
                    output
                };
                let remaining = observed.as_ref().ok().copied();
                let reason = if root_state == "unknown" {
                    Some("wait-failed")
                } else {
                    observed.as_ref().err().copied()
                };
                if confirmed {
                    publish(&out, id, &session, "confirmed", None, Some(0), output);
                } else if expired {
                    publish(
                        &out,
                        id,
                        &session,
                        if remaining.is_some_and(|n| n > 0) || reason == Some("escaped-member") {
                            "partial"
                        } else {
                            "unknown"
                        },
                        reason.or(Some("deadline")),
                        remaining,
                        output,
                    );
                } else {
                    publish(&out, id, &session, "pending", None, remaining, output);
                }
                if send_exit {
                    // Publish explicit drain/truncation evidence before the legacy exit closes
                    // consumer parsers; root wait alone is never a cleanup or output barrier.

                    session.input.close(true);
                    let root = session.root.lock().unwrap();
                    control(
                        &out,
                        json!({"type":"exit","sid":id,"code":root.code,"signal":root.signal}),
                    );
                }
                let replies_settled = numeric
                    && session
                        .input
                        .settle_replies(session.io.drain.writer_done.load(Ordering::SeqCst));
                if confirmed && numeric {
                    if !finalized {
                        session.io.flow.close();
                        close_master(&session);
                        finalized = true;
                    }
                    // Accepted raw credit may still be in stdout/Node/headless. Do not recycle this slot early.
                    if session.io.flow.outstanding() == 0
                        && session.io.drain.reader_done.load(Ordering::SeqCst)
                        && session.io.drain.writer_done.load(Ordering::SeqCst)
                        && session.io.drain.master_done.load(Ordering::SeqCst)
                        && replies_settled
                        && session.input.editor_done()
                    {
                        live.lock().unwrap().remove(&id);
                        break;
                    }
                }
                thread::sleep(Duration::from_millis(if expired { 250 } else { 50 }));
            }
        });
        Ok(pid)
    }
    fn get(&self, id: u32) -> Option<Arc<Session>> {
        self.live.lock().unwrap().get(&id).cloned()
    }
    fn input_queue(&self, id: u32) -> Option<Arc<InputQueue>> {
        self.get(id).map(|s| s.input.clone()).or_else(|| {
            self.pending
                .lock()
                .unwrap()
                .get(&id)
                .map(|p| p.input.clone())
        })
    }
    pub fn write(&self, id: u32, bytes: &[u8]) -> Result<(), String> {
        self.input_queue(id)
            .ok_or_else(|| format!("no session {id}"))?
            .legacy(bytes)
    }
    pub fn reply(&self, id: u32, bytes: &[u8]) -> Result<(), ReplyFailure> {
        self.input_queue(id)
            .ok_or_else(|| ReplyFailure::Closed)?
            .reply(bytes)
    }
    pub fn resize(&self, id: u32, cols: u16, rows: u16) -> Result<(), String> {
        self.input_queue(id)
            .ok_or_else(|| format!("no session {id}"))?
            .resize(None, size(cols, rows))
    }
    pub fn input_control(&self, message: &Value) {
        let id = frame::u32_value(&message["sid"]).unwrap() as u32;
        if message["type"] == "output-abandon" {
            self.abandon_output(id);
            return;
        }
        let op = frame::u32_value(&message["op"]).unwrap() as u32;
        let Some(queue) = self.input_queue(id) else {
            control(
                &self.out,
                json!({"type":if message["type"]=="resize"{"resize-state"}else{"input-state"},"sid":id,"op":op,"state":"none","reason":"closed"}),
            );
            return;
        };
        match message["type"].as_str().unwrap() {
            "input-begin" => queue.begin(
                op,
                frame::u32_value(&message["totalBytes"]).unwrap() as usize,
            ),
            "input-commit" => queue.commit(op),
            "input-cancel" => queue.cancel(op),
            "resize" => {
                let _ = queue.resize(
                    Some(op),
                    size(
                        frame::u32_value(&message["cols"]).unwrap() as u16,
                        frame::u32_value(&message["rows"]).unwrap() as u16,
                    ),
                );
            }
            _ => {}
        }
    }
    pub fn input_part(&self, id: u32, op: u32, offset: u32, bytes: &[u8]) {
        if let Some(queue) = self.input_queue(id) {
            queue.part(op, offset as usize, bytes);
        }
    }
    pub fn abandon_output(&self, id: u32) {
        if let Some(session) = self.get(id) {
            let _gate = session.io.output_gate.lock().unwrap();
            session.io.truncated.store(true, Ordering::SeqCst);
            session.io.flow.abandon();
        } else if let Some(pending) = self.pending.lock().unwrap().get(&id) {
            pending.truncated.store(true, Ordering::SeqCst);
            pending.flow.abandon();
        }
    }
    pub fn acknowledge(&self, id: u32, bytes: u64) {
        if let Some(session) = self.get(id) {
            session.io.flow.acknowledged(bytes);
        } else if let Some(pending) = self.pending.lock().unwrap().get(&id) {
            pending.flow.acknowledged(bytes);
        }
    }
    pub fn request_stop(&self, id: u32, force: bool, request_id: Option<String>) {
        if let Some(input) = self.input_queue(id) {
            if let Some(binding) = input.editor.lock().unwrap().as_ref() {
                binding.close("closed");
            }
            input.close(false);
        }
        let stop = self.get(id).map(|s| s.stop.clone()).or_else(|| {
            self.pending
                .lock()
                .unwrap()
                .get(&id)
                .map(|p| p.stop.clone())
        });
        if let Some(stop) = stop {
            let mut stop = stop.lock().unwrap();
            stop.at.get_or_insert_with(Instant::now);
            stop.force |= force;
            if stop.request_id.is_none() {
                stop.request_id = request_id;
            }
        }
    }
    pub fn end(&self, id: u32, force: bool) {
        self.request_stop(id, force, None);
    }
    pub fn metrics(&self) -> Option<Value> {
        let b = self.input_budget.try_lock().ok()?;
        let o = self.output_budget.try_lock().ok()?;
        let live = self.live.try_lock().ok()?;
        let pending = self.pending.try_lock().ok()?;
        let mut reader_pending = 0;
        let mut writer_pending = 0;
        let mut master_pending = 0;
        for drain in live
            .values()
            .map(|s| &s.io.drain)
            .chain(pending.values().map(|p| &p.drain))
        {
            reader_pending += usize::from(!drain.reader_done.load(Ordering::SeqCst));
            writer_pending += usize::from(!drain.writer_done.load(Ordering::SeqCst));
            master_pending += usize::from(!drain.master_done.load(Ordering::SeqCst));
        }
        Some(
            json!({"liveSlotsAtSample":live.len(),"pendingSlotsAtSample":pending.len(),"rawUnacknowledgedAtSample":o.credit,"readerHandlesPending":reader_pending,"writerHandlesPending":writer_pending,"masterHandlesPending":master_pending,"userBytesPeak":b.peak_bytes,"userOperationsPeak":b.peak_operations,"replyBytesPeak":b.reply_peak,"replyOperationsPeak":b.replies_peak,"rawUnacknowledgedPeak":o.peak,"abandonedRawBytes":o.abandoned,"readerReservePeak":o.reader_peak,"sessionSlotsPeak":self.slot_peak.load(Ordering::SeqCst)}),
        )
    }
    pub fn end_all(&self) -> std::io::Result<()> {
        let deadline = Instant::now() + STOP_BUDGET;
        self.closing.store(true, Ordering::SeqCst);
        self.editor.shutdown();
        let mut ids: Vec<_> = self.live.lock().unwrap().keys().copied().collect();
        ids.extend(self.pending.lock().unwrap().keys().copied());
        for id in ids {
            // EOF is the final ingress fence; no more parser replies can arrive.
            if let Some(queue) = self.input_queue(id) {
                queue.close_replies();
            }
            self.end(id, false);
        }
        while Instant::now() < deadline {
            // Output written after the fence is never acknowledged either.
            let sessions: Vec<_> = self.live.lock().unwrap().values().cloned().collect();
            for session in sessions {
                session.io.flow.forget();
            }
            let pending: Vec<_> = self.pending.lock().unwrap().values().cloned().collect();
            for pending in pending {
                pending.flow.forget();
            }
            if self.live.lock().unwrap().is_empty() && self.pending.lock().unwrap().is_empty() {
                break;
            }
            thread::sleep(Duration::from_millis(20));
        }
        self.editor.finish_shutdown(deadline)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;
    #[cfg(unix)]
    use std::{sync::mpsc::Receiver, time::Instant};

    fn queue_fixture() -> (Arc<InputQueue>, std::sync::mpsc::Receiver<Vec<u8>>) {
        let (tx, rx) = mpsc::channel();
        let queue =
            InputQueue::new(7, tx.into(), Arc::new(Mutex::new(InputBudget::default()))).unwrap();
        queue.ready();
        (queue, rx)
    }
    #[test]
    fn console_handoff_queries_are_answered_and_removed_from_startup_bytes() {
        let mut buffer = b"abc\x1b[6n\x1b[?25h\x1b[0c\x1b[c".to_vec();
        let replies = take_console_handoffs(&mut buffer);
        assert_eq!(buffer, b"abc\x1b[?25h");
        assert_eq!(
            replies,
            vec![
                b"\x1b[1;1R".as_slice(),
                b"\x1b[?1;0c".as_slice(),
                b"\x1b[?1;0c".as_slice()
            ]
        );
        let mut partial = b"\x1b[6".to_vec();
        assert!(take_console_handoffs(&mut partial).is_empty());
        assert_eq!(partial, b"\x1b[6");
        partial.extend_from_slice(b"n");
        assert_eq!(
            take_console_handoffs(&mut partial),
            vec![b"\x1b[1;1R".as_slice()]
        );
        assert!(partial.is_empty());
        let mut status = b"\x1b[5n".to_vec();
        assert_eq!(take_console_handoffs(&mut status), vec![b"\x1b[0n".as_slice()]);
        assert!(status.is_empty());
        let mut private = b"\x1b[?6nrest".to_vec();
        assert_eq!(
            take_console_handoffs(&mut private),
            vec![b"\x1b[1;1R".as_slice()]
        );
        assert_eq!(private, b"rest");
        let (queue, rx) = queue_fixture();
        assert!(queue.console_reply(b"\x1b[1;1R"));
        assert!(rx.try_recv().is_err(), "a console handoff is not a client frame");
    }
    #[test]
    fn unowned_reserve_rejection_is_distinct_from_duplicate_closing_and_pending_io() {
        let out = Outbox::new();
        let sessions = Sessions::new(out.clone());
        sessions.enable_reply_settlement();
        let _ticket = sessions.reserve(7).unwrap();
        let (duplicate, settled) = sessions.reserve_for_wire(7).err().unwrap();
        assert_eq!(duplicate.effect, "unknown");
        assert!(!settled);
        sessions.closing.store(true, Ordering::SeqCst);
        let (closing, settled) = sessions.reserve_for_wire(7).err().unwrap();
        assert_eq!(closing.effect, "none");
        assert!(!settled);
        let (_, settled) = sessions.reserve_for_wire(8).err().unwrap();
        assert!(settled);
        let (_, settled) = sessions.reserve_for_wire(0).err().unwrap();
        assert!(!settled);
        let other_out = Outbox::new();
        let _slots: Vec<_> = (1..=32)
            .map(|sid| other_out.reserve_reply(sid).unwrap())
            .collect();
        let other = Sessions::new(other_out);
        let (_, settled) = other.reserve_for_wire(33).err().unwrap();
        assert!(settled, "foreign-slot capacity has no same-SID I/O owner");
        let (_, settled) = other.reserve_for_wire(1).err().unwrap();
        assert!(
            !settled,
            "an older same-SID reply slot must never be declared settled"
        );
        assert!(
            !sessions.input_queue(7).unwrap().settle_replies(true),
            "pending queue needs ingress fence, even with no output"
        );
    }
    #[test]
    fn claimed_reply_finishes_after_exit_before_the_real_writer_and_ingress_settlement_fence() {
        use std::sync::mpsc;
        struct Writer {
            entered: mpsc::Sender<()>,
            proceed: mpsc::Receiver<()>,
            ok: bool,
        }
        impl Write for Writer {
            fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
                self.entered.send(()).unwrap();
                self.proceed.recv_timeout(Duration::from_secs(3)).unwrap();
                if self.ok {
                    Ok(bytes.len())
                } else {
                    Err(std::io::Error::other("injected actual write failure"))
                }
            }
            fn flush(&mut self) -> std::io::Result<()> {
                Ok(())
            }
        }
        struct Capture(mpsc::Sender<Vec<u8>>);
        impl Write for Capture {
            fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
                self.0.send(bytes.to_vec()).unwrap();
                Ok(bytes.len())
            }
            fn flush(&mut self) -> std::io::Result<()> {
                Ok(())
            }
        }
        for ok in [false, true] {
            let out = Outbox::new();
            let q = InputQueue::new(7, out.clone(), Arc::new(Mutex::new(InputBudget::default())))
                .unwrap();
            q.settlement_required.store(true, Ordering::SeqCst);
            q.reply(b"claimed").unwrap();
            let (entered, at) = mpsc::channel();
            let (proceed, wait) = mpsc::channel();
            let done = Arc::new(AtomicBool::new(false));
            let copied = q.clone();
            let writer_done = done.clone();
            let worker = thread::spawn(move || {
                write_inputs(
                    Box::new(Writer {
                        entered,
                        proceed: wait,
                        ok,
                    }),
                    copied,
                    Arc::new(Mutex::new(None)),
                    writer_done,
                )
            });
            at.recv_timeout(Duration::from_secs(3)).unwrap();
            q.close(true);
            control(&out, json!({"type":"exit","sid":7,"code":0,"signal":null}));
            let (captured, frames) = mpsc::channel();
            let scheduler = out.clone();
            let stdout = thread::spawn(move || scheduler.run(Capture(captured)));
            let first = frames.recv_timeout(Duration::from_secs(3)).unwrap();
            assert_eq!(
                serde_json::from_slice::<Value>(&first[5..]).unwrap()["type"],
                "exit"
            );
            assert!(!q.settle_replies(false));
            q.close_replies();
            assert!(
                !q.settle_replies(false),
                "ingress fence alone cannot invent writer completion"
            );
            proceed.send(()).unwrap();
            worker.join().unwrap();
            assert!(done.load(Ordering::SeqCst), "actual writer handle dropped");
            assert!(q.settle_replies(true));
            assert!(q.settle_replies(true));
            out.finish();
            stdout.join().unwrap();
            let messages: Vec<Value> = frames
                .try_iter()
                .map(|b| serde_json::from_slice(&b[5..]).unwrap())
                .collect();
            let kinds: Vec<&str> = messages
                .iter()
                .map(|v| v["type"].as_str().unwrap())
                .collect();
            assert_eq!(
                kinds,
                if ok {
                    vec!["reply-settled"]
                } else {
                    vec!["reply-failure", "reply-settled"]
                }
            );
            if !ok {
                assert_eq!(messages[0]["state"], "unknown");
                assert_eq!(messages[0]["reason"], "write-failed");
            }
        }
    }
    #[test]
    fn reply_rejections_and_actual_write_failure_have_one_bounded_sid_diagnostic() {
        for mode in [
            "frames",
            "bytes",
            "closed",
            "write-failed",
            "successful-claimed-close",
        ] {
            let out = Outbox::new();
            let budget = Arc::new(Mutex::new(InputBudget::default()));
            let q = InputQueue::new(7, out.clone(), budget.clone()).unwrap();
            match mode {
                "frames" => {
                    for _ in 0..64 {
                        q.reply(b"r").unwrap();
                    }
                    assert!(q.reply(b"overflow").is_err());
                }
                "bytes" => {
                    for _ in 0..4 {
                        q.reply(&[b'r'; 4096]).unwrap();
                    }
                    assert!(q.reply(b"overflow").is_err());
                }
                "closed" => {
                    q.reply(b"queued").unwrap();
                    q.close(true);
                }
                "write-failed" => {
                    q.reply(b"claimed").unwrap();
                    let action = q.claim().unwrap();
                    q.completed(action, false);
                }
                _ => {
                    q.reply(b"claimed").unwrap();
                    let action = q.claim().unwrap();
                    q.close(true);
                    q.completed(action, true);
                }
            }
            if mode != "successful-claimed-close" {
                for _ in 0..1000 {
                    let _ = q.reply(b"later");
                }
            }
            out.finish();
            let mut bytes = Vec::new();
            out.run(&mut bytes);
            let mut input = std::io::Cursor::new(bytes);
            let mut messages = Vec::new();
            while let Some(frame) = frame::read_frame(&mut input).unwrap() {
                messages.push(serde_json::from_slice::<Value>(&frame.body).unwrap());
            }
            let faults: Vec<_> = messages
                .iter()
                .filter(|v| v["type"] == "reply-failure")
                .collect();
            assert_eq!(
                faults.len(),
                if mode == "successful-claimed-close" {
                    0
                } else {
                    1
                },
                "{mode}"
            );
            if let Some(fault) = faults.first() {
                assert_eq!(fault["sid"], 7);
                assert_eq!(
                    fault["state"],
                    if mode == "write-failed" {
                        "unknown"
                    } else {
                        "none"
                    }
                );
            }
            q.close(true);
            let b = budget.lock().unwrap();
            assert_eq!(b.reply_bytes, 0);
            assert_eq!(b.replies, 0);
        }
    }
    #[test]
    fn reply_helper_count_and_byte_limits_isolate_sibling_sessions() {
        for byte_limit in [false, true] {
            let out = Outbox::new();
            let budget = Arc::new(Mutex::new(InputBudget::default()));
            let queues: Vec<_> = (1..=9)
                .map(|sid| InputQueue::new(sid, out.clone(), budget.clone()).unwrap())
                .collect();
            let width = if byte_limit { 4096 } else { 1 };
            let count = if byte_limit { 4 } else { 64 };
            for q in queues.iter().take(8) {
                for _ in 0..count {
                    q.reply(&vec![b'r'; width]).unwrap();
                }
            }
            assert!(queues[8].reply(b"overflow").is_err());
            let action = queues[0].claim().unwrap();
            queues[0].completed(action, true);
            // The rejected SID's first-fault gate stays closed; a healthy sibling progresses.
            assert!(queues[8].reply(b"retry").is_err());
            queues[0].reply(b"sibling").unwrap();
            for q in &queues {
                q.close(true);
            }
            let b = budget.lock().unwrap();
            assert_eq!(b.reply_bytes, 0);
            assert_eq!(b.replies, 0);
        }
    }
    #[cfg(unix)]
    #[test]
    fn cancellable_writer_preserves_offset_across_retry_and_reports_partial_stop() {
        struct ScriptedWriter {
            calls: usize,
            bytes: Vec<u8>,
            cancel: Arc<AtomicBool>,
            stop_after_first: bool,
        }
        impl Write for ScriptedWriter {
            fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
                self.calls += 1;
                if self.calls == 2 {
                    return Err(std::io::ErrorKind::Interrupted.into());
                }
                if self.calls == 3 {
                    return Err(std::io::ErrorKind::WouldBlock.into());
                }
                let n = bytes.len().min(2);
                self.bytes.extend_from_slice(&bytes[..n]);
                if self.stop_after_first {
                    self.cancel.store(true, Ordering::SeqCst);
                }
                Ok(n)
            }
            fn flush(&mut self) -> std::io::Result<()> {
                Ok(())
            }
        }
        let cancel = Arc::new(AtomicBool::new(false));
        let mut writer = ScriptedWriter {
            calls: 0,
            bytes: Vec::new(),
            cancel: cancel.clone(),
            stop_after_first: false,
        };
        assert!(write_captured(&mut writer, b"abcdef", || cancel.load(Ordering::SeqCst)));
        assert_eq!(writer.bytes, b"abcdef");
        assert_eq!(writer.calls, 5);
        let mut writer = ScriptedWriter {
            calls: 0,
            bytes: Vec::new(),
            cancel: cancel.clone(),
            stop_after_first: true,
        };
        assert!(!write_captured(&mut writer, b"abcdef", || cancel.load(Ordering::SeqCst)));
        assert_eq!(writer.bytes, b"ab");
    }

    #[test]
    fn writer_completion_is_not_published_before_handle_drop_during_unwind() {
        struct PanickingWriter {
            done: Arc<AtomicBool>,
            observed: Arc<AtomicBool>,
        }
        impl Write for PanickingWriter {
            fn write(&mut self, _: &[u8]) -> std::io::Result<usize> {
                panic!("injected writer panic")
            }
            fn flush(&mut self) -> std::io::Result<()> {
                Ok(())
            }
        }
        impl Drop for PanickingWriter {
            fn drop(&mut self) {
                self.observed
                    .store(self.done.load(Ordering::SeqCst), Ordering::SeqCst);
            }
        }
        let (q, _rx) = queue_fixture();
        q.begin(1, 1);
        q.part(1, 0, b"x");
        q.commit(1);
        let done = Arc::new(AtomicBool::new(false));
        let observed = Arc::new(AtomicBool::new(false));
        let input = Box::new(PanickingWriter {
            done: done.clone(),
            observed: observed.clone(),
        });
        let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            write_inputs(input, q, Arc::new(Mutex::new(None)), done.clone())
        }));
        assert!(outcome.is_err());
        assert!(done.load(Ordering::SeqCst));
        assert!(
            !observed.load(Ordering::SeqCst),
            "completion was visible while the writer handle was still being dropped"
        );
    }

    #[test]
    fn whole_input_reserves_before_parts_and_cancel_cannot_undo_claim() {
        let (q, rx) = queue_fixture();
        q.begin(1, 4);
        q.part(1, 0, b"ab");
        assert!(
            matches!(q.state.lock().unwrap().queue.front(),Some(UserAction::Write(v)) if !v.ready)
        );
        q.reply(b"reply").unwrap();
        let reply = q.claim().unwrap();
        assert!(matches!(&reply,ClaimedInput::Reply(bytes) if bytes==b"reply"));
        q.completed(reply, true);
        q.part(1, 2, b"cd");
        q.commit(1);
        let action = q.claim().unwrap();
        q.cancel(1);
        q.completed(action, false);
        let notices: Vec<Value> = rx
            .try_iter()
            .map(|bytes| serde_json::from_slice(&bytes[5..]).unwrap())
            .collect();
        assert!(!notices.iter().any(|v| v["state"] == "none"));
        assert_eq!(notices.last().unwrap()["state"], "unknown");
        assert_eq!(q.budget.lock().unwrap().bytes, 0);
    }
    #[test]
    fn resize_coalesces_only_tail_and_reply_survives_full_user_budget() {
        let (q, rx) = queue_fixture();
        q.resize(Some(1), size(80, 24)).unwrap();
        q.resize(Some(2), size(90, 24)).unwrap();
        q.begin(3, frame::OPERATION_BYTES);
        q.resize(Some(4), size(100, 24)).unwrap();
        q.resize(Some(5), size(110, 24)).unwrap();
        assert_eq!(
            q.state
                .lock()
                .unwrap()
                .queue
                .iter()
                .map(|v| v.op())
                .collect::<Vec<_>>(),
            vec![Some(2), Some(3), Some(5)]
        );
        q.begin(6, frame::OPERATION_BYTES);
        q.begin(7, 1);
        q.reply(b"ok").unwrap();
        let reply = q.claim().unwrap();
        assert!(matches!(&reply,ClaimedInput::Reply(bytes) if bytes==b"ok"));
        q.completed(reply, true);
        let notices: Vec<Value> = rx
            .try_iter()
            .map(|bytes| serde_json::from_slice(&bytes[5..]).unwrap())
            .collect();
        assert!(notices
            .iter()
            .any(|v| v["op"] == 7 && v["reason"] == "capacity"));
        assert!(notices
            .iter()
            .any(|v| v["op"] == 1 && v["state"] == "superseded"));
        q.cancel(3);
        q.close(true);
        assert_eq!(q.budget.lock().unwrap().bytes, 0);
    }
    #[test]
    fn incomplete_commit_and_bad_offset_prove_no_write_and_release_capacity() {
        let (q, rx) = queue_fixture();
        q.begin(1, 4);
        q.part(1, 1, b"a");
        q.begin(2, 4);
        q.part(2, 0, b"a");
        q.commit(2);
        assert!(q.state.lock().unwrap().queue.is_empty());
        assert_eq!(q.budget.lock().unwrap().operations, 0);
        let notices: Vec<Value> = rx
            .try_iter()
            .map(|bytes| serde_json::from_slice(&bytes[5..]).unwrap())
            .collect();
        assert_eq!(
            notices
                .iter()
                .filter(|v| v["state"] == "none" && v["reason"] == "invalid")
                .count(),
            2
        );
    }
    #[test]
    fn pending_spawn_slots_are_bounded_before_any_pty_allocation() {
        let (tx, _rx) = mpsc::channel();
        let sessions = Sessions::new(tx);
        let mut tickets = Vec::new();
        for sid in 1..=32 {
            tickets.push(sessions.reserve(sid).unwrap());
        }
        assert!(sessions.reserve(33).is_err());
        assert_eq!(sessions.pending.lock().unwrap().len(), 32);
    }

    #[test]
    fn failed_spawn_retiring_keeps_slot_until_all_owned_resources_and_ack_finish() {
        let (tx, _rx) = mpsc::channel();
        let sessions = Sessions::new(tx);
        let ticket = sessions.reserve(77).unwrap();
        let pending = ticket.pending.clone();
        pending.flow.sent(12);
        pending.drain.reader_done.store(false, Ordering::SeqCst);
        pending.drain.writer_done.store(false, Ordering::SeqCst);
        pending.drain.master_done.store(false, Ordering::SeqCst);
        sessions.retire_pending(77, pending.clone());
        pending.drain.reader_done.store(true, Ordering::SeqCst);
        pending.drain.writer_done.store(true, Ordering::SeqCst);
        sessions.acknowledge(77, 12);
        thread::sleep(Duration::from_millis(30));
        assert!(sessions.pending.lock().unwrap().contains_key(&77));
        pending.drain.master_done.store(true, Ordering::SeqCst);
        let deadline = Instant::now() + Duration::from_secs(1);
        while sessions.pending.lock().unwrap().contains_key(&77) && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(5));
        }
        assert!(!sessions.pending.lock().unwrap().contains_key(&77));
        assert_eq!(sessions.output_budget.lock().unwrap().credit, 0);
    }
    #[test]
    fn explicit_abandon_is_separate_from_parse_ack_and_does_not_complete_resources() {
        let (tx, _rx) = mpsc::channel();
        let sessions = Sessions::new(tx);
        let ticket = sessions.reserve(78).unwrap();
        let pending = ticket.pending.clone();
        pending.flow.sent(100);
        pending.drain.reader_done.store(false, Ordering::SeqCst);
        sessions.retire_pending(78, pending.clone());
        sessions.abandon_output(78);
        assert_eq!(sessions.output_budget.lock().unwrap().abandoned, 100);
        assert!(pending.truncated.load(Ordering::SeqCst));
        thread::sleep(Duration::from_millis(30));
        assert!(sessions.pending.lock().unwrap().contains_key(&78));
        pending.drain.reader_done.store(true, Ordering::SeqCst);
        let deadline = Instant::now() + Duration::from_secs(1);
        while sessions.pending.lock().unwrap().contains_key(&78) && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(5));
        }
        assert!(!sessions.pending.lock().unwrap().contains_key(&78));
    }
    #[cfg(unix)]
    fn collect(
        rx: &Receiver<Vec<u8>>,
        until: impl Fn(&[u8], &[serde_json::Value]) -> bool,
    ) -> (Vec<u8>, Vec<serde_json::Value>) {
        let mut output = Vec::new();
        let mut messages = Vec::new();
        let deadline = Instant::now() + Duration::from_secs(10);
        while Instant::now() < deadline && !until(&output, &messages) {
            let Ok(bytes) = rx.recv_timeout(Duration::from_millis(100)) else {
                continue;
            };
            let frame = frame::read_frame(&mut &bytes[..]).unwrap().unwrap();
            match frame.kind {
                frame::OUTPUT => {
                    output.extend_from_slice(frame::session_body(&frame.body).unwrap().1)
                }
                frame::CONTROL => {
                    let value: Value = serde_json::from_slice(&frame.body).unwrap();
                    if value["type"] != "terminal-termination" {
                        messages.push(value);
                    }
                }
                _ => panic!("unexpected frame"),
            }
        }
        (output, messages)
    }

    #[cfg(unix)]
    fn request(script: &str) -> SpawnRequest {
        SpawnRequest {
            file: "/bin/sh".into(),
            args: vec!["-c".into(), script.into()],
            cwd: None,
            env: HashMap::new(),
            cols: 80,
            rows: 24,
            editor: None,
        }
    }

    #[cfg(unix)]
    #[test]
    fn output_arrives_before_the_exit_message() {
        let (tx, rx) = mpsc::channel();
        let sessions = Sessions::new(tx);
        sessions
            .spawn(1, request("printf 'one two three'; exit 3"))
            .unwrap();
        let (output, messages) = collect(&rx, |_, messages| !messages.is_empty());
        assert!(String::from_utf8_lossy(&output).contains("one two three"));
        assert_eq!(messages[0]["type"], "exit");
        assert_eq!(messages[0]["code"], 3);
    }

    #[cfg(unix)]
    #[test]
    fn input_resize_and_environment_reach_the_process() {
        let (tx, rx) = mpsc::channel();
        let sessions = Sessions::new(tx);
        let mut req = request("read line; stty size; printf \"$HUHU_PROBE:$line\"");
        req.env.insert("HUHU_PROBE".into(), "env-ok".into());
        sessions.spawn(2, req).unwrap();
        sessions.resize(2, 120, 40).unwrap();
        sessions.write(2, b"typed\r").unwrap();
        let (output, _) = collect(&rx, |output, _| {
            String::from_utf8_lossy(output).contains("env-ok:typed")
        });
        let text = String::from_utf8_lossy(&output);
        assert!(text.contains("40 120"), "{text}");
        assert!(text.contains("env-ok:typed"), "{text}");
    }

    #[cfg(unix)]
    #[test]
    fn unacknowledged_output_pauses_the_reader() {
        let (tx, rx) = mpsc::channel();
        let sessions = Sessions::new(tx);
        sessions
            .spawn(
                3,
                request("head -c 4000000 /dev/zero | tr '\\0' 'x'; sleep 5"),
            )
            .unwrap();
        thread::sleep(Duration::from_millis(1500));
        let mut received = 0usize;
        while let Ok(bytes) = rx.try_recv() {
            received += bytes.len();
        }
        assert!(
            received as u64 <= PAUSE_AT + READ_CHUNK as u64 + 4096,
            "received {received}"
        );
        let session = sessions.get(3).unwrap();
        session.io.flow.acknowledged(PAUSE_AT);
        thread::sleep(Duration::from_millis(500));
        let mut more = 0usize;
        while let Ok(bytes) = rx.try_recv() {
            more += bytes.len();
        }
        assert!(more > 0, "reading resumed after acknowledgement");
        sessions.end(3, true);
    }

    #[cfg(unix)]
    #[test]
    fn ending_a_session_hangs_up_then_reports_exit() {
        let (tx, rx) = mpsc::channel();
        let sessions = Sessions::new(tx);
        sessions
            .spawn(4, request("trap '' TERM; sleep 30"))
            .unwrap();
        thread::sleep(Duration::from_millis(200));
        sessions.end(4, false);
        let (output, messages) = collect(&rx, |_, messages| !messages.is_empty());
        assert_eq!(messages[0]["type"], "exit");
        sessions.acknowledge(4, output.len() as u64);
        let deadline = Instant::now() + Duration::from_secs(2);
        while sessions.get(4).is_some() && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(10));
        }
        assert!(sessions.get(4).is_none());
    }

    #[test]
    fn missing_programs_and_directories_are_reported() {
        let (tx, _rx) = mpsc::channel();
        let sessions = Sessions::new(tx);
        let missing = SpawnRequest {
            file: "huhu-no-such-program-xyz".into(),
            args: vec![],
            cwd: None,
            env: HashMap::new(),
            cols: 80,
            rows: 24,
            editor: None,
        };
        assert!(sessions.spawn(5, missing).is_err());
        let bad_cwd = SpawnRequest {
            file: "huhu-no-such-program-xyz".into(),
            args: vec![],
            cwd: Some("/huhu/no/such/dir".into()),
            env: HashMap::new(),
            cols: 80,
            rows: 24,
            editor: None,
        };
        assert_eq!(
            sessions.spawn(6, bad_cwd).unwrap_err().code,
            "directory-unavailable"
        );
    }

    #[cfg(unix)]
    #[test]
    fn pending_fifo_is_bounded_and_stop_closes_admission_without_resetting_deadline() {
        let (tx, _rx) = mpsc::channel();
        let sessions = Sessions::new(tx);
        let ticket = sessions.reserve(91).unwrap();
        sessions.resize(91, 99, 33).unwrap();
        sessions.write(91, b"queued\n").unwrap();
        assert!(sessions.write(91, b"overflow").is_err());
        sessions.request_stop(91, false, Some("first".into()));
        let at = ticket.pending.stop.lock().unwrap().at.unwrap();
        sessions.request_stop(91, true, Some("second".into()));
        {
            let stop = ticket.pending.stop.lock().unwrap();
            assert_eq!(stop.at, Some(at));
            assert!(stop.force);
            assert_eq!(stop.request_id.as_deref(), Some("first"));
        }
        assert!(sessions.write(91, b"after-stop").is_err());
        let error = sessions
            .spawn_reserved(91, request("exit 17"), ticket)
            .unwrap_err();
        assert_eq!(error.effect, "none");
        assert!(sessions.get(91).is_none());
    }

    #[test]
    fn stream_initialization_failure_never_invokes_spawn() {
        use std::cell::Cell;
        for fail_reader in [true, false] {
            let spawned = Cell::new(false);
            let result = prepare_before_spawn(
                || {
                    if fail_reader {
                        Err(SpawnFailure::before_spawn("pty-unavailable", "reader"))
                    } else {
                        Ok(())
                    }
                },
                || Err::<(), _>(SpawnFailure::before_spawn("pty-unavailable", "writer")),
                || {
                    spawned.set(true);
                    Ok(())
                },
            );
            let error = result.unwrap_err();
            assert_eq!(error.effect, "none");
            assert!(!spawned.get());
        }
    }
}

#[cfg(test)]
fn valid_termination_fixture(v: &Value, context: &Value) -> bool {
    fn fields(v: &Value, names: &[&str]) -> bool {
        v.as_object()
            .is_some_and(|o| o.keys().all(|k| names.contains(&k.as_str())))
    }
    fn number(v: &Value, max: u64) -> bool {
        v.as_u64().is_some_and(|n| n <= max)
    }
    if context["capability"].as_u64() != Some(1)
        || !fields(
            v,
            &[
                "type",
                "version",
                "sid",
                "requestId",
                "sequence",
                "evidence",
            ],
        )
    {
        return false;
    }
    if v["type"] != "terminal-termination"
        || v["version"].as_u64() != Some(1)
        || !number(&v["sid"], u32::MAX as u64)
        || v["sid"].as_u64() == Some(0)
        || v["sid"] != context["sid"]
    {
        return false;
    }
    if !number(&v["sequence"], 9007199254740991)
        || !number(&context["lastSequence"], 9007199254740991)
        || v["sequence"].as_u64() <= context["lastSequence"].as_u64()
    {
        return false;
    }
    if let Some(id) = v.get("requestId") {
        if !id.as_str().is_some_and(|s| {
            !s.is_empty()
                && s.encode_utf16().count() <= 128
                && !s.chars().any(|c| c < ' ' || c == '\u{7f}')
        }) {
            return false;
        }
    }
    let Some(platform) = context["platform"].as_str() else {
        return false;
    };
    if !["linux", "darwin", "win32"].contains(&platform) {
        return false;
    }
    let e = &v["evidence"];
    let root = &e["root"];
    let clean = &e["cleanup"];
    if !fields(e, &["root", "cleanup", "output"])
        || !fields(root, &["state", "code", "signal"])
        || !fields(clean, &["state", "scope", "remainingKnown", "reason"])
    {
        return false;
    }
    let (Some(state), Some(clean_state), Some(scope), Some(output)) = (
        root["state"].as_str(),
        clean["state"].as_str(),
        clean["scope"].as_str(),
        e["output"].as_str(),
    ) else {
        return false;
    };
    if !["running", "unknown", "not-started", "exited"].contains(&state)
        || !["pending", "confirmed", "partial", "unknown"].contains(&clean_state)
        || !["not-started", "unix-session", "windows-job", "root-only"].contains(&scope)
        || !["drained", "truncated", "unknown"].contains(&output)
    {
        return false;
    }
    if root.get("code").is_none()
        || root.get("signal").is_none()
        || clean.get("remainingKnown").is_none()
    {
        return false;
    }
    if state == "exited" {
        if !root["code"].is_null() && !number(&root["code"], u32::MAX as u64) {
            return false;
        }
        if !root["signal"].is_null()
            && !root["signal"]
                .as_str()
                .is_some_and(|s| !s.is_empty() && s.encode_utf16().count() <= 80)
        {
            return false;
        }
    } else if !root["code"].is_null() || !root["signal"].is_null() {
        return false;
    }
    if !clean["remainingKnown"].is_null() && !number(&clean["remainingKnown"], 9007199254740991) {
        return false;
    }
    if let Some(reason) = clean.get("reason") {
        if !reason.as_str().is_some_and(|r| {
            [
                "legacy-helper",
                "wait-failed",
                "scope-unverified",
                "residuals-present",
                "signal-failed",
                "deadline",
                "escaped-member",
                "transport-lost",
            ]
            .contains(&r)
        }) {
            return false;
        }
    }
    if (scope == "not-started") != (state == "not-started")
        || scope == "not-started" && (clean_state != "confirmed" || output != "drained")
    {
        return false;
    }
    if clean_state == "confirmed"
        && (scope == "root-only"
            || clean["remainingKnown"].as_u64() != Some(0)
            || clean.get("reason").is_some()
            || !["exited", "not-started"].contains(&state))
    {
        return false;
    }
    if scope == "unix-session" && platform == "win32"
        || scope == "windows-job" && platform != "win32"
    {
        return false;
    }
    true
}

#[test]
fn termination_v1_uses_the_shared_positive_and_negative_wire_fixture() {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../test/fixtures/native/terminal-termination-v1.json"
    ))
    .unwrap();
    for row in fixture["cases"].as_array().unwrap() {
        assert_eq!(
            valid_termination_fixture(&row["wire"], &row["context"]),
            row["valid"].as_bool().unwrap(),
            "{}",
            row["name"]
        );
    }
}
