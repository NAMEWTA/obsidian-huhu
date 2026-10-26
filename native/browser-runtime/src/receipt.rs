use hmac::{Hmac, Mac};
use sha2::Sha256;
use serde_json::{json,Value};
use std::io;
fn decode(value:&str)->io::Result<Vec<u8>> {
    if value.len()!=64||!value.bytes().all(|b|b.is_ascii_hexdigit()){return Err(io::Error::other("owner_key_invalid"));}
    (0..value.len()).step_by(2).map(|index|u8::from_str_radix(&value[index..index+2],16).map_err(|_|io::Error::other("owner_key_invalid"))).collect()
}
pub fn seal(data:Value,key:&str)->io::Result<Value>{
    let mut mac=Hmac::<Sha256>::new_from_slice(&decode(key)?).map_err(|_|io::Error::other("owner_key_invalid"))?;
    mac.update(&serde_json::to_vec(&data)?);
    let signature=mac.finalize().into_bytes().iter().map(|v|format!("{v:02x}")).collect::<String>();
    Ok(json!({"data":data,"mac":signature}))
}
pub fn open(bytes:&[u8],key:&str)->io::Result<Value>{
    let envelope:Value=serde_json::from_slice(bytes)?;
    let data=&envelope["data"];
    let mut mac=Hmac::<Sha256>::new_from_slice(&decode(key)?).map_err(|_|io::Error::other("owner_key_invalid"))?;
    mac.update(&serde_json::to_vec(data)?);
    mac.verify_slice(&decode(envelope["mac"].as_str().unwrap_or(""))?).map_err(|_|io::Error::other("owner_authentication_failed"))?;
    if data["version"]!=2||data["ephemeral"].as_bool().is_none()||data["spaceId"].as_str().is_none(){return Err(io::Error::other("owner_invalid"));}
    Ok(data.clone())
}
#[cfg(test)] mod tests{use super::*;#[test]fn receipts_reject_tampering(){let key="ab".repeat(32);let data=json!({"version":2,"ephemeral":true,"spaceId":"space","pid":20});let mut value=seal(data.clone(),&key).unwrap();assert_eq!(open(&serde_json::to_vec(&value).unwrap(),&key).unwrap(),data);value["data"]["pid"]=json!(21);assert!(open(&serde_json::to_vec(&value).unwrap(),&key).is_err());}}
