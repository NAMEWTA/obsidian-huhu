//! One incremental bounded reader per connection; nonblocking IO never holds the broker map.
#[cfg(unix)]
pub use super::unix as platform;
#[cfg(windows)]
pub use super::windows as platform;
pub use platform::Stream;
use std::{
    io::{self, Read, Write},
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::{Duration, Instant},
};
pub struct Reader {
    head: [u8; 4],
    used: usize,
    body: Vec<u8>,
    filled: usize,
    limit: usize,
}
impl Reader {
    pub fn new(limit: usize) -> Self {
        Self {
            head: [0; 4],
            used: 0,
            body: Vec::new(),
            filled: 0,
            limit,
        }
    }
    pub fn poll(&mut self, stream: &mut impl Read) -> io::Result<Option<Vec<u8>>> {
        if self.used < 4 {
            match stream.read(&mut self.head[self.used..]) {
                Ok(0) => return Err(io::ErrorKind::UnexpectedEof.into()),
                Ok(n) => self.used += n,
                Err(e)
                    if e.kind() == io::ErrorKind::WouldBlock
                        || e.kind() == io::ErrorKind::Interrupted =>
                {
                    return Ok(None)
                }
                Err(e) => return Err(e),
            }
            if self.used < 4 {
                return Ok(None);
            }
            let len = u32::from_be_bytes(self.head) as usize;
            if len == 0 || len > self.limit {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "control frame capacity",
                ));
            }
            self.body.resize(len, 0);
        }
        match stream.read(&mut self.body[self.filled..]) {
            Ok(0) => return Err(io::ErrorKind::UnexpectedEof.into()),
            Ok(n) => self.filled += n,
            Err(e)
                if e.kind() == io::ErrorKind::WouldBlock
                    || e.kind() == io::ErrorKind::Interrupted =>
            {
                return Ok(None)
            }
            Err(e) => return Err(e),
        }
        if self.filled == self.body.len() {
            Ok(Some(std::mem::take(&mut self.body)))
        } else {
            Ok(None)
        }
    }
}
pub fn frame(mut body: Vec<u8>, limit: usize) -> io::Result<Vec<u8>> {
    if body.is_empty() || body.len() > limit {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "control frame capacity",
        ));
    }
    let size = body.len();
    body.resize(size + 4, 0);
    body.copy_within(..size, 4);
    body[..4].copy_from_slice(&(size as u32).to_be_bytes());
    Ok(body)
}
pub fn write_until(
    stream: &mut impl Write,
    bytes: &[u8],
    deadline: Instant,
    cancel: &AtomicBool,
) -> io::Result<()> {
    let mut at = 0;
    while at < bytes.len() {
        if cancel.load(Ordering::Acquire) {
            return Err(io::ErrorKind::Interrupted.into());
        }
        if Instant::now() >= deadline {
            return Err(io::ErrorKind::TimedOut.into());
        }
        match stream.write(&bytes[at..]) {
            Ok(0) => return Err(io::ErrorKind::WriteZero.into()),
            Ok(n) => at += n,
            Err(e)
                if matches!(
                    e.kind(),
                    io::ErrorKind::WouldBlock | io::ErrorKind::Interrupted
                ) =>
            {
                thread::sleep(Duration::from_millis(2))
            }
            Err(e) => return Err(e),
        }
    }
    Ok(())
}
pub fn read_until(
    stream: &mut impl Read,
    limit: usize,
    deadline: Instant,
    cancel: &AtomicBool,
) -> io::Result<Vec<u8>> {
    let mut reader = Reader::new(limit);
    loop {
        if cancel.load(Ordering::Acquire) {
            return Err(io::ErrorKind::Interrupted.into());
        }
        if Instant::now() >= deadline {
            return Err(io::ErrorKind::TimedOut.into());
        }
        if let Some(body) = reader.poll(stream)? {
            return Ok(body);
        }
        thread::sleep(Duration::from_millis(2));
    }
}
