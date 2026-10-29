//! Windows ConPTY owned by this helper.
//!
//! The helper that called CreatePseudoConsole also creates the payload. Duplicating
//! the pseudoconsole handle fails with ERROR_INVALID_HANDLE, and creating a console
//! program from a process already attached to that console deadlocks inside
//! CreateProcess. The payload therefore gets PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE
//! from this process, which is not itself a console client.
use portable_pty::{MasterPty, PtySize};
use std::{
    fs::File,
    io,
    mem,
    os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle},
    ptr,
    sync::{Arc, Mutex},
};
use windows_sys::Win32::{
    Foundation::{HANDLE, S_OK},
    Security::SECURITY_ATTRIBUTES,
    System::{
        Console::{
            ClosePseudoConsole, CreatePseudoConsole, ResizePseudoConsole, COORD, HPCON,
            PSEUDOCONSOLE_INHERIT_CURSOR,
        },
        Pipes::CreatePipe,
    },
};

/// Documented ConPTY flags alongside PSEUDOCONSOLE_INHERIT_CURSOR.
const PSEUDOCONSOLE_RESIZE_QUIRK: u32 = 0x2;
const PSEUDOCONSOLE_WIN32_INPUT_MODE: u32 = 0x4;

struct ConsoleState {
    hpcon: Mutex<HPCON>,
}
impl Drop for ConsoleState {
    fn drop(&mut self) {
        let hpcon = self.hpcon.get_mut().unwrap_or_else(|error| error.into_inner());
        if *hpcon != 0 {
            unsafe { ClosePseudoConsole(*hpcon) };
            *hpcon = 0;
        }
    }
}

/// Shared ConPTY. Closing the last clone closes the console.
#[derive(Clone)]
pub struct Console {
    state: Arc<ConsoleState>,
}
impl Console {
    fn from_hpcon(hpcon: HPCON) -> Self {
        Self {
            state: Arc::new(ConsoleState {
                hpcon: Mutex::new(hpcon),
            }),
        }
    }
    pub fn raw(&self) -> io::Result<HPCON> {
        let hpcon = *self.state.hpcon.lock().unwrap();
        if hpcon == 0 {
            Err(io::Error::other("Pseudoconsole is closed"))
        } else {
            Ok(hpcon)
        }
    }
    pub fn resize(&self, cols: u16, rows: u16) -> io::Result<()> {
        let hpcon = *self.state.hpcon.lock().unwrap();
        if hpcon == 0 {
            return Err(io::Error::other("Pseudoconsole is closed"));
        }
        let code = unsafe {
            ResizePseudoConsole(
                hpcon,
                COORD {
                    X: cols.max(1) as i16,
                    Y: rows.max(1) as i16,
                },
            )
        };
        if code == S_OK {
            Ok(())
        } else {
            Err(io::Error::from_raw_os_error(code))
        }
    }
}

pub struct Opened {
    pub master: Box<dyn MasterPty + Send>,
    pub console: Console,
}

struct PipeEnds {
    read: OwnedHandle,
    write: OwnedHandle,
}
fn anon_pipe() -> io::Result<PipeEnds> {
    let mut attributes: SECURITY_ATTRIBUTES = unsafe { mem::zeroed() };
    attributes.nLength = mem::size_of::<SECURITY_ATTRIBUTES>() as u32;
    attributes.bInheritHandle = 0;
    let mut read = ptr::null_mut();
    let mut write = ptr::null_mut();
    if unsafe { CreatePipe(&mut read, &mut write, &attributes, 0) } == 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(PipeEnds {
        read: unsafe { OwnedHandle::from_raw_handle(read as _) },
        write: unsafe { OwnedHandle::from_raw_handle(write as _) },
    })
}

pub fn open(cols: u16, rows: u16) -> io::Result<Opened> {
    let cols = cols.max(1);
    let rows = rows.max(1);
    let input = anon_pipe()?;
    let output = anon_pipe()?;
    let mut hpcon: HPCON = 0;
    let created = unsafe {
        CreatePseudoConsole(
            COORD {
                X: cols as i16,
                Y: rows as i16,
            },
            input.read.as_raw_handle() as HANDLE,
            output.write.as_raw_handle() as HANDLE,
            PSEUDOCONSOLE_INHERIT_CURSOR | PSEUDOCONSOLE_RESIZE_QUIRK | PSEUDOCONSOLE_WIN32_INPUT_MODE,
            &mut hpcon,
        )
    };
    drop(input.read);
    drop(output.write);
    if created != S_OK {
        if hpcon != 0 {
            unsafe { ClosePseudoConsole(hpcon) };
        }
        return Err(io::Error::from_raw_os_error(created));
    }
    let console = Console::from_hpcon(hpcon);
    let master = WinMaster {
        console: console.clone(),
        reader: File::from(output.read),
        writer: Mutex::new(Some(File::from(input.write))),
        size: Mutex::new(PtySize {
            cols,
            rows,
            pixel_width: 0,
            pixel_height: 0,
        }),
    };
    Ok(Opened {
        master: Box::new(master),
        console,
    })
}

struct WinMaster {
    console: Console,
    reader: File,
    writer: Mutex<Option<File>>,
    size: Mutex<PtySize>,
}
impl MasterPty for WinMaster {
    fn resize(&self, size: PtySize) -> Result<(), anyhow::Error> {
        self.console.resize(size.cols, size.rows)?;
        *self.size.lock().unwrap() = size;
        Ok(())
    }
    fn get_size(&self) -> Result<PtySize, anyhow::Error> {
        Ok(*self.size.lock().unwrap())
    }
    fn try_clone_reader(&self) -> Result<Box<dyn std::io::Read + Send>, anyhow::Error> {
        Ok(Box::new(self.reader.try_clone()?))
    }
    fn take_writer(&self) -> Result<Box<dyn std::io::Write + Send>, anyhow::Error> {
        self.writer
            .lock()
            .unwrap()
            .take()
            .map(|file| Box::new(file) as Box<dyn std::io::Write + Send>)
            .ok_or_else(|| io::Error::other("writer already taken").into())
    }
}
