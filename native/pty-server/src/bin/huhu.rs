fn main() {
    let mut args = Vec::new();
    let mut bytes = 0usize;
    let mut count = 0usize;
    let mut json = false;
    let mut invalid = false;
    let mut capacity = false;
    for value in std::env::args_os().skip(1) {
        json |= value == "--json";
        count = count.saturating_add(1);
        bytes = bytes.saturating_add(value.len());
        if count > 64 || bytes > huhu_pty::control::wire_generated::REQUEST_BYTES {
            capacity = true;
        }
        // Keep scanning global output mode after rejection, without retaining more argument data.
        if capacity || invalid {
            continue;
        }
        match value.into_string() {
            Ok(value) => args.push(value),
            Err(_) => invalid = true,
        }
    }
    if capacity || invalid {
        std::process::exit(huhu_pty::control::cli::reject_arguments(
            if capacity {
                "CAPACITY_EXCEEDED"
            } else {
                "INVALID_ARGUMENT"
            },
            json,
        ));
    }
    std::process::exit(huhu_pty::control::cli::run(&args));
}
