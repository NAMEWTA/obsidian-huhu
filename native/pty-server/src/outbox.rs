//! One bounded helper-wide stdio scheduler. Only PTY reader threads may wait for output space.
use crate::frame;
use serde_json::Value;
use std::{
    collections::{BTreeMap, BTreeSet, VecDeque},
    io::{self, Write},
    sync::{Arc, Condvar, Mutex, Weak},
    time::Duration,
};
pub const OUTPUT_BYTES: usize = 4 * 1024 * 1024;
pub const RESULT_BYTES: usize = 4 * 1024 * 1024;
pub const RESULT_WORKERS: usize = 2;
pub const RESULT_DATA_BYTES: usize = RESULT_BYTES / 8;
const OUTPUT_FRAMES: usize = 256;
#[derive(Clone, Copy, Debug)]
pub enum BrokerClass {
    Forward,
    Small,
    Registration,
    EditorLife,
    EditorReceipt,
}
impl BrokerClass {
    fn index(self) -> usize {
        match self {
            Self::Forward => 0,
            Self::Small => 1,
            Self::Registration => 2,
            Self::EditorLife => 3,
            Self::EditorReceipt => 4,
        }
    }
    fn frame_limit(self) -> usize {
        use crate::local_control::wire_generated as w;
        match self {
            Self::Forward => w::REQUEST_BYTES + w::WRAPPER_BYTES + 5,
            Self::Small => w::WRAPPER_BYTES + 5,
            Self::Registration => w::REGISTRATION_BYTES + 5,
            Self::EditorLife => w::EDITOR_LIFECYCLE_BYTES + 5,
            Self::EditorReceipt => w::EDITOR_RECEIPT_BYTES + 5,
        }
    }
    fn slots(self) -> usize {
        match self {
            Self::Forward | Self::Small => 16,
            Self::Registration => 2,
            Self::EditorLife => 64,
            Self::EditorReceipt => 128 * 6,
        }
    }
}
/// Tracks physical handoff independently from observation. No caller can turn a claimed write back into none.
#[derive(Default)]
pub struct BrokerDelivery(std::sync::atomic::AtomicU8);
impl BrokerDelivery {
    pub fn cancel_queued(&self) -> bool {
        self.0
            .compare_exchange(
                0,
                3,
                std::sync::atomic::Ordering::AcqRel,
                std::sync::atomic::Ordering::Acquire,
            )
            .is_ok()
    }
    pub fn complete(&self) -> bool {
        matches!(self.0.load(std::sync::atomic::Ordering::Acquire), 2 | 4)
    }
    fn claim(&self) -> bool {
        self.0
            .compare_exchange(
                0,
                1,
                std::sync::atomic::Ordering::AcqRel,
                std::sync::atomic::Ordering::Acquire,
            )
            .is_ok()
    }
    fn finish(&self) {
        let next = if self.0.load(std::sync::atomic::Ordering::Acquire) == 3 {
            4
        } else {
            2
        };
        self.0.store(next, std::sync::atomic::Ordering::Release);
    }
}

struct BrokerCharge {
    class: BrokerClass,
    delivery: Option<Arc<BrokerDelivery>>,
    completed: Option<Arc<std::sync::atomic::AtomicBool>>,
}

const CONTROL_BYTES: usize = 256 * 1024;
const CONTROL_FRAMES: usize = 1024;
const REPLY_FAULT_SLOTS: usize = 32;
const REPLY_FAULT_BYTES: usize = 256;
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReplyFailure {
    Capacity,
    Closed,
    Invalid,
    WriteFailed,
}
impl ReplyFailure {
    fn state(self) -> &'static str {
        if self == Self::WriteFailed {
            "unknown"
        } else {
            "none"
        }
    }
    fn reason(self) -> &'static str {
        match self {
            Self::Capacity => "capacity",
            Self::Closed => "closed",
            Self::Invalid => "invalid",
            Self::WriteFailed => "write-failed",
        }
    }
}
pub struct ReplySlot {
    failure: Mutex<Option<ReplyFailure>>,
    settled: std::sync::atomic::AtomicBool,
}
impl ReplySlot {
    pub fn failed(&self) -> bool {
        self.failure.lock().unwrap().is_some()
    }
}
#[derive(Clone, Copy, Default, Debug)]
pub struct Stats {
    pub output: usize,
    pub output_peak: usize,
    pub output_frames_peak: usize,
    pub control: usize,
    pub control_peak: usize,
    pub workers: usize,
    pub workers_peak: usize,
}
struct Packet {
    bytes: Vec<u8>,
    output: bool,
    result: bool,
    receipt: Option<(u32, u32, String)>,
    // Keeps this SID's independent reservation alive until its physical write completes.
    reply_fault: Option<Arc<ReplySlot>>,
    broker: Option<BrokerCharge>,
}
#[derive(Default)]
struct Receipt {
    pending: usize,
    finalized: bool,
    states: BTreeSet<String>,
}
#[derive(Default)]
struct State {
    streams: BTreeMap<u32, VecDeque<Packet>>,
    broker: BTreeMap<String, VecDeque<Packet>>,
    broker_cursor: String,
    broker_slots: [usize; 5],
    broker_peak: [usize; 5],
    high: VecDeque<Packet>,
    bulk: VecDeque<Packet>,
    receipts: BTreeMap<(u32, u32), Receipt>,
    receipt_bytes: usize,
    reply_slots: BTreeMap<u32, Weak<ReplySlot>>,
    reply_fault_bytes: usize,
    reply_fault_peak: usize,
    reply_slots_peak: usize,
    stats: Stats,
    controls: usize,
    outputs: usize,
    cursor: u32,
    burst: u8,
    closed: bool,
    finishing: bool,
}
struct Inner {
    state: Mutex<State>,
    changed: Condvar,
}
#[derive(Clone)]
pub struct Outbox {
    inner: Arc<Inner>,
    #[cfg(test)]
    fixture: Option<std::sync::mpsc::Sender<Vec<u8>>>,
}
#[cfg(test)]
impl From<std::sync::mpsc::Sender<Vec<u8>>> for Outbox {
    fn from(sender: std::sync::mpsc::Sender<Vec<u8>>) -> Self {
        let mut out = Self::new();
        out.fixture = Some(sender);
        out
    }
}
impl Outbox {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Inner {
                state: Mutex::new(State::default()),
                changed: Condvar::new(),
            }),
            #[cfg(test)]
            fixture: None,
        }
    }
    #[cfg(test)]
    pub fn stats(&self) -> Stats {
        self.inner.state.lock().unwrap().stats
    }
    pub fn metrics(&self) -> Option<Value> {
        let s = self.inner.state.try_lock().ok()?;
        Some(
            serde_json::json!({"encodedOutputBytesPeak":s.stats.output_peak,"outputFramesPeak":s.stats.output_frames_peak,"controlBytesPeak":s.stats.control_peak,"resultWorkersPeak":s.stats.workers_peak,"resultFrameReservePeak":s.stats.workers_peak*RESULT_BYTES,"replyFaultBytesPeak":s.reply_fault_peak,"replyFaultSlotsPeak":s.reply_slots_peak,"brokerSlots":&s.broker_slots[..3],"brokerSlotsPeak":&s.broker_peak[..3],"editorSlots":&s.broker_slots[3..],"editorSlotsPeak":&s.broker_peak[3..],"brokerReservedBytesPeak":[s.broker_peak[0]*BrokerClass::Forward.frame_limit(),s.broker_peak[1]*BrokerClass::Small.frame_limit(),s.broker_peak[2]*BrokerClass::Registration.frame_limit()]}),
        )
    }
    /// A distinct control-broker reserve, acquired before JSON cloning/encoding. It never borrows PTY/control/history capacity.
    pub fn reserve_broker(&self, class: BrokerClass) -> Option<BrokerPermit> {
        let mut s = self.inner.state.lock().unwrap();
        let i = class.index();
        if s.closed || s.broker_slots[i] >= class.slots() {
            return None;
        }
        s.broker_slots[i] += 1;
        s.broker_peak[i] = s.broker_peak[i].max(s.broker_slots[i]);
        Some(BrokerPermit {
            out: self.clone(),
            class,
            transferred: false,
        })
    }
    pub fn is_closed(&self) -> bool {
        self.inner.state.lock().unwrap().closed
    }
    pub fn reserve_input(&self, sid: u32, op: u32) -> bool {
        let mut s = self.inner.state.lock().unwrap();
        if s.closed || s.receipts.len() >= 128 || s.receipts.contains_key(&(sid, op)) {
            return false;
        }
        s.receipts.insert((sid, op), Receipt::default());
        true
    }
    pub fn has_reply_owner(&self, sid: u32) -> bool {
        self.inner
            .state
            .lock()
            .unwrap()
            .reply_slots
            .get(&sid)
            .and_then(Weak::upgrade)
            .is_some()
    }
    pub fn reserve_reply(&self, sid: u32) -> Option<Arc<ReplySlot>> {
        let mut state = self.inner.state.lock().unwrap();
        state.reply_slots.retain(|_, slot| slot.strong_count() > 0);
        if state.closed
            || state.reply_slots.contains_key(&sid)
            || state.reply_slots.len() >= REPLY_FAULT_SLOTS
        {
            return None;
        }
        let slot = Arc::new(ReplySlot {
            failure: Mutex::new(None),
            settled: std::sync::atomic::AtomicBool::new(false),
        });
        state.reply_slots.insert(sid, Arc::downgrade(&slot));
        state.reply_slots_peak = state.reply_slots_peak.max(state.reply_slots.len());
        Some(slot)
    }
    /// One first-fault packet per reserved SID. Ordinary errors cannot spend its reserve.
    pub fn reply_failure(&self, sid: u32, failure: ReplyFailure) -> Result<(), ()> {
        let mut state = self.inner.state.lock().unwrap();
        let slot = state
            .reply_slots
            .get(&sid)
            .and_then(Weak::upgrade)
            .ok_or(())?;
        if slot.settled.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(());
        }
        let mut first = slot.failure.lock().unwrap();
        if first.is_some() {
            return Ok(());
        }
        if state.closed {
            return Err(());
        }
        let bytes = encode_json(&serde_json::json!({"type":"reply-failure","sid":sid,"state":failure.state(),"reason":failure.reason()}), REPLY_FAULT_BYTES).map_err(|_| ())?;
        *first = Some(failure);
        drop(first);
        state.reply_fault_bytes += bytes.len();
        state.reply_fault_peak = state.reply_fault_peak.max(state.reply_fault_bytes);
        state.streams.entry(sid).or_default().push_back(Packet {
            bytes,
            output: false,
            result: false,
            receipt: None,
            reply_fault: Some(slot),
            broker: None,
        });
        self.inner.changed.notify_all();
        Ok(())
    }
    /// Final ingress+writer fence, with a separate one-frame reserve per active SID.
    pub fn reply_settled(&self, sid: u32) -> Result<(), ()> {
        let mut state = self.inner.state.lock().unwrap();
        let slot = state
            .reply_slots
            .get(&sid)
            .and_then(Weak::upgrade)
            .ok_or(())?;
        if state.closed {
            return Err(());
        }
        if slot.settled.load(std::sync::atomic::Ordering::SeqCst) {
            return Ok(());
        }
        let bytes = encode_json(
            &serde_json::json!({"type":"reply-settled","sid":sid}),
            REPLY_FAULT_BYTES,
        )
        .map_err(|_| ())?;
        slot.settled
            .store(true, std::sync::atomic::Ordering::SeqCst);
        state.reply_fault_bytes += bytes.len();
        state.reply_fault_peak = state.reply_fault_peak.max(state.reply_fault_bytes);
        state.streams.entry(sid).or_default().push_back(Packet {
            bytes,
            output: false,
            result: false,
            receipt: None,
            reply_fault: Some(slot),
            broker: None,
        });
        self.inner.changed.notify_all();
        Ok(())
    }
    pub fn finish_input(&self, sid: u32, op: u32) {
        let mut s = self.inner.state.lock().unwrap();
        if let Some(slot) = s.receipts.get_mut(&(sid, op)) {
            slot.finalized = true;
            if slot.pending == 0 {
                s.receipts.remove(&(sid, op));
            }
        }
    }
    /// Never waits, including monitors, input receipts, stop, errors and worker completion.
    pub fn send(&self, bytes: Vec<u8>) -> Result<(), ()> {
        #[cfg(test)]
        if let Some(tx) = &self.fixture {
            return tx.send(bytes).map_err(|_| ());
        }
        if bytes.len() < 5 || bytes.len() > CONTROL_BYTES {
            return Err(());
        }
        let message: Value = serde_json::from_slice(&bytes[5..]).map_err(|_| ())?;
        let sid = message["sid"].as_u64().unwrap_or(0) as u32;
        // A terminal output boundary and numeric exit must follow this SID's already accepted raw frames.
        let fence = message["type"] == "spawn-failed"
            || message["type"] == "exit"
            || message["type"] == "terminal-termination"
                && message["evidence"]["output"]
                    .as_str()
                    .is_some_and(|v| v != "unknown");
        let mut state = self.inner.state.lock().unwrap();
        if state.closed {
            return Err(());
        }
        let op = message["op"].as_u64().unwrap_or(0) as u32;
        let receipt = if matches!(
            message["type"].as_str(),
            Some("input-state" | "resize-state")
        ) && state.receipts.contains_key(&(sid, op))
        {
            let name = message["state"].as_str().ok_or(())?.to_string();
            if state.receipts[&(sid, op)].states.contains(&name) {
                return Ok(());
            }
            // Four small native-owned stages per reserved slot, each <=256B. Diagnostic floods cannot consume this reserve.
            if bytes.len() > 256 || state.receipt_bytes + bytes.len() > 128 * 1024 {
                return Err(());
            }
            let slot = state.receipts.get_mut(&(sid, op)).unwrap();
            slot.pending += 1;
            slot.states.insert(name.clone());
            state.receipt_bytes += bytes.len();
            Some((sid, op, name))
        } else {
            if state.stats.control + bytes.len() > CONTROL_BYTES || state.controls >= CONTROL_FRAMES
            {
                return Err(());
            }
            state.stats.control += bytes.len();
            state.controls += 1;
            None
        };
        state.stats.control_peak = state
            .stats
            .control_peak
            .max(state.stats.control + state.receipt_bytes);
        let packet = Packet {
            bytes,
            output: false,
            result: false,
            receipt,
            reply_fault: None,
            broker: None,
        };
        // Every operation stage shares its SID's causal stream, including stages
        // already accepted before numeric exit. Receipt reservation is unchanged.
        if fence
            || matches!(
                message["type"].as_str(),
                Some("input-state" | "resize-state")
            )
        {
            state.streams.entry(sid).or_default().push_back(packet);
        } else {
            state.high.push_back(packet);
        }
        self.inner.changed.notify_all();
        Ok(())
    }
    /// The read buffer is already separately reserved per active SID. Reserve its encoded copy before constructing it.
    pub fn output(
        &self,
        sid: u32,
        bytes: &[u8],
        cancelled: impl Fn() -> bool,
        gate: &Mutex<()>,
    ) -> Result<(), ()> {
        #[cfg(test)]
        if let Some(tx) = &self.fixture {
            return tx
                .send(frame::encode_session(frame::OUTPUT, sid, bytes))
                .map_err(|_| ());
        }
        if bytes.len() > 64 * 1024 {
            return Err(());
        }
        let charge = bytes.len() + 9;
        loop {
            let mut state = self.inner.state.lock().unwrap();
            while !state.closed
                && (state.stats.output + charge > OUTPUT_BYTES || state.outputs >= OUTPUT_FRAMES)
            {
                let (next, _) = self
                    .inner
                    .changed
                    .wait_timeout(state, Duration::from_millis(50))
                    .unwrap();
                state = next;
                if cancelled() {
                    return Err(());
                }
            }
            if state.closed || cancelled() {
                return Err(());
            }
            drop(state);
            // Lock order is always per-SID output gate -> shared queue. Never wait for space with the gate held.
            let _gate = gate.lock().unwrap();
            let mut state = self.inner.state.lock().unwrap();
            if state.closed || cancelled() {
                return Err(());
            }
            if state.stats.output + charge > OUTPUT_BYTES || state.outputs >= OUTPUT_FRAMES {
                continue;
            }
            state.outputs += 1;
            state.stats.output_frames_peak = state.stats.output_frames_peak.max(state.outputs);
            state.stats.output += charge;
            state.stats.output_peak = state.stats.output_peak.max(state.stats.output);
            state.streams.entry(sid).or_default().push_back(Packet {
                bytes: frame::encode_session(frame::OUTPUT, sid, bytes),
                output: true,
                result: false,
                receipt: None,
                reply_fault: None,
                broker: None,
            });
            self.inner.changed.notify_all();
            return Ok(());
        }
    }

    pub fn reserve_result(&self) -> Option<ResultPermit> {
        let mut s = self.inner.state.lock().unwrap();
        if s.closed || s.stats.workers >= RESULT_WORKERS {
            return None;
        }
        s.stats.workers += 1;
        s.stats.workers_peak = s.stats.workers_peak.max(s.stats.workers);
        Some(ResultPermit {
            out: self.clone(),
            transferred: false,
        })
    }
    fn take(&self) -> Option<Packet> {
        let mut state = self.inner.state.lock().unwrap();
        loop {
            if state.closed {
                return None;
            }
            // A fixed finite wheel advances even when a class is empty. No class can reset another's turn.
            const WHEEL: [u8; 11] = [0, 0, 0, 0, 1, 1, 1, 1, 2, 3, 3];
            let mut packet = None;
            for _ in 0..WHEEL.len() {
                let class = WHEEL[state.burst as usize];
                state.burst = (state.burst + 1) % WHEEL.len() as u8;
                packet = match class {
                    0 => state.high.pop_front(),
                    2 => state.bulk.pop_front(),
                    3 => {
                        use std::ops::Bound::{Excluded, Unbounded};
                        let id = state
                            .broker
                            .range((Excluded(state.broker_cursor.clone()), Unbounded))
                            .next()
                            .map(|(id, _)| id.clone())
                            .or_else(|| state.broker.keys().next().cloned());
                        id.and_then(|id| {
                            let queue = state.broker.get_mut(&id).unwrap();
                            let p = queue.pop_front();
                            if queue.is_empty() {
                                state.broker.remove(&id);
                            }
                            state.broker_cursor = id;
                            p
                        })
                    }
                    _ => {
                        use std::ops::Bound::{Excluded, Unbounded};
                        let sid = state
                            .streams
                            .range((Excluded(state.cursor), Unbounded))
                            .next()
                            .map(|(sid, _)| *sid)
                            .or_else(|| state.streams.keys().next().copied());
                        sid.and_then(|sid| {
                            let queue = state.streams.get_mut(&sid).unwrap();
                            let p = queue.pop_front();
                            if queue.is_empty() {
                                state.streams.remove(&sid);
                            }
                            state.cursor = sid;
                            p
                        })
                    }
                };
                if packet.is_some() {
                    break;
                }
            }
            if packet.is_some() {
                return packet;
            }
            if state.finishing {
                return None;
            }
            state = self.inner.changed.wait(state).unwrap();
        }
    }
    fn completed(&self, packet: &Packet) {
        let mut s = self.inner.state.lock().unwrap();
        if let Some(charge) = &packet.broker {
            s.broker_slots[charge.class.index()] -= 1;
            if let Some(delivery) = &charge.delivery {
                delivery.finish();
            }
            if let Some(done) = &charge.completed {
                done.store(true, std::sync::atomic::Ordering::Release);
            }
        } else if packet.output {
            s.stats.output -= packet.bytes.len();
            s.outputs -= 1;
        } else if packet.result {
            s.stats.workers -= 1;
        } else if packet.reply_fault.is_some() {
            s.reply_fault_bytes -= packet.bytes.len();
        } else if let Some((sid, op, name)) = &packet.receipt {
            s.receipt_bytes -= packet.bytes.len();
            if let Some(slot) = s.receipts.get_mut(&(*sid, *op)) {
                slot.pending -= 1;
                slot.states.remove(name);
                if slot.finalized && slot.pending == 0 {
                    s.receipts.remove(&(*sid, *op));
                }
            }
        } else {
            s.stats.control -= packet.bytes.len();
            s.controls -= 1;
        }
        self.inner.changed.notify_all();
    }
    pub fn run(&self, mut writer: impl Write) {
        while let Some(packet) = self.take() {
            if packet
                .broker
                .as_ref()
                .and_then(|p| p.delivery.as_ref())
                .is_some_and(|p| !p.claim())
            {
                self.completed(&packet);
                continue;
            }
            let result = writer.write_all(&packet.bytes).and_then(|_| writer.flush());
            self.completed(&packet);
            if result.is_err() {
                break;
            }
        }
        self.close();
    }
    pub fn finish(&self) {
        self.inner.state.lock().unwrap().finishing = true;
        self.inner.changed.notify_all();
    }
    pub fn close(&self) {
        self.inner.state.lock().unwrap().closed = true;
        self.inner.changed.notify_all();
    }
}
pub struct BrokerPermit {
    out: Outbox,
    class: BrokerClass,
    transferred: bool,
}
impl BrokerPermit {
    /// The independent editor reserve joins the original SID stream, including its output/exit fence.
    pub fn send_editor(
        mut self,
        sid: u32,
        mut body: Vec<u8>,
        completed: Arc<std::sync::atomic::AtomicBool>,
    ) -> Result<(), ()> {
        if body.len() + 5 > self.class.frame_limit() {
            return Err(());
        }
        let mut s = self.out.inner.state.lock().unwrap();
        if s.closed {
            return Err(());
        }
        let n = body.len();
        body.resize(n + 5, 0);
        body.copy_within(..n, 5);
        body[..4].copy_from_slice(&((n + 1) as u32).to_be_bytes());
        body[4] = frame::CONTROL;
        s.streams.entry(sid).or_default().push_back(Packet {
            bytes: body,
            output: false,
            result: false,
            receipt: None,
            reply_fault: None,
            broker: Some(BrokerCharge {
                class: self.class,
                delivery: None,
                completed: Some(completed),
            }),
        });
        self.transferred = true;
        self.out.inner.changed.notify_all();
        Ok(())
    }
    pub fn send(
        self,
        id: &str,
        body: Vec<u8>,
        completed: Option<Arc<std::sync::atomic::AtomicBool>>,
    ) -> Result<(), ()> {
        self.send_cancellable(id, body, completed, None)
    }
    pub fn send_cancellable(
        self,
        id: &str,
        body: Vec<u8>,
        completed: Option<Arc<std::sync::atomic::AtomicBool>>,
        delivery: Option<Arc<BrokerDelivery>>,
    ) -> Result<(), ()> {
        self.send_inner(id, body, completed, delivery, || {})
    }
    /// Commits terminal ownership before this queued packet can become visible to the writer. No IO in commit.
    pub fn send_committed(self, id: &str, body: Vec<u8>, commit: impl FnOnce()) -> Result<(), ()> {
        self.send_inner(id, body, None, None, commit)
    }
    fn send_inner(
        mut self,
        id: &str,
        mut body: Vec<u8>,
        completed: Option<Arc<std::sync::atomic::AtomicBool>>,
        delivery: Option<Arc<BrokerDelivery>>,
        commit: impl FnOnce(),
    ) -> Result<(), ()> {
        if id.len() > 128 || body.len() + 5 > self.class.frame_limit() {
            return Err(());
        }
        let mut s = self.out.inner.state.lock().unwrap();
        if s.closed {
            return Err(());
        }
        let length = body.len();
        body.resize(length + 5, 0);
        body.copy_within(..length, 5);
        body[..4].copy_from_slice(&((length + 1) as u32).to_be_bytes());
        body[4] = frame::CONTROL;
        let bytes = body;
        s.broker
            .entry(id.to_owned())
            .or_default()
            .push_back(Packet {
                bytes,
                output: false,
                result: false,
                receipt: None,
                reply_fault: None,
                broker: Some(BrokerCharge {
                    class: self.class,
                    delivery,
                    completed,
                }),
            });
        self.transferred = true;
        commit();
        self.out.inner.changed.notify_all();
        Ok(())
    }
}
impl Drop for BrokerPermit {
    fn drop(&mut self) {
        if !self.transferred {
            let mut s = self.out.inner.state.lock().unwrap();
            s.broker_slots[self.class.index()] -= 1;
            self.out.inner.changed.notify_all();
        }
    }
}
pub struct ResultPermit {
    out: Outbox,
    transferred: bool,
}
impl ResultPermit {
    pub fn send(mut self, message: &Value) -> Result<(), String> {
        let bytes = encode_json(message, RESULT_BYTES)?;
        #[cfg(test)]
        if let Some(tx) = &self.out.fixture {
            return tx.send(bytes).map_err(|_| "output closed".into());
        }
        let mut s = self.out.inner.state.lock().unwrap();
        if s.closed {
            return Err("output closed".into());
        }
        s.bulk.push_back(Packet {
            bytes,
            output: false,
            result: true,
            receipt: None,
            reply_fault: None,
            broker: None,
        });
        self.transferred = true;
        self.out.inner.changed.notify_all();
        Ok(())
    }
}
impl Drop for ResultPermit {
    fn drop(&mut self) {
        if !self.transferred {
            let mut s = self.out.inner.state.lock().unwrap();
            s.stats.workers -= 1;
            self.out.inner.changed.notify_all();
        }
    }
}
/// Serialize directly into one finite owned frame; never Value → String → second full Vec.
pub fn encode_json(value: &Value, limit: usize) -> Result<Vec<u8>, String> {
    struct Limited {
        bytes: Vec<u8>,
        limit: usize,
    }
    impl Write for Limited {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            if self.bytes.len() + bytes.len() > self.limit {
                return Err(io::Error::other("native result capacity exceeded"));
            }
            self.bytes.extend_from_slice(bytes);
            Ok(bytes.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }
    struct Count {
        bytes: usize,
        limit: usize,
    }
    impl Write for Count {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            self.bytes = self
                .bytes
                .checked_add(bytes.len())
                .ok_or_else(|| io::Error::other("native result capacity exceeded"))?;
            if self.bytes > self.limit {
                return Err(io::Error::other("native result capacity exceeded"));
            }
            Ok(bytes.len())
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }
    let mut count = Count { bytes: 5, limit };
    serde_json::to_writer(&mut count, value).map_err(|e| e.to_string())?;
    let mut out = Limited {
        bytes: Vec::with_capacity(count.bytes),
        limit,
    };
    out.bytes.extend_from_slice(&[0, 0, 0, 0, frame::CONTROL]);
    serde_json::to_writer(&mut out, value).map_err(|e| e.to_string())?;
    let length = (out.bytes.len() - 4) as u32;
    out.bytes[..4].copy_from_slice(&length.to_be_bytes());
    Ok(out.bytes)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reply_fault_reserve_survives_control_flood_and_returns_only_after_physical_write() {
        use std::{sync::mpsc, thread, time::Instant};
        let out = Outbox::new();
        let slots: Vec<_> = (1..=32)
            .map(|sid| out.reserve_reply(sid).unwrap())
            .collect();
        assert!(out.reserve_reply(33).is_none());
        for _ in 0..CONTROL_FRAMES {
            out.send(encode_json(&serde_json::json!({"type":"error"}), 256).unwrap())
                .unwrap();
        }
        assert!(out
            .send(encode_json(&serde_json::json!({"type":"error"}), 256).unwrap())
            .is_err());
        for sid in 1..=32 {
            for _ in 0..1000 {
                out.reply_failure(sid, ReplyFailure::Capacity).unwrap();
            }
            out.reply_settled(sid).unwrap();
            out.reply_settled(sid).unwrap();
            assert!(out.reply_failure(sid, ReplyFailure::Closed).is_err());
        }
        for sid in 100..1100 {
            assert!(out.reply_failure(sid, ReplyFailure::Closed).is_err());
        }
        {
            let state = out.inner.state.lock().unwrap();
            assert_eq!(state.reply_slots.len(), 32);
            assert_eq!(state.streams.values().map(|v| v.len()).sum::<usize>(), 64);
            assert!(state.reply_fault_bytes <= 32 * 512);
        }
        struct Hold {
            entered: mpsc::SyncSender<()>,
            resume: mpsc::Receiver<()>,
            written: mpsc::Sender<()>,
            first: bool,
        }
        impl Write for Hold {
            fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
                if self.first {
                    self.first = false;
                    self.entered.send(()).unwrap();
                    self.resume.recv_timeout(Duration::from_secs(3)).unwrap();
                }
                self.written.send(()).unwrap();
                Ok(bytes.len())
            }
            fn flush(&mut self) -> io::Result<()> {
                Ok(())
            }
        }
        let (entered, at) = mpsc::sync_channel(1);
        let (resume, wait) = mpsc::sync_channel(1);
        let (written, done) = mpsc::channel();
        let copy = out.clone();
        let worker = thread::spawn(move || {
            copy.run(Hold {
                entered,
                resume: wait,
                written,
                first: true,
            })
        });
        at.recv_timeout(Duration::from_secs(3)).unwrap();
        drop(slots);
        assert!(
            out.reserve_reply(33).is_none(),
            "queued/inflight fault packets still own every slot"
        );
        assert!(out.inner.state.lock().unwrap().reply_fault_bytes > 0);
        resume.send(()).unwrap();
        for _ in 0..CONTROL_FRAMES + 64 {
            done.recv_timeout(Duration::from_secs(3)).unwrap();
        }
        let deadline = Instant::now() + Duration::from_secs(1);
        let recovered = loop {
            if let Some(slot) = out.reserve_reply(33) {
                break Some(slot);
            }
            if Instant::now() >= deadline {
                break None;
            }
            thread::yield_now();
        };
        out.close();
        worker.join().unwrap();
        assert!(recovered.is_some());
        let state = out.inner.state.lock().unwrap();
        assert_eq!(state.reply_fault_bytes, 0);
        assert_eq!(state.stats.control, 0);
    }
    #[test]
    fn all_operation_stages_precede_sid_exit_at_every_production_wheel_phase() {
        use std::{sync::mpsc, thread};
        struct Barrier {
            frames: mpsc::SyncSender<Vec<u8>>,
            permits: mpsc::Receiver<()>,
        }
        impl Write for Barrier {
            fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
                self.frames.send(bytes.to_vec()).unwrap();
                self.permits.recv_timeout(Duration::from_secs(3)).unwrap();
                Ok(bytes.len())
            }
            fn flush(&mut self) -> io::Result<()> {
                Ok(())
            }
        }
        for phase in 0..9 {
            let out = Outbox::new();
            for index in 0..8 {
                out.send(
                    encode_json(&serde_json::json!({"type":"error","message":index}), 256).unwrap(),
                )
                .unwrap();
                out.output(90, b"prime", || false, &Mutex::new(())).unwrap();
            }
            for _ in 0..2 {
                out.reserve_result()
                    .unwrap()
                    .send(&serde_json::json!({"type":"history-result","data":[]}))
                    .unwrap();
            }
            let (tx, rx) = mpsc::sync_channel(1);
            let (permit, wait) = mpsc::sync_channel(1);
            let producer = out.clone();
            let worker = thread::spawn(move || {
                producer.run(Barrier {
                    frames: tx,
                    permits: wait,
                })
            });
            let count = if phase == 0 { 9 } else { phase };
            let mut frames = Vec::new();
            for index in 0..count {
                frames.push(rx.recv_timeout(Duration::from_secs(3)).unwrap());
                if index + 1 < count {
                    permit.send(()).unwrap();
                }
            }
            // Keep finite sibling control backlog ahead of unreserved results so
            // every wheel phase must rely on SID ordering rather than queue luck.
            for index in 0..64 {
                out.send(
                    encode_json(&serde_json::json!({"type":"error","message":index}), 256).unwrap(),
                )
                .unwrap();
            }
            for (sid, op, kind, states) in [
                (
                    1,
                    1,
                    "input-state",
                    vec!["reserved", "queued", "started", "written"],
                ),
                (1, 2, "input-state", vec!["reserved", "queued", "none"]),
                (
                    1,
                    3,
                    "input-state",
                    vec!["reserved", "queued", "started", "unknown"],
                ),
                (u32::MAX, 1, "resize-state", vec!["queued", "applied"]),
                (u32::MAX, 2, "resize-state", vec!["queued", "superseded"]),
            ] {
                assert!(out.reserve_input(sid, op));
                for state in states {
                    let mut value =
                        serde_json::json!({"type":kind,"sid":sid,"op":op,"state":state});
                    if state == "none" {
                        value["reason"] = "closed".into();
                    }
                    if state == "unknown" {
                        value["reason"] = "write-failed".into();
                    }
                    out.send(encode_json(&value, 256).unwrap()).unwrap();
                }
                out.finish_input(sid, op);
            }
            // These known rejections have no receipt reservation. They still entered
            // before exit, so ordinary-control accounting must not change their order.
            for (sid, op, kind, reason) in [
                (1, 4, "input-state", "closed"),
                (1, 5, "input-state", "capacity"),
                (u32::MAX, 3, "resize-state", "closed"),
                (u32::MAX, 4, "resize-state", "capacity"),
            ] {
                assert!(!out
                    .inner
                    .state
                    .lock()
                    .unwrap()
                    .receipts
                    .contains_key(&(sid, op)));
                out.send(encode_json(&serde_json::json!({"type":kind,"sid":sid,"op":op,"state":"none","reason":reason}),256).unwrap()).unwrap();
            }
            for sid in [1, u32::MAX] {
                out.output(sid, b"raw", || false, &Mutex::new(())).unwrap();
                out.send(encode_json(&serde_json::json!({"type":"terminal-termination","sid":sid,"evidence":{"output":"drained"}}),256).unwrap()).unwrap();
                out.send(encode_json(&serde_json::json!({"type":"exit","sid":sid}), 256).unwrap())
                    .unwrap();
            }
            out.finish();
            permit.send(()).unwrap();
            while let Ok(bytes) = rx.recv_timeout(Duration::from_secs(3)) {
                frames.push(bytes);
                permit.send(()).unwrap();
            }
            worker.join().unwrap();
            let values: Vec<Value> = frames
                .iter()
                .filter(|bytes| bytes[4] == frame::CONTROL)
                .map(|bytes| serde_json::from_slice(&bytes[5..]).unwrap())
                .collect();
            for sid in [1, u32::MAX] {
                let exit = values
                    .iter()
                    .position(|v| v["type"] == "exit" && v["sid"] == sid)
                    .unwrap();
                for (index, value) in values.iter().enumerate().filter(|(_, v)| {
                    v["sid"] == sid && (v["type"] == "input-state" || v["type"] == "resize-state")
                }) {
                    assert!(
                        index < exit,
                        "phase {phase}, SID {sid}, result {value} overtaken by exit"
                    );
                }
            }
            for (sid, op, expected) in [
                (1, 1, vec!["reserved", "queued", "started", "written"]),
                (1, 2, vec!["reserved", "queued", "none"]),
                (1, 3, vec!["reserved", "queued", "started", "unknown"]),
                (u32::MAX, 1, vec!["queued", "applied"]),
                (u32::MAX, 2, vec!["queued", "superseded"]),
                (1, 4, vec!["none"]),
                (1, 5, vec!["none"]),
                (u32::MAX, 3, vec!["none"]),
                (u32::MAX, 4, vec!["none"]),
            ] {
                let states: Vec<&str> = values
                    .iter()
                    .filter(|v| v["sid"] == sid && v["op"] == op)
                    .map(|v| v["state"].as_str().unwrap())
                    .collect();
                assert_eq!(states, expected, "phase {phase}");
            }
            let state = out.inner.state.lock().unwrap();
            assert_eq!(state.stats.output, 0);
            assert_eq!(state.stats.control, 0);
            assert_eq!(state.receipt_bytes, 0);
            assert!(state.receipts.is_empty());
        }
    }
    #[test]
    fn unreserved_result_flood_uses_ordinary_control_capacity_not_receipt_reservations() {
        let out = Outbox::new();
        for sid in 1..=CONTROL_FRAMES as u32 {
            out.send(encode_json(&serde_json::json!({"type":"input-state","sid":sid,"op":1,"state":"none","reason":"closed"}),256).unwrap()).unwrap();
        }
        assert!(out.send(encode_json(&serde_json::json!({"type":"resize-state","sid":u32::MAX,"op":1,"state":"none","reason":"capacity"}),256).unwrap()).is_err());
        {
            let state = out.inner.state.lock().unwrap();
            assert!(state.receipts.is_empty());
            assert_eq!(state.receipt_bytes, 0);
            assert_eq!(state.streams.len(), CONTROL_FRAMES);
            assert_eq!(state.controls, CONTROL_FRAMES);
        }
        out.finish();
        let mut written = Vec::new();
        out.run(&mut written);
        let state = out.inner.state.lock().unwrap();
        assert_eq!(state.stats.control, 0);
        assert_eq!(state.controls, 0);
        assert!(state.streams.is_empty());
    }
    #[test]
    fn bounded_output_keeps_control_fair_and_exit_after_raw() {
        let out = Outbox::new();
        for _ in 0..63 {
            out.output(1, &[b'a'; 65536], || false, &Mutex::new(()))
                .unwrap();
        }
        let root = serde_json::json!({"type":"terminal-termination","sid":1,"evidence":{"output":"unknown"}});
        out.send(encode_json(&root, 1024).unwrap()).unwrap();
        out.send(encode_json(&serde_json::json!({"type":"exit","sid":1}), 1024).unwrap())
            .unwrap();
        let first = out.take().unwrap();
        assert!(!first.output);
        out.completed(&first);
        let second = out.take().unwrap();
        assert!(second.output);
        out.completed(&second);
        assert!(out.stats().output_peak <= OUTPUT_BYTES);
        assert_eq!(out.stats().output_peak, 63 * (65536 + 9));
        let mut count = 1;
        loop {
            let item = out.take().unwrap();
            let is_output = item.output;
            out.completed(&item);
            if !is_output {
                break;
            }
            count += 1;
        }
        assert_eq!(count, 63);
        assert_eq!(out.stats().output, 0);
    }
    #[test]
    fn every_outbox_class_progresses_with_or_without_bulk() {
        for bulk in [false, true] {
            let out = Outbox::new();
            for n in 0..32 {
                out.send(
                    encode_json(&serde_json::json!({"type":"error","message":n}), 256).unwrap(),
                )
                .unwrap();
                out.output(1, b"x", || false, &Mutex::new(())).unwrap();
            }
            if bulk {
                for _ in 0..2 {
                    out.reserve_result()
                        .unwrap()
                        .send(&serde_json::json!({"type":"history-result","data":"bulk"}))
                        .unwrap();
                }
            }
            let mut counts = [0usize; 3];
            for _ in 0..18 {
                let p = out.take().unwrap();
                counts[if p.output {
                    1
                } else if p.result {
                    2
                } else {
                    0
                }] += 1;
                out.completed(&p);
            }
            assert!(
                counts[0] >= 4 && counts[1] >= 4 && (bulk || counts[0] > 8),
                "classes must progress: {counts:?}"
            );
            if bulk {
                assert!(counts[2] > 0);
            }
        }
    }
    #[test]
    fn maximum_sid_cannot_starve_a_lower_sid() {
        let out = Outbox::new();
        for _ in 0..4 {
            out.output(1, b"a", || false, &Mutex::new(())).unwrap();
            out.output(u32::MAX, b"b", || false, &Mutex::new(()))
                .unwrap();
        }
        let mut ids = Vec::new();
        for _ in 0..4 {
            let p = out.take().unwrap();
            ids.push(u32::from_be_bytes(p.bytes[5..9].try_into().unwrap()));
            out.completed(&p);
        }
        assert_eq!(ids, vec![1, u32::MAX, 1, u32::MAX]);
    }
    #[test]
    fn results_reserve_workers_and_full_buffer_before_work() {
        let out = Outbox::new();
        let a = out.reserve_result().unwrap();
        let b = out.reserve_result().unwrap();
        assert!(out.reserve_result().is_none());
        drop(a);
        assert!(out.reserve_result().is_some());
        drop(b);
        assert!(encode_json(&serde_json::json!({"text":"x".repeat(1000)}), 100).is_err());
        assert_eq!(out.stats().workers, 0);
    }
}
