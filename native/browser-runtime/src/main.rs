mod cookies;
mod framing;
mod gate;
#[cfg(target_os="linux")] mod process;
use serde_json::{json,Value};
use std::io::{self,Read};

fn main(){
    let args:Vec<_>=std::env::args().collect();
    if args.iter().any(|v|v=="--read-cookies") {
        let mut input=String::new();let read=io::stdin().take(65537).read_to_string(&mut input);
        let result=if read.is_err()||input.len()>65536{Err("browser_reader_request_limit".into())}else{cookies::read_request(&input)};
        match result{Ok(v)=>println!("{v}"),Err(code)=>{println!("{}",json!({"error":code}));std::process::exit(1)}}
        return;
    }
    #[cfg(target_os="linux")]
    if args.iter().any(|v|v=="--reclaim") {
        let mut input=String::new();let result=(||->io::Result<bool>{io::stdin().take(8193).read_to_string(&mut input)?;if input.len()>8192{return Err(io::Error::other("limit"));}let v:Value=serde_json::from_str(&input)?;let p=v["profile"].as_str().ok_or_else(||io::Error::other("profile"))?;process::reclaim(std::path::Path::new(p),v["runtimeId"].as_str())})();
        println!("{}",json!({"reclaimed":result.unwrap_or(false)}));return;
    }
    #[cfg(target_os="linux")]
    if run().is_err(){std::process::exit(1)}
    #[cfg(not(target_os="linux"))]
    {let _=framing::write(&mut io::stdout(),&json!({"type":"fatal","code":"browser_platform_unsupported"}));std::process::exit(1)}
}

#[cfg(target_os="linux")]
fn run()->io::Result<()> {
    use std::sync::{Arc,Mutex,atomic::{AtomicBool,Ordering},mpsc};
    use std::net::{TcpListener,TcpStream};
    use std::time::{Duration,Instant};
    use std::fs::File;
    struct Writer {gate:gate::Gate,pipe:File}
    let mut stdin=io::stdin().lock();
    let stdout=Arc::new(Mutex::new(io::stdout()));
    let start=framing::read(&mut stdin)?.ok_or_else(||io::Error::other("start_missing"))?;
    let id=start["id"].clone();
    if start["type"]!="start"||start["protocol"]!=2 {return Err(io::Error::other("protocol"));}
    let text=|key:&str|->io::Result<String>{start[key].as_str().map(String::from).ok_or_else(||io::Error::other("start_invalid"))};
    let token=text("token")?;
    if token.len()!=64||!token.bytes().all(|v|v.is_ascii_hexdigit()){return Err(io::Error::other("token_invalid"));}
    let listener=TcpListener::bind(("127.0.0.1",0))?;
    listener.set_nonblocking(true)?;
    let port=listener.local_addr()?.port();
    let (browser,mut reader,pipe)=match process::Browser::spawn(std::path::Path::new(&text("executable")?),std::path::Path::new(&text("profile")?),&text("runtimeId")?){
        Ok(v)=>v,Err(_)=>{framing::write(&mut *stdout.lock().unwrap(),&json!({"id":id,"error":"browser_start_failed"}))?;return Err(io::Error::other("start_failed"));}
    };
    let browser=Arc::new(browser);
    let writer=Arc::new(Mutex::new(Writer{gate:gate::Gate::new(&text("provisioningLease")?),pipe}));
    let ending=Arc::new(AtomicBool::new(false));
    let control_pending=Arc::new(AtomicBool::new(false));
    let (send,receive)=mpsc::sync_channel::<Value>(128);
    let fatal:Arc<dyn Fn(&str)+Send+Sync>={
        let ending=ending.clone();let browser=browser.clone();let writer=writer.clone();let stdout=stdout.clone();
        Arc::new(move|code|{if !ending.swap(true,Ordering::SeqCst){writer.lock().unwrap().gate.closed=true;let _=browser.stop();let _=framing::write(&mut *stdout.lock().unwrap(),&json!({"type":"fatal","code":code}));}})
    };
    {
        let send=send.clone();let fatal=fatal.clone();let ending=ending.clone();
        std::thread::spawn(move||{
            let mut pending=Vec::new();let mut buffer=[0u8;8192];
            while !ending.load(Ordering::SeqCst){
                let size=match reader.read(&mut buffer){Ok(0)=>break,Ok(n)=>n,Err(_)=>break};
                for byte in &buffer[..size]{
                    if *byte==0 {
                        if !pending.is_empty(){match serde_json::from_slice::<Value>(&pending){Ok(v)=>if send.try_send(json!({"type":"cdp","message":v})).is_err(){fatal("browser_transport_backpressure");return},Err(_)=>{fatal("browser_protocol_failed");return}};pending.clear();}
                    } else {pending.push(*byte);if pending.len()>framing::MAX{fatal("browser_frame_limit");return;}}
                }
            }
            fatal("browser_process_closed");
        });
    }
    {
        let fatal=fatal.clone();let writer=writer.clone();let ending=ending.clone();let control_pending=control_pending.clone();
        std::thread::spawn(move||{
            let began=Instant::now();let mut accepted:Option<TcpStream>=None;
            while began.elapsed()<Duration::from_secs(15)&&!ending.load(Ordering::SeqCst){
                match listener.accept(){Ok((mut socket,_))=>{
                    let _=socket.set_nodelay(true);let _=socket.set_read_timeout(Some(Duration::from_secs(2)));let _=socket.set_write_timeout(Some(Duration::from_secs(2)));
                    if framing::read(&mut socket).ok().flatten().is_some_and(|v|v["token"]==token){accepted=Some(socket);break;}
                },Err(e) if e.kind()==io::ErrorKind::WouldBlock=>std::thread::sleep(Duration::from_millis(10)),Err(_)=>break}
            }
            let Some(mut socket)=accepted else{fatal("browser_worker_missing");return;};
            let _=socket.set_read_timeout(None);
            let output=match socket.try_clone(){Ok(v)=>v,Err(_)=>{fatal("browser_transport_failed");return;}};
            let output=Arc::new(Mutex::new(output));
            {let output=output.clone();let fatal=fatal.clone();let ending=ending.clone();std::thread::spawn(move||{
                while !ending.load(Ordering::SeqCst){match receive.recv_timeout(Duration::from_millis(100)){Ok(v)=>{if framing::write(&mut *output.lock().unwrap(),&v).is_err(){fatal("browser_worker_backpressure");return;}},Err(mpsc::RecvTimeoutError::Timeout)=>(),Err(_)=>break}}
            });}
            while !ending.load(Ordering::SeqCst){
                let request=match framing::read(&mut socket){Ok(Some(v))=>v,_=>break};
                let id=request["id"].clone();
                let result=(||->Result<u64,&str>{
                    if control_pending.load(Ordering::SeqCst){return Err("browser_control_pending");}
                    let mut state=writer.lock().map_err(|_|"browser_transport_failed")?;
                    if control_pending.load(Ordering::SeqCst){return Err("browser_control_pending");}
                    let bytes=state.gate.admit(&request)?;
                    if process::bounded_write(&mut state.pipe,&bytes).is_err(){state.gate.closed=true;return Err("outcome_unknown");}
                    state.gate.sequence+=1;Ok(state.gate.sequence)
                })();
                let response=match result{Ok(sequence)=>json!({"type":"dispatch","id":id,"sequence":sequence}),Err(code)=>json!({"type":"dispatch","id":id,"error":code})};
                if framing::write(&mut *output.lock().unwrap(),&response).is_err(){break;}
                if result==Err("outcome_unknown"){fatal("outcome_unknown");return;}
            }
            fatal("browser_worker_closed");
        });
    }
    framing::write(&mut *stdout.lock().unwrap(),&json!({"id":id,"result":{"protocol":2,"port":port,"pid":browser.pid,"birth":browser.birth}}))?;
    loop {
        let request=match framing::read(&mut stdin){Ok(Some(value))=>value,_=>break};
        let id=request["id"].clone();
        match request["type"].as_str(){
            Some("control")=>{
                control_pending.store(true,Ordering::SeqCst);
                let result=(||->Result<Value,&str>{
                    let epoch=request["epoch"].as_u64().filter(|v|*v<=1000000000).ok_or("browser_invalid_control")?;
                    let lease=if request["lease"].is_null(){None}else{Some(&request["lease"])};
                    if lease.is_some_and(|v|v["runtimeId"]!=browser.runtime){return Err("browser_invalid_control");}
                    let mut state=writer.lock().map_err(|_|"browser_transport_failed")?;
                    let renewing=epoch==state.gate.epoch;
                    state.gate.control(epoch,lease)?;
                    // Deny first, even if the Worker is wedged. A valid new lease may
                    // subsequently enable its private download directory through Worker policy.
                    if !renewing {
                        let mut bytes=serde_json::to_vec(&json!({"id":900000000+epoch,"method":"Browser.setDownloadBehavior","params":{"behavior":"deny","eventsEnabled":true}})).unwrap();bytes.push(0);
                        if process::bounded_write(&mut state.pipe,&bytes).is_err(){state.gate.closed=true;return Err("outcome_unknown");}
                        state.gate.sequence+=1;
                    }
                    Ok(json!({"epoch":state.gate.epoch,"lastDispatchedSequence":state.gate.sequence,"transportState":"open"}))
                })();
                control_pending.store(false,Ordering::SeqCst);
                let response=match result{Ok(ref value)=>json!({"id":id,"result":value}),Err(code)=>json!({"id":id,"error":code})};
                framing::write(&mut *stdout.lock().unwrap(),&response)?;
                if result==Err("outcome_unknown"){fatal("outcome_unknown");break;}
            },
            Some("stop")=>{
                control_pending.store(true,Ordering::SeqCst);ending.store(true,Ordering::SeqCst);writer.lock().unwrap().gate.closed=true;
                let reclaimed=browser.stop().unwrap_or(false);
                framing::write(&mut *stdout.lock().unwrap(),&json!({"id":id,"result":{"reclaimed":reclaimed}}))?;
                if reclaimed{return Ok(());} // A failed stop remains retryable on this independent lane.
            },
            _=>framing::write(&mut *stdout.lock().unwrap(),&json!({"id":id,"error":"browser_invalid_control"}))?,
        }
    }
    ending.store(true,Ordering::SeqCst);writer.lock().unwrap().gate.closed=true;
    if browser.stop()?{Ok(())}else{Err(io::Error::other("cleanup_pending"))}
}
