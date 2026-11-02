use serde_json::Value;
use std::io::{self, Read, Write};
pub const MAX: usize = 16 * 1024 * 1024;
pub fn read(reader: &mut impl Read) -> io::Result<Option<Value>> {
    let mut header = [0u8; 4];
    match reader.read_exact(&mut header) {
        Ok(()) => (),
        Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }
    let size = u32::from_be_bytes(header) as usize;
    if size == 0 || size > MAX {
        return Err(io::Error::other("frame_limit"));
    }
    let mut body = vec![0; size];
    reader.read_exact(&mut body)?;
    serde_json::from_slice(&body)
        .map(Some)
        .map_err(io::Error::other)
}
pub fn write(writer: &mut impl Write, value: &Value) -> io::Result<()> {
    let data = serde_json::to_vec(value)?;
    if data.is_empty() || data.len() > MAX {
        return Err(io::Error::other("frame_limit"));
    }
    writer.write_all(&(data.len() as u32).to_be_bytes())?;
    writer.write_all(&data)?;
    writer.flush()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bounded_round_trip() {
        let mut b = Vec::new();
        let v = serde_json::json!({"a":"中文"});
        write(&mut b, &v).unwrap();
        assert_eq!(read(&mut b.as_slice()).unwrap(), Some(v));
    }
    #[test]
    fn oversized_rejected() {
        let b = ((MAX + 1) as u32).to_be_bytes();
        assert!(read(&mut b.as_slice()).is_err());
    }
}
